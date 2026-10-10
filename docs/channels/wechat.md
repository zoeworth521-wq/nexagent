# 微信 / 企业微信接入

> 数据依据微信开放文档与企业微信开发者文档。

## 一、先破一个误区：微信不是一个接口，是六条通道

大部分人问「怎么接微信」，脑子里想的是一个 API。实际上微信生态里能接 AI 的
通道有六条，**资质门槛、能力边界、技术形态完全不同**。选错通道，后面全是白工。

| # | 通道 | 资质门槛 | 收消息 | 发消息 | 真实适用场景 |
|---|---|---|---|---|---|
| 1 | 公众号 · 订阅号 | **个人可注册** | ✅ | ⚠️ 仅被动回复，5 秒内 | 个人 demo、自用助手 |
| 2 | 公众号 · 服务号 | 企业/组织 + **微信认证** | ✅ | ✅ 客服消息（48 小时窗口） | 正式对外客服 |
| 3 | 企业微信 · 自建应用 | 注册企业微信（**可不认证**） | ✅ | ✅ | 企业内部机器人 |
| 4 | 企业微信 · 群机器人 | **零门槛** | ❌ | ✅ 单向 | 告警、通知推送 |
| 5 | 微信客服 | **企业主体** | ✅ | ✅ | 外部客户咨询 |
| 6 | 腾讯元器（零代码） | 有公众号即可 | ✅ | ✅ | 不想写代码的替代方案 |
| — | ~~个人微信（hook/协议）~~ | 零 | ✅ | ✅ | **不建议**，见第五节 |

NexAgent 目前实现了 **通道 1 / 2**（`WeChatOfficialChannel`）与
**通道 3**（`WeComAppChannel`）。通道 4 / 5 在路线图上。

### 三个必须知道的硬限制

1. **公众号被动回复只有 5 秒。** 官方原文：「微信服务器在五秒内收不到响应会断掉
   连接，并且重新发起请求，总共重试三次。」这是 AI 接入公众号的最大技术障碍
   —— LLM 生成通常超过 5 秒。
2. **客服消息接口需要微信认证。** 而**个人主体无法完成微信认证**，所以个人订阅号
   拿不到异步推送能力。
3. **微信客服明确排除个人主体。** 官方原文：「该功能已向非个人的全体小程序开放。」

## 二、没有营业执照能走哪条

- ✅ **公众号订阅号**（通道 1）—— 个人可注册，能配置服务器 URL、能收发消息。
- ✅ **企业微信自建应用**（通道 3）—— 企业微信可注册未认证主体，能收发消息。
  注意：自建应用是**内部应用**，只有该企业成员能对它发消息。
- ✅ **企微群机器人**（通道 4）—— 零门槛，但只能发不能收。
- ❌ 服务号（通道 2）、微信客服（通道 5）、个人小程序客服。

**建议路径**：先用订阅号把链路跑通，它和企业微信**高度同构**
（URL 验证 + 签名 + AES 加解密 + 5 秒超时），将来升级只换适配器。

## 三、用法

### 公众号

```ts
import { WeChatOfficialChannel } from '@nexagent/channels'

const channel = new WeChatOfficialChannel({
  token: process.env.WECHAT_TOKEN!,
  encodingAESKey: process.env.WECHAT_AES_KEY!,
  appId: process.env.WECHAT_APP_ID!,
  encryptMode: 'plain',   // 先跑通明文，再切 'safe'
  // 服务号 + 微信认证后才需要下面两项
  canPush: false,
  // appSecret: process.env.WECHAT_APP_SECRET,
})

channel.onMessage(async (msg) => {
  // 异步处理：这里可以慢慢调 LLM
  const reply = await myAgent.generate(msg.text)
  if (channel.capabilities.canPush) {
    await channel.push(msg.from, reply.text)   // 有客服接口就走异步推送
  }
})

// 注册「快速被动回复」：5 秒内能出结果就走它，超时自动放弃
channel.onPassiveReply(async (msg) => {
  const cached = await cache.get(`reply:${msg.from}`)
  return cached ?? undefined
})
```

在你的 HTTP 框架里：

```ts
// GET —— 服务器配置验证，必须原样返回 echostr
app.get('/wechat', (req, res) => {
  res.send(channel.verifyUrl(req.query))
})

// POST —— 消息接收
app.post('/wechat', async (req, res) => {
  const body = await channel.handleMessage(req.query, rawBody)
  res.send(body)   // 空串 = 不做被动回复，微信不会重试
})
```

### 企业微信自建应用

