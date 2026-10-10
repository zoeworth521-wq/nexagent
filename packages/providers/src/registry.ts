import type { ModelProviderConfig, ResolvedProvider } from './types.js'
import { builtinVendors } from './vendors/index.js'

/**
 * provider 注册表。
 *
 * 默认装载内置的 6 家厂商；你也可以 `new ProviderRegistry([])` 自己组装，
 * 或 `registry.register({...})` 追加私有部署的兼容端点（vLLM / Ollama / one-api 等）。
 */
export class ProviderRegistry {
  readonly #map = new Map<string, ModelProviderConfig>()

  constructor(initial: readonly ModelProviderConfig[] = builtinVendors) {
    for (const provider of initial) this.register(provider)
  }

  register(provider: ModelProviderConfig): this {
    if (this.#map.has(provider.id)) {
      throw new Error(`provider "${provider.id}" 已注册，不能重复注册`)
    }
    this.#map.set(provider.id, provider)
    return this
  }

  has(id: string): boolean {
    return this.#map.has(id)
  }

  get(id: string): ModelProviderConfig {
    const provider = this.#map.get(id)
    if (!provider) {
      const available = this.list()
        .map((p) => p.id)
        .join(', ')
      throw new Error(`未知 provider "${id}"。可用：${available}`)
    }
    return provider
  }

  list(): ModelProviderConfig[] {
    return [...this.#map.values()]
  }
}

/** 全局默认注册表。 */
export const registry = new ProviderRegistry()

export function getProvider(id: string): ModelProviderConfig {
  return registry.get(id)
}

export function listProviders(): ModelProviderConfig[] {
  return registry.list()
}

/**
 * 从环境变量解析出 API Key。缺失时抛出**可读**的错误，而不是让请求
 * 在 HTTP 层返回一个看不懂的 401。
 */
export function resolveApiKey(
  provider: ModelProviderConfig,
  env: Record<string, string | undefined> = process.env,
): string {
  const key = env[provider.apiKeyEnv]
  if (key === undefined || key.trim() === '') {
    throw new Error(
      `缺少环境变量 ${provider.apiKeyEnv}（provider: ${provider.id}）。` +
        `请参考 docs/providers.md 配置，或前往 ${provider.consoleURL ?? '厂商控制台'} 申请 Key。`,
    )
  }
  return key
}

/** 解析出「配置 + Key」，可直接用于创建客户端。 */
export function resolveProvider(
  id: string,
  env: Record<string, string | undefined> = process.env,
): ResolvedProvider {
  const provider = getProvider(id)
  return { ...provider, apiKey: resolveApiKey(provider, env) }
}

/** 读取 `NEXAGENT_PROVIDER`，缺省回退到 deepseek。 */
export function resolveDefaultProviderId(
  env: Record<string, string | undefined> = process.env,
): string {
  const id = env.NEXAGENT_PROVIDER
  return id !== undefined && id.trim() !== '' ? id : 'deepseek'
}
