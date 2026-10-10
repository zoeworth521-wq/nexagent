import type { ModelProviderConfig } from '../types.js'

export { deepseek } from './deepseek.js'
export { dashscope } from './dashscope.js'
export { glm } from './glm.js'
export { kimi } from './kimi.js'
export { doubao } from './doubao.js'
export { ernie } from './ernie.js'

import { deepseek } from './deepseek.js'
import { dashscope } from './dashscope.js'
import { glm } from './glm.js'
import { kimi } from './kimi.js'
import { doubao } from './doubao.js'
import { ernie } from './ernie.js'

/** 内置厂商清单。新增厂商请同时更新 README 的表格与 docs/providers.md。 */
export const builtinVendors: readonly ModelProviderConfig[] = [
  deepseek,
  dashscope,
  glm,
  kimi,
  doubao,
  ernie,
]
