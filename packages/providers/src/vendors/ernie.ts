import type { ModelProviderConfig } from '../types.js'

/**
 * 百度文心一言（千帆）。
 * 控制台：https://console.bce.baidu.com/qianfan
 */
export const ernie: ModelProviderConfig = {
  id: 'ernie',
  name: '百度文心一言（千帆）',
  baseURL: 'https://qianfan.baidubce.com/v2',
  apiKeyEnv: 'QIANFAN_API_KEY',
  defaultModel: 'ernie-4.0-8k',
  models: ['ernie-4.0-8k', 'ernie-4.0-turbo-8k', 'ernie-speed-128k'],
  openAICompatible: true,
  consoleURL: 'https://console.bce.baidu.com/qianfan',
  quirks: {
    maxTokensField: 'max_tokens',
    jsonMode: true,
    toolCalling: true,
  },
  notes:
    '千帆 v2 已提供 OpenAI 兼容接口（/v2），推荐使用；' +
    '旧版 v1 是百度自有协议，需单独适配，本项目不支持。',
}
