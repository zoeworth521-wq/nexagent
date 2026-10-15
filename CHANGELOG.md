# 更新日志

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/) 与
[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [Unreleased]

### 变更（破坏性）
- **最低 Node 版本从 `>=20.10` 提升到 `>=22.12`**。Node 20 已于 2026-04 结束维护，
  且测试框架 vitest 5 不再支持 Node 20。CI 矩阵相应调整为 Node 22 / 24。
- `vitest` 由 2 升级到 5。
- `@types/node` 固定在 22.x：其主版本必须与最低支持的运行时对齐，
  否则类型系统会放行运行时不存在的 API。

### 计划中
- `create-nexagent` 发布到 npm
- 飞书 / 钉钉适配器
- 可观测面板
- 中文评测集

## [0.1.0] - 2026-10-10

首个公开骨架版本。目标不是"功能齐全"，而是**把架构定死**：

### 新增
- `@nexagent/providers`：国产模型统一适配层
  - 内置 DeepSeek / 通义(DashScope) / 智谱 GLM / Kimi / 豆包 / 文心 六家配置
  - `ModelProviderConfig` 显式声明各厂商与 OpenAI 协议的差异点
  - 注册表 + 环境变量解析
- `@nexagent/channels`：企业 IM 通道抽象
  - `MessageChannel` 统一接口，能力声明式（`canReceive` / `canPush`）
  - 微信公众号（订阅号/服务号）适配：签名校验、AES 加解密、5 秒超时策略
  - 企业微信自建应用适配：`msg_signature` + `receiveid` 校验
  - 微信加解密公共实现（AES-256-CBC + PKCS7 + sha1）
- `@nexagent/compliance`：内容合规中间件
  - 输入 / 输出双向审核钩子
  - 内置敏感词实现 + 可插拔云厂商审核接口
- `create-nexagent`：交互式脚手架（尚未发布到 npm）
- 完整中文文档、示例、CI、Issue / PR 模板

### 说明
- 内核依赖 [Mastra](https://github.com/mastra-ai/mastra)，以 npm 依赖引入，
  **不复制其源码**，并主动规避其 `ee/` 目录。
- 本项目许可：MIT。
