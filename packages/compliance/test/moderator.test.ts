import { describe, expect, it } from 'vitest'

import { KeywordModerator, createGuardrail } from '../src/index'

describe('KeywordModerator', () => {
  it('未命中时放行', async () => {
    const m = new KeywordModerator({ words: ['坏词'] })
    const r = await m.check('今天天气不错')
    expect(r.flagged).toBe(false)
    expect(r.action).toBe('pass')
  })

  it('命中时按配置处置', async () => {
    const m = new KeywordModerator({ words: ['坏词'], action: 'block' })
    const r = await m.check('这里有个坏词')
    expect(r.flagged).toBe(true)
    expect(r.action).toBe('block')
    expect(r.categories).toEqual(['坏词'])
  })

  it('review 模式不拦截', async () => {
    const m = new KeywordModerator({ words: ['坏词'], action: 'review' })
    const r = await m.check('坏词')
    expect(r.action).toBe('review')
  })

  it('大小写不敏感', async () => {
    const m = new KeywordModerator({ words: ['BadWord'] })
    const r = await m.check('this is badword here')
    expect(r.flagged).toBe(true)
  })

  it('空词条不会误伤（避免 includes("") 恒真）', async () => {
    const m = new KeywordModerator({ words: [''] })
    const r = await m.check('任意文本')
    expect(r.flagged).toBe(false)
  })
})

describe('createGuardrail', () => {
  it('输入命中则 blocked', async () => {
    const g = createGuardrail({ input: new KeywordModerator({ words: ['禁词'] }) })
    const v = await g.checkInput('这里有禁词')
    expect(v.blocked).toBe(true)
  })

  it('未配置审核器时一律放行', async () => {
    const g = createGuardrail({})
    expect((await g.checkInput('任意')).blocked).toBe(false)
    expect((await g.checkOutput('任意')).blocked).toBe(false)
  })

  it('onFlagged 回调被触发', async () => {
    const hits: string[] = []
    const g = createGuardrail({
      output: new KeywordModerator({ words: ['禁词'] }),
      onFlagged: (_r, _t, phase) => hits.push(phase),
    })
    await g.checkOutput('输出里带禁词')
    expect(hits).toEqual(['output'])
  })
})
