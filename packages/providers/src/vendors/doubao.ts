import type { ModelProviderConfig } from '../types.js'

/**
 * 字节豆包（火山方舟）。
 * 控制台：https://console.volcengine.com/ark
 */
export const doubao: ModelProviderConfig = {
  id: 'doubao',
  name: '字节豆包（火山方舟）',
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
  apiKeyEnv: 'ARK_API_KEY',
  defaultModel: 'doubao-pro-32k',
  models: ['doubao-pro-32k', 'doubao-pro-128k', 'doubao-lite-32k'],
  openAICompatible: true,
  consoleURL: 'https://console.volcengine.com/ark',
  quirks: {
    maxTokensField: 'max_tokens',
    jsonMode: true,
    toolCalling: true,
  },
  notes:
    '方舟的 model 字段应填「推理接入点 ID」(ep-xxxxxxxx)，而不是模型名。' +
    '需要先在控制台为模型创建接入点。',
}
