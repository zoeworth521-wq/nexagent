/**
 * 通道能力声明。
 *
 * 上层调度器**只看能力，不看通道类型** —— 它问的是"这个通道能不能主动推"，
 * 而不是"你是公众号还是企业微信"。
 */
export interface ChannelCapabilities {
  /** 能否接收用户消息 */
  canReceive: boolean
  /** 能否主动推送消息。决定 5 秒超时后能不能异步补发 */
  canPush: boolean
  /** 主动推送的有效窗口（如客服消息 48 小时），单位毫秒 */
  pushWindowMs?: number
  /** 被动回复的硬性超时（如公众号 5000ms、企业微信 1000ms） */
  maxPassiveReplyMs?: number
}

/** 归一化后的入站消息。 */
export interface InboundMessage {
  /** 平台消息 id，用于排重（微信会重试） */
  id: string
  /** 通道名，如 "wechat-official" */
  channel: string
  /** 发送方标识（openid / userid） */
  from: string
  /** 接收方标识（公众号原始 id / 企业 corpId） */
  to: string
  /** 文本内容 */
  text: string
  /** 收到时间（epoch ms） */
  receivedAt: number
  /** 平台原始报文，便于排查 */
  raw: unknown
}

export type MessageHandler = (msg: InboundMessage) => Promise<void> | void

/**
 * 所有 IM 通道的统一抽象。
 *
 * 新增通道只需实现这个接口，并在 `capabilities` 里如实声明能力 ——
 * 不要在上层写 `if (channel.name === 'wechat')` 这种分支。
 */
export interface MessageChannel {
  readonly name: string
  readonly capabilities: ChannelCapabilities
  /** 注册消息处理器。 */
  onMessage(handler: MessageHandler): void
  /** 回复某条消息。 */
  reply(msg: InboundMessage, text: string): Promise<void>
  /** 主动推送给某个用户。 */
  push(openid: string, text: string): Promise<void>
}

/**
 * 排重存储。微信在超时后会重试，不做排重会导致同一句话被回复多次。
 * 生产环境请换成 Redis 实现（SETNX + TTL）。
 */
export interface DedupStore {
  /** 返回 true 表示首次见到；false 表示重复。 */
  seenOnce(key: string): Promise<boolean> | boolean
}
