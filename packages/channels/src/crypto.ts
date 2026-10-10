import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'

/**
 * 微信 / 企业微信消息加解密公共实现。
 *
 * 公众号与企业微信的加解密有 90% 重合：
 *   算法 AES-256-CBC · 填充 PKCS7（补位到 32 字节倍数）· 签名 sha1
 * 差异只在「签名字段名」和「明文里有没有 receiveid」。
 * 所以这里只实现一份，两边各自覆盖差异。
 *
 * ⚠️ 这几处是最容易写错的地方，且出错时报错毫无指向性：
 *   - PKCS7 的块大小是 32 字节，不是标准的 16；
 *   - msg_len 是 4 字节网络字节序（大端）；
 *   - 签名前必须对参数排序。
 */

/** 微信使用的填充块大小（注意不是 AES 的 16 字节） */
const BLOCK_SIZE = 32

/** EncodingAESKey 为 43 位 base64 字符，补一个 '=' 后解码得 32 字节密钥。 */
export function decodeAesKey(encodingAESKey: string): Buffer {
  if (encodingAESKey.length !== 43) {
    throw new Error(`EncodingAESKey 长度应为 43，实际为 ${encodingAESKey.length}`)
  }
  const key = Buffer.from(`${encodingAESKey}=`, 'base64')
  if (key.length !== 32) {
    throw new Error(`EncodingAESKey 解码后应为 32 字节，实际为 ${key.length}`)
  }
  return key
}

/** 明文模式签名：`sha1(sort([token, timestamp, nonce]).join(''))` */
export function computeSignature(token: string, timestamp: string, nonce: string): string {
  return createHash('sha1').update([token, timestamp, nonce].sort().join('')).digest('hex')
}

/** 安全模式签名：`sha1(sort([token, timestamp, nonce, encrypt]).join(''))` */
export function computeSignatureWithEncrypt(
  token: string,
  timestamp: string,
  nonce: string,
  encrypt: string,
): string {
  return createHash('sha1')
    .update([token, timestamp, nonce, encrypt].sort().join(''))
    .digest('hex')
}

/** 恒定时间字符串比较，避免签名校验被时序攻击。 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/** 校验明文模式签名。 */
export function checkSignature(
  token: string,
  timestamp: string,
  nonce: string,
  signature: string,
): boolean {
  return safeEqual(computeSignature(token, timestamp, nonce), signature)
}

function pkcs7Pad(buf: Buffer): Buffer {
  const padLen = BLOCK_SIZE - (buf.length % BLOCK_SIZE)
  const pad = Buffer.alloc(padLen, padLen)
  return Buffer.concat([buf, pad])
}

function pkcs7Unpad(buf: Buffer): Buffer {
  const padLen = buf[buf.length - 1]
  if (padLen === undefined || padLen < 1 || padLen > BLOCK_SIZE) {
    throw new Error('PKCS7 填充无效')
  }
  for (let i = buf.length - padLen; i < buf.length; i += 1) {
    if (buf[i] !== padLen) throw new Error('PKCS7 填充无效')
  }
  return buf.subarray(0, buf.length - padLen)
}

/**
 * 加密：明文 -> base64 密文。
 * 明文结构：random(16) + msg_len(4, 大端) + msg + appId/corpId
 */
export function encryptMessage(plain: string, aesKey: Buffer, id: string): string {
  const msg = Buffer.from(plain, 'utf8')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(msg.length, 0)

  const raw = Buffer.concat([randomBytes(16), lenBuf, msg, Buffer.from(id, 'utf8')])
  const padded = pkcs7Pad(raw)

  const iv = aesKey.subarray(0, 16)
  const cipher = createCipheriv('aes-256-cbc', aesKey, iv)
  cipher.setAutoPadding(false)
  return Buffer.concat([cipher.update(padded), cipher.final()]).toString('base64')
}

/**
 * 解密：base64 密文 -> 明文。
 *
 * @param expectedId 传入 appId（公众号）或 corpId（企业微信）时，会校验明文尾部的
 *                   receiveid，防止跨应用重放。
 */
export function decryptMessage(encrypted: string, aesKey: Buffer, expectedId?: string): string {
  const iv = aesKey.subarray(0, 16)
  const decipher = createDecipheriv('aes-256-cbc', aesKey, iv)
  decipher.setAutoPadding(false)

  const decrypted = Buffer.concat([decipher.update(encrypted, 'base64'), decipher.final()])
  const unpadded = pkcs7Unpad(decrypted)

  if (unpadded.length < 20) {
    throw new Error('解密结果长度不足，密钥可能不正确')
  }

  const msgLen = unpadded.readUInt32BE(16)
  const msg = unpadded.subarray(20, 20 + msgLen).toString('utf8')
  const receiveId = unpadded.subarray(20 + msgLen).toString('utf8')

  if (expectedId !== undefined && receiveId !== expectedId) {
    throw new Error(`receiveid 校验失败：期望 "${expectedId}"，实际 "${receiveId}"`)
  }

  return msg
}
