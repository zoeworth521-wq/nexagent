import type { ModelProviderConfig } from '../types.js'

/**
 * 智谱 GLM。
 * 控制台：https://open.bigmodel.cn
 */
export const glm: ModelProviderConfig = {
  id: 'glm',
  name: '智谱 GLM',
  baseURL: 'https://open.bigmodel.cn/api/paas/v4',
  apiKeyEnv: 'ZHIPU_API_KEY',
  defaultModel: 'glm-4-plus',
  models: ['glm-4-plus', 'glm-4-air', 'glm-4-flash'],
  openAICompatible: true,
  consoleURL: 'https://open.bigmodel.cn',
  quirks: {
    maxTokensField: 'max_tokens',
    jsonMode: true,
    toolCalling: true,
    embeddingDimension: 1024,
  },
}
