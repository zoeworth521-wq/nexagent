import type { ModelProviderConfig } from '../types.js'

/**
 * 月之暗面 Kimi —— 主打长上下文。
 * 控制台：https://platform.moonshot.cn
 */
export const kimi: ModelProviderConfig = {
  id: 'kimi',
  name: '月之暗面 Kimi',
  baseURL: 'https://api.moonshot.cn/v1',
  apiKeyEnv: 'MOONSHOT_API_KEY',
  defaultModel: 'moonshot-v1-32k',
  models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  openAICompatible: true,
  consoleURL: 'https://platform.moonshot.cn',
  quirks: {
    maxTokensField: 'max_tokens',
    jsonMode: true,
    toolCalling: true,
    embeddingDimension: 1024,
  },
  notes: '上下文长度由模型名后缀决定（8k / 32k / 128k），超出会直接报错。',
}
