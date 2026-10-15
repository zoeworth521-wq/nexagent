# 快速开始

## 前置要求

- Node.js **>= 22.12**（用到内置 `fetch` 与 `node --experimental-strip-types`）
- npm >= 10

## 1. 克隆并安装

```bash
git clone https://github.com/zoeworth521-wq/nexagent.git
cd nexagent
npm install
```

根依赖很轻（只有 `typescript` / `vitest` / `@types/node`），
各 `packages/*` 目前**零运行时依赖**，所以安装很快。

## 2. 验证

```bash
npm run typecheck   # 全仓库类型检查
npm run build       # 构建所有包到 packages/*/dist
npm test            # 跑单元测试
```

三个都通过，说明环境没问题。

## 3. 用 SDK

各包可直接被业务代码引用（尚未发布到 npm 时用相对路径或 `file:` 依赖）：

```ts
import { getProvider, resolveApiKey } from '@nexagent/providers'
import { WeChatOfficialChannel } from '@nexagent/channels'
import { KeywordModerator, createGuardrail } from '@nexagent/compliance'

// 1) 解析厂商配置
const provider = getProvider('deepseek')          // 或 process.env.NEXAGENT_PROVIDER
const apiKey = resolveApiKey(provider)
console.log(provider.baseURL, provider.defaultModel, apiKey)

// 2) 合规网关
const guardrail = createGuardrail({ input: new KeywordModerator() })
const verdict = await guardrail.checkInput('用户输入')
if (verdict.blocked) throw new Error('内容不合规')

// 3) 微信通道
const channel = new WeChatOfficialChannel({
  token: process.env.WECHAT_TOKEN!,
  encodingAESKey: process.env.WECHAT_AES_KEY!,
  appId: process.env.WECHAT_APP_ID!,
  encryptMode: 'plain',      // 先跑通明文，再切 safe
})
channel.onMessage(async (msg) => {
  console.log('收到：', msg.text, '来自', msg.from)
})
```

## 4. 跑最小示例

见 [`examples/basic-agent`](../examples/basic-agent/README.md)。

## 下一步

- 接国产模型 → [模型接入指南](./providers.md)
- 接微信 → [微信 / 企业微信接入](./channels/wechat.md)
- 想贡献代码 → [`CONTRIBUTING.md`](../CONTRIBUTING.md)
