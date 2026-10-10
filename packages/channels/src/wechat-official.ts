import {
  checkSignature,
  computeSignatureWithEncrypt,
  decodeAesKey,
  decryptMessage,
  safeEqual,
} from './crypto.js'
import { MemoryDedupStore } from './dedup.js'
import type { ChannelCapabilities, DedupStore, InboundMessage, MessageChannel, MessageHandler } from './types.js'
import { buildTextReplyXml, parseXmlField } from './xml.js'

/** 消息加解密方式，对应公众号后台的三个选项。 */
export type EncryptMode = 'plain' | 'compatible' | 'safe'

/**
 * 被动回复函数：在 5 秒预算内给出回复。
 * 返回 `undefined` 表示"来不及了"，此时应转异步推送（若通道支持）。
 */
export type PassiveReplyFn = (
  msg: InboundMessage,
) => string | undefined | Promise<string | undefined>

export interface WeChatOfficialConfig {
  /** 公众号后台「服务器配置」里填的 Token */
  token: string
  /** 43 位 EncodingAESKey */
  encodingAESKey: string
  /** 公众号 AppID，用于 receiveid 校验 */
  appId: string
  /** 消息加解密方式，默认 'plain'。跑通后建议切 'safe'。 */
  encryptMode?: EncryptMode
  /** 是否具备客服消息接口（需微信认证的服务号） */
  canPush?: boolean
  /** AppSecret，主动推送时用于换取 access_token */
  appSecret?: string
  /** 排重存储，默认内存实现。多实例部署请换 Redis。 */
  dedupStore?: DedupStore
  /** 被动回复预算（毫秒），默认 4500（官方硬限制 5000，留 500 余量） */
  passiveReplyBudgetMs?: number
}

/** 微信回调的查询参数。 */
export interface WeChatOfficialQuery {
  signature?: string
  timestamp?: string
  nonce?: string
  echostr?: string
  msg_signature?: string
  encrypt_type?: string
}

/**
 * 微信公众号通道（订阅号 / 服务号共用，靠配置区分能力）。
 *
 * 核心约束：**被动回复只有 5 秒**。LLM 生成通常 8～30 秒，所以正确姿势是
 * 「立即 ACK + 异步推送」；个人订阅号没有客服消息接口，只能走降级方案
 * （见 docs/channels/wechat.md）。
 */
export class WeChatOfficialChannel implements MessageChannel {
  readonly name = 'wechat-official'
  readonly capabilities: ChannelCapabilities

  readonly #token: string
  readonly #appId: string
  readonly #appSecret: string | undefined
  readonly #encryptMode: EncryptMode
  readonly #aesKey: Buffer
  readonly #dedup: DedupStore
  readonly #passiveBudgetMs: number

  #handler: MessageHandler | undefined
  #passiveReply: PassiveReplyFn | undefined
  #accessToken: { value: string; expiresAt: number } | undefined

  constructor(config: WeChatOfficialConfig) {
    this.#token = config.token
    this.#appId = config.appId
    this.#appSecret = config.appSecret
    this.#encryptMode = config.encryptMode ?? 'plain'
    this.#aesKey = decodeAesKey(config.encodingAESKey)
    this.#dedup = config.dedupStore ?? new MemoryDedupStore()
    this.#passiveBudgetMs = config.passiveReplyBudgetMs ?? 4500

    const canPush = config.canPush === true && config.appSecret !== undefined
    this.capabilities = {
      canReceive: true,
      canPush,
      maxPassiveReplyMs: 5000,
      ...(canPush ? { pushWindowMs: 48 * 60 * 60 * 1000 } : {}),
    }
  }

  onMessage(handler: MessageHandler): void {
    this.#handler = handler
  }

  /** 注册「快速被动回复」函数。可选 —— 不注册则一律走异步路径。 */
  onPassiveReply(fn: PassiveReplyFn): void {
    this.#passiveReply = fn
  }

