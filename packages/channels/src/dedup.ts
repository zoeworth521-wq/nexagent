import type { DedupStore } from './types.js'

/**
 * 内存排重实现，适合开发环境与单实例部署。
 *
 * ⚠️ 生产环境（多实例）请换成 Redis 实现：
 *     `SET key 1 NX EX 300` —— 返回 OK 表示首次见到。
 * 直接替换掉 `dedupStore` 配置即可，接口不变。
 */
export class MemoryDedupStore implements DedupStore {
  readonly #seen = new Map<string, number>()
  readonly #ttlMs: number

  constructor(ttlMs = 5 * 60_000) {
    this.#ttlMs = ttlMs
  }

  seenOnce(key: string): boolean {
    const now = Date.now()

    // 顺带清理过期键，避免长期运行内存增长
    for (const [k, t] of this.#seen) {
      if (now - t > this.#ttlMs) this.#seen.delete(k)
    }

    if (this.#seen.has(key)) return false
    this.#seen.set(key, now)
    return true
  }
}
