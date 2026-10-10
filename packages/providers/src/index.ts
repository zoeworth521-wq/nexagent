export type { ModelProviderConfig, ProviderQuirks, ResolvedProvider } from './types.js'

export {
  ProviderRegistry,
  registry,
  getProvider,
  listProviders,
  resolveApiKey,
  resolveProvider,
  resolveDefaultProviderId,
} from './registry.js'

export {
  builtinVendors,
  deepseek,
  dashscope,
  glm,
  kimi,
  doubao,
  ernie,
} from './vendors/index.js'
