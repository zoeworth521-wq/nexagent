# 安全政策

## 支持范围

当前处于 v0.1.x 早期阶段，仅对 `main` 分支的最新代码提供安全修复。

## 报告漏洞

**请不要通过公开 Issue 报告安全问题。**

请通过 GitHub 的
[Private vulnerability reporting](https://github.com/zoeworth521-wq/nexagent/security/advisories/new)
提交，或在仓库主页找到维护者联系方式私下告知。我们会在 **72 小时内**回复。

报告时请尽量包含：影响范围、复现步骤、可能的修复方向。

## 本项目特别关注的风险点

由于 NexAgent 会接触 IM 平台密钥与模型 API Key，以下问题优先级最高：

- **密钥泄漏**：任何把 `.env`、`AppSecret`、`EncodingAESKey` 写入日志或提交进仓库的路径。
- **签名校验绕过**：`checkSignature` / `checkSignatureV2` 的时序攻击或比较缺陷。
- **加解密缺陷**：AES-256-CBC 的填充处理、`receiveid` 校验缺失。
- **重放与重复消费**：缺少 `MsgId` 排重导致的消息重复处理。

## 我们的做法

- 仓库不内置任何遥测，不收集用户数据。
- 所有密钥一律从环境变量读取，绝不写入源码。
- 签名比较使用 `crypto.timingSafeEqual`。
