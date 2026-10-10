import { describe, expect, it } from 'vitest'

import {
  checkSignature,
  computeSignature,
  computeSignatureWithEncrypt,
  decodeAesKey,
  decryptMessage,
  encryptMessage,
  parseXmlField,
  safeEqual,
} from '../src/index'

// 43 位合法 EncodingAESKey（测试用，勿用于生产）
const AES_KEY = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ'
const APP_ID = 'wx1234567890abcdef'

describe('decodeAesKey', () => {
  it('43 位 key 解码为 32 字节', () => {
    expect(decodeAesKey(AES_KEY)).toHaveLength(32)
  })

  it('长度不对时报错', () => {
    expect(() => decodeAesKey('too-short')).toThrow(/长度应为 43/)
  })
})

describe('签名', () => {
  it('明文模式签名为 40 位十六进制且可自校验', () => {
    const sig = computeSignature('token', '123', 'abc')
    expect(sig).toMatch(/^[0-9a-f]{40}$/)
    expect(checkSignature('token', '123', 'abc', sig)).toBe(true)
  })

  it('参数顺序不影响结果', () => {
    expect(computeSignature('token', '123', 'abc')).toBe(computeSignature('abc', 'token', '123'))
  })

  it('签名错误时校验失败', () => {
    expect(checkSignature('token', '123', 'abc', 'deadbeef')).toBe(false)
  })

  it('含密文的签名与不含密文的签名不同', () => {
    expect(computeSignatureWithEncrypt('t', '1', 'n', 'enc')).not.toBe(computeSignature('t', '1', 'n'))
  })
})

describe('safeEqual', () => {
  it('相等返回 true，不等返回 false', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
  })

  it('长度不同直接返回 false（不抛错）', () => {
    expect(safeEqual('abc', 'abcd')).toBe(false)
  })
})

describe('加解密往返', () => {
  it('加密后再解密应还原明文', () => {
    const aesKey = decodeAesKey(AES_KEY)
    const plain = '<xml><Content><![CDATA[你好，世界]]></Content></xml>'
    const encrypted = encryptMessage(plain, aesKey, APP_ID)
    expect(encrypted).not.toBe(plain)
    expect(decryptMessage(encrypted, aesKey, APP_ID)).toBe(plain)
  })

  it('receiveid 不匹配时抛错（防跨应用重放）', () => {
    const aesKey = decodeAesKey(AES_KEY)
    const encrypted = encryptMessage('<xml/>', aesKey, APP_ID)
    expect(() => decryptMessage(encrypted, aesKey, 'wx-other')).toThrow(/receiveid 校验失败/)
  })

  it('密钥错误时抛错而不是返回乱码', () => {
    const aesKey = decodeAesKey(AES_KEY)
    const otherKey = decodeAesKey('ZYXWVUTSRQPONMLKJIHGFEDCBAzyxwvutsrqponmlkj')
    const encrypted = encryptMessage('<xml>hi</xml>', aesKey, APP_ID)
    expect(() => decryptMessage(encrypted, otherKey, APP_ID)).toThrow()
  })
})

describe('parseXmlField', () => {
  it('支持 CDATA', () => {
    expect(parseXmlField('<Content><![CDATA[hello]]></Content>', 'Content')).toBe('hello')
  })

  it('支持普通文本', () => {
    expect(parseXmlField('<MsgId>123456</MsgId>', 'MsgId')).toBe('123456')
  })

  it('字段不存在返回 undefined', () => {
    expect(parseXmlField('<xml/>', 'Content')).toBeUndefined()
  })

  it('CDATA 内含特殊字符也能取全', () => {
    expect(parseXmlField('<Content><![CDATA[a<b>c&d]]></Content>', 'Content')).toBe('a<b>c&d')
  })
})