  /**
   * 处理服务器配置时的 GET 验证请求，返回需要**原样回写**的 echostr。
   * 注意：不能加引号、不能带 BOM、不能带换行，否则后台提示"配置失败"。
   */
  verifyUrl(query: WeChatOfficialQuery): string {
    const { signature, timestamp, nonce, echostr } = query
    if (
      signature === undefined ||
      timestamp === undefined ||
      nonce === undefined ||
      echostr === undefined
    ) {
      throw new Error('URL 验证参数不完整（需要 signature / timestamp / nonce / echostr）')
    }

    if (!checkSignature(this.#token, timestamp, nonce, signature)) {
      throw new Error('URL 验证签名校验失败：请确认 Token 与公众号后台填写的一致')
    }

    // 安全模式下 echostr 是密文，需要先解密再返回明文
    if (this.#encryptMode === 'safe') {
      return decryptMessage(echostr, this.#aesKey, this.#appId)
    }
    return echostr
  }

  /**
   * 处理 POST 消息，返回值直接写回 HTTP 响应体。
   * 返回空串表示「不做被动回复」（微信不会重试）。
   */
  async handleMessage(query: WeChatOfficialQuery, body: string): Promise<string> {
    const xml = this.#resolvePlainXml(query, body)

    const from = parseXmlField(xml, 'FromUserName')
    const to = parseXmlField(xml, 'ToUserName')
    const text = parseXmlField(xml, 'Content') ?? ''
    const msgId =
      parseXmlField(xml, 'MsgId') ??
      `${from ?? 'unknown'}:${parseXmlField(xml, 'CreateTime') ?? ''}`

    if (from === undefined || to === undefined) {
      throw new Error('无法解析消息：缺少 FromUserName / ToUserName')
    }

    // 微信在超时后会重试，不做排重会导致同一句话被回复多次
    const firstTime = await this.#dedup.seenOnce(`wechat-official:${msgId}`)
    if (!firstTime) return ''

    const inbound: InboundMessage = {
      id: msgId,
      channel: this.name,
      from,
      to,
      text,
      receivedAt: Date.now(),
      raw: xml,
    }

    await this.#handler?.(inbound)

    if (this.#passiveReply === undefined) return ''

    const reply = await this.#withBudget(Promise.resolve(this.#passiveReply(inbound)))
    if (reply === undefined || reply === '') return ''

    return buildTextReplyXml(from, to, reply)
  }

  async reply(msg: InboundMessage, text: string): Promise<void> {
    await this.push(msg.from, text)
  }

  async push(openid: string, text: string): Promise<void> {
    if (!this.capabilities.canPush) {
      throw new Error(
        '当前通道不支持主动推送：需要微信认证的服务号，并在配置中提供 appSecret。' +
          '个人订阅号请改用被动回复降级方案（见 docs/channels/wechat.md）。',
      )
    }

    const token = await this.#getAccessToken()
    const url = `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${encodeURIComponent(token)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ touser: openid, msgtype: 'text', text: { content: text } }),
    })

    const data = (await res.json()) as { errcode?: number; errmsg?: string }
    if (typeof data.errcode === 'number' && data.errcode !== 0) {
      throw new Error(`客服消息发送失败：${data.errcode} ${data.errmsg ?? ''}`)
    }
  }

  /** 把（可能加密的）请求体还原成明文 XML。 */
  #resolvePlainXml(query: WeChatOfficialQuery, body: string): string {
    const encryptType = query.encrypt_type ?? (this.#encryptMode === 'safe' ? 'aes' : 'plain')
    if (encryptType !== 'aes') return body

    const { msg_signature: msgSignature, timestamp, nonce } = query
    if (msgSignature === undefined || timestamp === undefined || nonce === undefined) {
      throw new Error('安全模式消息缺少 msg_signature / timestamp / nonce')
    }

    const encrypt = parseXmlField(body, 'Encrypt')
    if (encrypt === undefined) throw new Error('安全模式消息体缺少 <Encrypt> 节点')

    const expected = computeSignatureWithEncrypt(this.#token, timestamp, nonce, encrypt)
    if (!safeEqual(expected, msgSignature)) throw new Error('消息签名校验失败')

    return decryptMessage(encrypt, this.#aesKey, this.#appId)
  }

  /** 给被动回复加超时预算，超时返回 undefined，交由异步路径兜底。 */
  async #withBudget(promise: Promise<string | undefined>): Promise<string | undefined> {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([
        promise,
        new Promise<undefined>((resolve) => {
          timer = setTimeout(() => resolve(undefined), this.#passiveBudgetMs)
        }),
      ])
    } finally {
      if (timer !== undefined) clearTimeout(timer)
    }
  }

  async #getAccessToken(): Promise<string> {
    const now = Date.now()
    if (this.#accessToken !== undefined && this.#accessToken.expiresAt > now + 60_000) {
      return this.#accessToken.value
    }

    if (this.#appSecret === undefined) {
      throw new Error('缺少 appSecret，无法获取 access_token')
    }

    const url =
      'https://api.weixin.qq.com/cgi-bin/token' +
      `?grant_type=client_credential&appid=${encodeURIComponent(this.#appId)}` +
      `&secret=${encodeURIComponent(this.#appSecret)}`

    const res = await fetch(url)
    const data = (await res.json()) as {
      access_token?: string
      expires_in?: number
      errcode?: number
      errmsg?: string
    }

    if (data.access_token === undefined) {
      throw new Error(`获取 access_token 失败：${data.errcode ?? ''} ${data.errmsg ?? ''}`)
    }

    this.#accessToken = {
      value: data.access_token,
      expiresAt: now + (data.expires_in ?? 7200) * 1000,
    }
    return data.access_token
  }
}