```ts
import { WeComAppChannel } from '@nexagent/channels'

const channel = new WeComAppChannel({
  token: process.env.WECOM_TOKEN!,
  encodingAESKey: process.env.WECOM_AES_KEY!,
  corpId: process.env.WECOM_CORP_ID!,
  agentId: Number(process.env.WECOM_AGENT_ID),
  corpSecret: process.env.WECOM_SECRET,
})
```

## 四、三个真正的坑

### 坑 1 · URL 验证（GET）

公众号填服务器 URL 时，微信发一个 GET 请求验证：

```
GET /wechat?signature=xxx&timestamp=123&nonce=456&echostr=hello
```

校验规则（**明文模式**）：`sha1(sort([token, timestamp, nonce]).join(''))`。
校验通过则**原样返回 echostr** —— 不能加引号、不能带 BOM、不能带换行。

⚠️ **企业微信不一样**：参数是 `msg_signature`，`echostr` 是**加密**的，
需要先解密再返回明文，且要在 **1 秒内**响应。

### 坑 2 · 消息加解密（安全模式）

| 项 | 值 |
|---|---|
| 算法 | AES-256-CBC |
| 密钥 | `EncodingAESKey`（43 位）+ `=`，base64 解码后 32 字节 |
| IV | AESKey 的前 16 字节 |
| 填充 | PKCS7，**补位到 32 字节的整数倍**（注意不是 16） |
| 签名 | `sha1(sort([token, timestamp, nonce, encrypt]))` |

**解密后的明文结构**（最容易写错的地方）：

```
random(16 字节) + msg_len(4 字节, 大端) + msg(变长) + receiveid(变长)
```

这三处极容易出错，且出错时报错毫无指向性 —— 所以 `@nexagent/channels` 直接
提供了实现（`decryptMessage` / `encryptMessage`），并带往返测试。

### 坑 3 · 5 秒超时与异步回复（核心架构问题）

```
用户发消息 → 微信 POST 到你的 URL → 你必须 5 秒内响应
                                        ↓
                              LLM 生成通常要 8-30 秒
```

**正确架构是「立即 ACK + 异步推送」**：

```ts
app.post('/wechat', async (req, res) => {
  const msg = parse(req.body)
  if (isDuplicate(msg.MsgId)) return res.send('')   // 排重，微信会重试
  await queue.push(msg)                              // 先入队
  res.send('')                                       // 立刻返回空串
})

// 后台 worker
worker.process(async (job) => {
  const reply = await agent.generate(job.content)
  await channel.push(job.openid, reply)              // 需客服消息接口
})
```

**致命前提**：主动推送需要客服消息接口，**个人订阅号没有**。所以必须降级：

| 降级方案 | 做法 | 体验 |
|---|---|---|
| A. 快速模型 + 限长 | 限制输出 ≤100 字，用最快的模型，力争 5 秒内出结果 | 能跑通，但回答短 |
| B. 占位 + 二次触发 | 5 秒内返回「内容较长，请发送"继续"获取」；结果存 Redis | 稳，但多一次交互 |
| C. 利用重试窗口 | 不响应，让微信超时重试（约 20 秒窗口） | **不推荐**，依赖未承诺的行为 |

**推荐 A + B 组合**：先试 A，超时落 B。`onPassiveReply` + `passiveReplyBudgetMs`
就是为这个设计的。

**排重必须做**：微信会重试，不做 `MsgId` 排重会导致同一句话被回复多次。
本包默认用内存实现（`MemoryDedupStore`），**多实例部署请换 Redis**
（`SET key 1 NX EX 300`），替换 `dedupStore` 配置即可。

## 五、关于「个人微信」这条路的实话

网上大量教程教你用 Wechaty、PC hook、iPad 协议把 AI 接到个人微信。
**不要用它做开源项目。** 原因不是技术问题：

1. **违反《微信个人账号使用规范》** —— 微信明令禁止外挂/自动化工具。
2. **封号风险实打实** —— 你的用户按你的教程操作被封号，这个责任你担不起。
3. **上游不稳定** —— 依赖逆向协议，微信一更新就集体失效，会变成维护黑洞。

**开源项目要的是「用户照着做能成功」。** 官方通道慢一点、限制多一点，
但不会让用户踩雷。所以 NexAgent 只做官方通道。

## 六、参考文档

- 公众号接收普通消息：`developers.weixin.qq.com/doc/offiaccount/Message_Management/Receiving_standard_messages.html`
- 公众号消息加解密：`developers.weixin.qq.com/doc/offiaccount/Message_Management/Message_encryption_and_decryption_instructions.html`
- 企业微信接收消息：`developer.work.weixin.qq.com/document/path/90238`
- 企业微信加解密方案：`developer.work.weixin.qq.com/document/path/91144`
