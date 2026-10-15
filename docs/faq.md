# 常见问题

## 安装与构建

**Q：`npm install` 之后 `npm run build` 报找不到 `tsc`？**
先确认在仓库根目录执行。根 `node_modules` 里应该有 `typescript`。
若仍失败，删掉 `node_modules` 与 `package-lock.json` 重新 `npm install`。

**Q：为什么不用 pnpm？**
本机零配置可用是首要考虑。项目用的是 npm workspaces，功能等价。
想换 pnpm 只需加一个 `pnpm-workspace.yaml`，包结构不用动。

## 模型接入

**Q：报「缺少环境变量 DEEPSEEK_API_KEY」？**
这是刻意设计的可读错误 —— 比让你在 HTTP 层收到一个 401 强。
把 `.env` 里的 Key 填上，或 `export DEEPSEEK_API_KEY=sk-xxx`。

**Q：换了 `NEXAGENT_PROVIDER` 但好像没生效？**
`resolveDefaultProviderId()` 读的是 `process.env.NEXAGENT_PROVIDER`。
如果你用的是 `.env` 文件，Node 不会自动加载它 —— 需要用
`node --env-file=.env` 或在代码里显式加载。

**Q：豆包报 model 不存在？**
火山方舟的 `model` 字段要填**推理接入点 ID**（`ep-xxxxxxxx`），不是模型名。
先去控制台创建接入点。

**Q：Kimi 报上下文超限？**
Kimi 的上下文长度由模型名后缀决定（`8k` / `32k` / `128k`），
超出会直接报错，不会自动截断。

## 微信接入

**Q：后台点「提交」一直提示配置失败？**
URL 验证失败率最高。按顺序排查：
1. `/wechat` 路由能否返回**原样**的 `echostr`（不能有引号 / BOM / 换行）；
2. 服务器能否被公网访问（用内网穿透的话，URL 要填穿透后的地址）；
3. `Token` 是否与后台填写的一致。

**Q：切到安全模式后收不到消息？**
`encryptMode` 要同步改成 `'safe'`。注意安全模式下连 `echostr` 都是密文，
`verifyUrl` 会自动解密。

**Q：用户收到重复回复？**
检查排重是否生效。默认的 `MemoryDedupStore` 在**多实例部署**下无效
（每个实例各存一份），请换成 Redis 实现。

**Q：回复总是不出来 / 超过 5 秒？**
个人订阅号没有客服消息接口，只能被动回复。用 `onPassiveReply` 注册快速回复
函数，并配合 `passiveReplyBudgetMs`（默认 4500ms）。详见
[微信接入 · 坑 3](./channels/wechat.md#坑-3--5-秒超时与异步回复核心架构问题)。

## 合规

**Q：`KeywordModerator` 能上生产吗？**
不能，它只是**兜底的第一道闸**，识别不了变体、拼音、同音字。
生产环境请用 `RemoteModerator` 对接云厂商内容安全 API。

**Q：审核服务挂了会不会阻断业务？**
`RemoteModerator` 是 **fail-open**（失败即放行）并把原因写进 `result.reason`。
若你的业务要求 fail-closed，请自行包装。

## 许可

**Q：我能把 NexAgent 用在自己的商业项目里吗？**
可以。本项目是 MIT。唯一义务是保留 LICENSE 与版权声明。
上游 Mastra 是 Apache-2.0，作为依赖引入，其声明随依赖树自动携带。

**Q：我能改名叫别的再发布吗？**
可以，MIT 允许。但请不要使用 Mastra 的商标，也请保留 `NOTICE` 里的第三方声明。
