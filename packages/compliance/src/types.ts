/** 审核结论。 */
export interface ModerationResult {
  /** 是否命中风险 */
  flagged: boolean
  /** 命中的原因（可读文本，便于审计） */
  reason?: string
  /** 命中的分类 / 关键词 */
  categories?: string[]
  /** 处置建议 */
  action: 'pass' | 'review' | 'block'
}

/** 审核器。可插拔：关键词、云厂商内容安全 API、自研模型等。 */
export interface Moderator {
  readonly name: string
  check(text: string): Promise<ModerationResult>
}

/** 一次校验的结论。 */
export interface GuardrailVerdict {
  /** 是否应当拦截 */
  blocked: boolean
  /** 是否建议人工复核（不拦截，但记录） */
  review: boolean
  /** 原始审核结果 */
  results: ModerationResult[]
}

export interface GuardrailOptions {
  /** 对**用户输入**做审核 */
  input?: Moderator
  /** 对**模型输出**做审核 */
  output?: Moderator
  /** 命中时的回调，用于写审计日志 / 告警 */
  onFlagged?: (result: ModerationResult, text: string, phase: 'input' | 'output') => void
}

/** 输入输出双向合规网关。 */
export interface Guardrail {
  checkInput(text: string): Promise<GuardrailVerdict>
  checkOutput(text: string): Promise<GuardrailVerdict>
}
