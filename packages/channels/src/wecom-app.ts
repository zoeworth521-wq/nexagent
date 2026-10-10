import { computeSignatureWithEncrypt, decodeAesKey, decryptMessage, safeEqual } from './crypto.js'
import { MemoryDedupStore } from './dedup.js'
import type { ChannelCapabilities, DedupStore, InboundMessage, MessageChannel, MessageHandler } from './types.js'
import { buildTextReplyXml, parseXmlField } from './xml.js'

export interface WeComAppConfig {
  /** 企业微信「应用管理 → 自建应用 → 接收消息」里的 Token */
  token: string
  /** 43 位 EncodingAESKey */
  encodingAESKey: string
  /** 企业 ID（corpId），用于 receiveid 校验 */
  corpId: string
  /** 自建应用 AgentId，主动发消息时需要 */
  agentId?: number
  /** 应用 Secret，用于换取 access_token */
  corpSecret?: string
  /** 排重存储，默认内存实现 */
  dedupStore?: DedupStore
  /** 被动回复预算（毫秒），默认 4500 */
  passiveReplyBudgetMs?: number
}

/** 企业微信回调的查询参数（注意是 `msg_signature`，不是公众号的 `signature`）。 */
export interface WeComQuery {
  msg_signature?: string
  signature?: string
  timestamp?: string
  nonce?: string
  echostr?: string
}

/**
 * 企业微信 · 自建应用通道。
 *
 * 与公众号的差异（也是接入时最容易踩的地方）：
 *   1. 签名参数叫 `msg_signature`，且参与排序的是**密文**；
 *   2. `echostr` 是**加密**的，需先解密再返回明文；
 *   3. 明文尾部带的是 `corpId`（公众号是 appId）；
 *   4. URL 验证要在 **1 秒内**响应。
 *
 * 其余（AES-256-CBC + PKCS7 + sha1）与公众号完全一致，因此复用同一份 crypto。
 */
export class WeComAppChannel implements MessageChannel {
  readonly name = 'wecom-app'
  readonly capabilities: ChannelCapabilities

  readonly #token: string
  readonly #corpId: string
  readonly #agentId: number | undefined
  readonly #corpSecret: string | undefined
  readonly #aesKey: Buffer
  readonly #dedup: DedupStore
  readonly #passiveBudgetMs: number

  #handler: MessageHandler | undefined
  #accessToken: { value: string; expiresAt: number } | undefined

  constructor(config: WeComAppConfig) {
    this.#token = config.token
    this.#corpId = config.corpId
    this.#agentId = config.agentId
    this.#corpSecret = config.corpSecret
    this.#aesKey = decodeAesKey(config.encodingAESKey)
    this.#dedup = config.dedupStore ?? new MemoryDedupStore()
    this.#passiveBudgetMs = config.passiveReplyBudgetMs ?? 4500

    const canPush =
      config.agentId !== undefined && config.corpSecret !== undefined && config.corpSecret !== ''

    this.capabilities = {
      canReceive: true,
      canPush,
      maxPassiveReplyMs: 5000,
      ...(canPush ? { pushWindowMs: Number.POSITIVE_INFINITY } : {}),
    }
  }

  onMessage(handler: MessageHandler): void {
    this.#handler = handler
  }

  /** GET 验证。**必须在 1 秒内**返回解密后的 echostr。 */
  verifyUrl(query: WeComQuery): string {
    const { echostr, timestamp, nonce } = query
    const msgSignature = query.msg_signature ?? query.signature

    if (echostr === undefined || timestamp === undefined || nonce === undefined || msgSignature === undefined) {
      throw new Error('URL 验证参数不完整（需要 msg_signature / timestamp / nonce / echostr）')
    }

    const expected = computeSignatureWithEncrypt(this.#token, timestamp, nonce, echostr)
    if (!safeEqual(expected, msgSignature)) {
      throw new Error('URL 验证签名校验失败：请确认 Token 与自建应用后台填写的一致')
    }

    return decryptMessage(echostr, this.#aesKey, this.#corpId)
  }

  async handleMessage(query: WeComQuery, body: string): Promise<string> {
    const { timestamp, nonce } = query
    const msgSignature = query.msg_signature ?? query.signature

    if (timestamp === undefined || nonce === undefined || msgSignature === undefined) {
      throw new Error('消息缺少 msg_signature / timestamp / nonce')
    }

    const encrypt = parseXmlField(body, 'Encrypt')
    if (encrypt === undefined) throw new Error('消息体缺少 <Encrypt> 节点')

    const expected = computeSignatureWithEncrypt(this.#token, timestamp, nonce, encrypt)
    if (!safeEqual(expected, msgSignature)) throw new Error('消息签名校验失败')

    const xml = decryptMessage(encrypt, this.#aesKey, this.#corpId)

    const from = parseXmlField(xml, 'FromUserName')
    const to = parseXmlField(xml, 'ToUserName')
    const text = parseXmlField(xml, 'Content') ?? ''
    const msgId = parseXmlField(xml, 'MsgId') ?? `${from ?? 'unknown'}:${timestamp}`

    if (from === undefined || to === undefined) {
      throw new Error('无法解析消息：缺少 FromUserName / ToUserName')
    }

    const firstTime = await this.#dedup.seenOnce(`wecom-app:${msgId}`)
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
    return ''
  }

  async reply(msg: InboundMessage, text: string): Promise<void> {
    await this.push(msg.from, text)
  }

  async push(userid: string, text: string): Promise<void> {
    if (!this.capabilities.canPush || this.#agentId === undefined) {
      throw new Error('当前通道不支持主动推送：需要在配置中提供 agentId 与 corpSecret。')
    }

    const token = await this.#getAccessToken()
    const url = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${encodeURIComponent(token)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        touser: userid,
        msgtype: 'text',
        agentid: this.#agentId,
        text: { content: text },
      }),
    })

    const data = (await res.json()) as { errcode?: number; errmsg?: string }
    if (typeof data.errcode === 'number' && data.errcode !== 0) {
      throw new Error(`企业微信消息发送失败：${data.errcode} ${data.errmsg ?? ''}`)
    }
  }

  async #getAccessToken(): Promise<string> {
    const now = Date.now()
    if (this.#accessToken !== undefined && this.#accessToken.expiresAt > now + 60_000) {
      return this.#accessToken.value
    }

    if (this.#corpSecret === undefined) {
      throw new Error('缺少 corpSecret，无法获取 access_token')
    }

    const url =
      'https://qyapi.weixin.qq.com/cgi-bin/gettoken' +
      `?corpid=${encodeURIComponent(this.#corpId)}&corpsecret=${encodeURIComponent(this.#corpSecret)}`

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
