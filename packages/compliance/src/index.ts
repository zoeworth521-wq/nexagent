import type { Guardrail, GuardrailOptions, GuardrailVerdict, Moderator } from './types.js'

async function runOne(
  moderator: Moderator | undefined,
  text: string,
  phase: 'input' | 'output',
  onFlagged: GuardrailOptions['onFlagged'],
): Promise<GuardrailVerdict> {
  if (moderator === undefined) {
    return { blocked: false, review: false, results: [] }
  }

  const result = await moderator.check(text)
  if (result.flagged && onFlagged !== undefined) {
    onFlagged(result, text, phase)
  }

  return {
    blocked: result.flagged && result.action === 'block',
    review: result.flagged && result.action === 'review',
    results: [result],
  }
}

/**
 * 创建输入输出双向合规网关。
 *
 * 典型用法（配合 Mastra Agent）：
 *
 * ```ts
 * const guardrail = createGuardrail({ input: new KeywordModerator() })
 *
 * const inVerdict = await guardrail.checkInput(userText)
 * if (inVerdict.blocked) return '你的消息包含不合规内容，已被拦截。'
 *
 * const answer = await agent.generate(userText)
 * const outVerdict = await guardrail.checkOutput(answer.text)
 * return outVerdict.blocked ? '回答未能通过合规校验。' : answer.text
 * ```
 */
export function createGuardrail(options: GuardrailOptions = {}): Guardrail {
  return {
    checkInput: (text) => runOne(options.input, text, 'input', options.onFlagged),
    checkOutput: (text) => runOne(options.output, text, 'output', options.onFlagged),
  }
}

export type { Guardrail, GuardrailOptions, GuardrailVerdict, Moderator, ModerationResult } from './types.js'
export { KeywordModerator, RemoteModerator, DEFAULT_SENSITIVE_WORDS } from './moderator.js'
export type { KeywordModeratorOptions, RemoteModeratorConfig } from './moderator.js'
