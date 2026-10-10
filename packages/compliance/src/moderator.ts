import type { ModerationResult, Moderator } from './types.js'

/**
 * 一组**示例**敏感词。真实项目请从合规服务商或自有词库加载，
 * 这里只用来演示机制，不构成任何合规保证。
 */
export const DEFAULT_SENSITIVE_WORDS: readonly string[] = [
  '违禁词示例一',
  '违禁词示例二',
]

export interface KeywordModeratorOptions {
  words?: readonly string[]
  /** 命中后的处置：block（拦截）或 review（转人工）。默认 block。 */
  action?: 'review' | 'block'
  /** 大小写不敏感，默认 true */
  caseInsensitive?: boolean
}

/**
 * 关键词审核器。零依赖、可离线跑，适合做兜底的第一道闸。
 *
 * 局限：无法识别变体、拼音、同音字。生产环境应与云厂商内容安全 API 组合使用。
 */
export class KeywordModerator implements Moderator {
  readonly name = 'keyword'
  readonly #words: readonly string[]
  readonly #action: 'review' | 'block'
  readonly #caseInsensitive: boolean

  constructor(options: KeywordModeratorOptions = {}) {
    this.#words = options.words ?? DEFAULT_SENSITIVE_WORDS
    this.#action = options.action ?? 'block'
    this.#caseInsensitive = options.caseInsensitive ?? true
  }

  async check(text: string): Promise<ModerationResult> {
    const haystack = this.#caseInsensitive ? text.toLowerCase() : text
    const hits = this.#words.filter((word) => {
      const needle = this.#caseInsensitive ? word.toLowerCase() : word
      return needle !== '' && haystack.includes(needle)
    })

    if (hits.length === 0) {
      return { flagged: false, action: 'pass' }
    }

    return {
      flagged: true,
      action: this.#action,
      categories: hits,
      reason: `命中 ${hits.length} 个敏感词`,
    }
  }
}

export interface RemoteModeratorConfig {
  /** 审核服务地址，需接受 `{ text }` 并返回 ModerationResult */
  endpoint: string
  /** 鉴权 Token，走 Authorization: Bearer */
  apiKey?: string
  /** 超时（毫秒），默认 3000。**审核失败时按放行处理，避免阻断业务**。 */
  timeoutMs?: number
}

/**
 * 远程审核器，对接云厂商内容安全 API（阿里云 / 腾讯云等）或自建服务。
 *
 * 设计取舍：网络异常或超时时**不阻断**（fail-open），并把错误交给调用方
 * 记录。若你的业务要求 fail-closed，请自行包装。
 */
export class RemoteModerator implements Moderator {
  readonly name = 'remote'
  readonly #config: RemoteModeratorConfig

  constructor(config: RemoteModeratorConfig) {
    this.#config = config
  }

  async check(text: string): Promise<ModerationResult> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.#config.timeoutMs ?? 3000)

    try {
      const res = await fetch(this.#config.endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(this.#config.apiKey !== undefined
            ? { authorization: `Bearer ${this.#config.apiKey}` }
            : {}),
        },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      })

      if (!res.ok) {
        return { flagged: false, action: 'pass', reason: `审核服务返回 ${res.status}` }
      }

      const data = (await res.json()) as Partial<ModerationResult>
      return {
        flagged: data.flagged ?? false,
        action: data.action ?? (data.flagged === true ? 'block' : 'pass'),
        ...(data.reason !== undefined ? { reason: data.reason } : {}),
        ...(data.categories !== undefined ? { categories: data.categories } : {}),
      }
    } catch (error) {
      return {
        flagged: false,
        action: 'pass',
        reason: `审核服务调用失败（已放行）：${error instanceof Error ? error.message : String(error)}`,
      }
    } finally {
      clearTimeout(timeout)
    }
  }
}
