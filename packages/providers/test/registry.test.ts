import { describe, expect, it } from 'vitest'

import {
  ProviderRegistry,
  getProvider,
  listProviders,
  resolveApiKey,
  resolveDefaultProviderId,
  resolveProvider,
} from '../src/index'

describe('内置 provider', () => {
  it('内置 6 家厂商', () => {
    expect(listProviders()).toHaveLength(6)
  })

  it('每家厂商的 baseURL / apiKeyEnv 合法', () => {
    for (const provider of listProviders()) {
      expect(provider.baseURL).toMatch(/^https:\/\//)
      expect(provider.apiKeyEnv).toMatch(/^[A-Z0-9_]+$/)
      expect(provider.defaultModel.length).toBeGreaterThan(0)
      expect(provider.models).toContain(provider.defaultModel)
    }
  })

  it('id 不重复', () => {
    const ids = listProviders().map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('ProviderRegistry', () => {
  it('未知 id 抛可读错误', () => {
    expect(() => getProvider('nope')).toThrow(/未知 provider "nope"/)
  })

  it('重复注册抛错', () => {
    const r = new ProviderRegistry([])
    const cfg = getProvider('deepseek')
    r.register(cfg)
    expect(() => r.register(cfg)).toThrow(/已注册/)
  })

  it('可以注册自定义端点（如本地 vLLM）', () => {
    const r = new ProviderRegistry([])
    r.register({
      id: 'local',
      name: '本地 vLLM',
      baseURL: 'http://127.0.0.1:8000/v1',
      apiKeyEnv: 'LOCAL_API_KEY',
      defaultModel: 'qwen2.5-7b-instruct',
      models: ['qwen2.5-7b-instruct'],
      openAICompatible: true,
    })
    expect(r.get('local').defaultModel).toBe('qwen2.5-7b-instruct')
  })
})

describe('API Key 解析', () => {
  it('缺失时抛出带环境变量名的错误', () => {
    expect(() => resolveApiKey(getProvider('deepseek'), {})).toThrow(/DEEPSEEK_API_KEY/)
  })

  it('空白字符串视为缺失', () => {
    expect(() => resolveApiKey(getProvider('deepseek'), { DEEPSEEK_API_KEY: '   ' })).toThrow()
  })

  it('正常返回', () => {
    expect(resolveApiKey(getProvider('deepseek'), { DEEPSEEK_API_KEY: 'sk-test' })).toBe('sk-test')
  })

  it('resolveProvider 合并配置与 Key', () => {
    const resolved = resolveProvider('kimi', { MOONSHOT_API_KEY: 'sk-kimi' })
    expect(resolved.apiKey).toBe('sk-kimi')
    expect(resolved.baseURL).toContain('moonshot')
  })

  it('默认 provider 回退到 deepseek', () => {
    expect(resolveDefaultProviderId({})).toBe('deepseek')
    expect(resolveDefaultProviderId({ NEXAGENT_PROVIDER: 'glm' })).toBe('glm')
  })
})
