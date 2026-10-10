export type {
  ChannelCapabilities,
  DedupStore,
  InboundMessage,
  MessageChannel,
  MessageHandler,
} from './types.js'

export {
  checkSignature,
  computeSignature,
  computeSignatureWithEncrypt,
  decodeAesKey,
  decryptMessage,
  encryptMessage,
  safeEqual,
} from './crypto.js'

export { buildTextReplyXml, parseXmlField } from './xml.js'

export { MemoryDedupStore } from './dedup.js'

export { WeChatOfficialChannel } from './wechat-official.js'
export type {
  EncryptMode,
  PassiveReplyFn,
  WeChatOfficialConfig,
  WeChatOfficialQuery,
} from './wechat-official.js'

export { WeComAppChannel } from './wecom-app.js'
export type { WeComAppConfig, WeComQuery } from './wecom-app.js'
