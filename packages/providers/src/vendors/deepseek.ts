import type { ModelProviderConfig } from '../types.js'

/**
 * DeepSeek 深度求索 —— 延迟低、价格便宜，是最适合作为默认厂商的选择。
 * 控制台：https://platform.deepseek.com
 */
export const deepseek: ModelProviderConfig = {
  id: 'deepseek',
  name: 'DeepSeek 深度求索',
  baseURL: 'https://api.deepseek.com/v1',
  apiKeyEnv: 'DEEPSEEK_API_KEY',
  defaultModel: 'deepseek-chat',
  models: ['deepseek-chat', 'deepseek-reasoner'],
  openAICompatible: true,
  consoleURL: 'https://platform.deepseek.com',
  quirks: {
    maxTokensField: 'max_tokens',
    jsonMode: true,
    toolCalling: true,
  },
  notes: 'deepseek-reasoner 不支持 function calling 与 JSON 模式，切换模型时注意。',
}
