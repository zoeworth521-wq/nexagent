/**
 * 厂商与 OpenAI 协议之间**已知的差异点**。
 *
 * 这些差异是接入国产模型时最容易踩的坑，所以显式声明出来，
 * 而不是让每个使用者自己去翻文档。
 */
export interface ProviderQuirks {
  /**
   * 该厂商接受的最大输出 token 字段名。
   * OpenAI 新版用 `max_completion_tokens`，但多数国产厂商只认 `max_tokens`。
   */
  maxTokensField?: 'max_tokens' | 'max_completion_tokens'

  /** 是否支持 `response_format: { type: 'json_object' }` */
  jsonMode?: boolean

  /** 是否支持 function / tool calling */
  toolCalling?: boolean

  /** embedding 向量维度（用于 RAG 场景预校验，避免写入向量库后才发现维度不符） */
  embeddingDimension?: number

  /** 该厂商需要额外附加的请求头 */
  headers?: Readonly<Record<string, string>>
}

/** 一个模型厂商的完整描述。 */
export interface ModelProviderConfig {
  /** 唯一 id，也是环境变量 `NEXAGENT_PROVIDER` 的取值 */
  id: string

  /** 展示名 */
  name: string

  /** OpenAI 兼容的 base URL（不含 `/chat/completions`） */
  baseURL: string

  /** 存放 API Key 的环境变量名 */
  apiKeyEnv: string

  /** 默认模型 id */
  defaultModel: string

  /** 预设模型列表。厂商会持续更新，以官网为准。 */
  models: readonly string[]

  /** 是否走 OpenAI 兼容协议 */
  openAICompatible: boolean

  /** 控制台地址，方便使用者去申请 Key */
  consoleURL?: string

  /** 与 OpenAI 协议的差异点 */
  quirks?: ProviderQuirks

  /** 该厂商特有的注意事项（会显示在报错信息与文档里） */
  notes?: string
}

/** 已解析出 API Key 的 provider 配置。 */
export interface ResolvedProvider extends ModelProviderConfig {
  apiKey: string
}
