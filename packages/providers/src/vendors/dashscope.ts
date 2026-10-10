import type { ModelProviderConfig } from '../types.js'

/**
 * 通义千问（阿里云百炼）—— 兼容性最好的一家，推荐与 DeepSeek 一起作为首批接入。
 * 控制台：https://bailian.console.aliyun.com
 */
export const dashscope: ModelProviderConfig = {
  id: 'dashscope',
  name: '通义千问（阿里云百炼）',
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKeyEnv: 'DASHSCOPE_API_KEY',
  defaultModel: 'qwen-plus',
  models: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-long'],
  openAICompatible: true,
  consoleURL: 'https://bailian.console.aliyun.com',
  quirks: {
    maxTokensField: 'max_tokens',
    jsonMode: true,
    toolCalling: true,
    embeddingDimension: 1024,
  },
  notes: '必须走 compatible-mode 路径才是 OpenAI 兼容协议，别用 dashscope 原生路径。',
}
