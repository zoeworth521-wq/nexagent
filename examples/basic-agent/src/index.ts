import { Agent } from '@mastra/core/agent'

import { KeywordModerator, createGuardrail } from '@nexagent/compliance'
import { getProvider, resolveApiKey, resolveDefaultProviderId } from '@nexagent/providers'

/**
 * NexAgent 最小示例。
 *
 * 演示三件事：
 *   1. 用 provider 注册表解析出「厂商配置 + API Key」；
 *   2. 把国产模型接到 Mastra Agent 上；
 *   3. 用合规网关做输入输出双向校验。
 *
 * ⚠️ Mastra 的 `model` 配置形态随版本演进，请以其官方文档为准。
 *    本示例按「OpenAI 兼容的自定义 provider」写法给出，若你的 Mastra 版本
 *    不支持该写法，改用官方文档里的自定义 provider 注册方式即可 ——
 *    provider.baseURL / defaultModel / apiKey 三个值就是我们提供的东西。
 */

const providerId = resolveDefaultProviderId()
const provider = getProvider(providerId)
const apiKey = resolveApiKey(provider)

const guardrail = createGuardrail({
  input: new KeywordModerator(),
  output: new KeywordModerator(),
  onFlagged: (result, _text, phase) => {
    console.warn(`[compliance] ${phase} 命中：${result.reason ?? '未说明'}`)
  },
})

const agent = new Agent({
  name: 'nexagent-basic',
  instructions: '你是一个简洁、直接的中文助手。回答控制在 3 句以内。',
  model: {
    provider: 'openai-compatible',
    name: provider.defaultModel,
    url: provider.baseURL,
    apiKey,
  },
} as never)

const question = process.argv.slice(2).join(' ').trim() || '用一句话解释什么是 AI Agent。'

const inputVerdict = await guardrail.checkInput(question)
if (inputVerdict.blocked) {
  console.error('输入未通过合规校验，已拦截。')
  process.exit(1)
}

console.log(`provider=${providerId}  model=${provider.defaultModel}`)
console.log(`> ${question}`)

const answer = await agent.generate(question)
const outputVerdict = await guardrail.checkOutput(answer.text)

console.log(outputVerdict.blocked ? '[回答未通过合规校验，已拦截]' : answer.text)
