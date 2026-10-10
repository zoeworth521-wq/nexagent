# NexAgent 文档

| 文档 | 内容 |
| --- | --- |
| [快速开始](./getting-started.md) | 5 分钟把仓库跑起来 |
| [模型接入指南](./providers.md) | 六家国产模型的差异点与配置 |
| [微信 / 企业微信接入](./channels/wechat.md) | 六条通道怎么选、加解密与 5 秒超时 |
| [常见问题](./faq.md) | 高频报错与排查 |
| [为什么不是又一个框架](./why-nexagent.md) | 与 Mastra 的关系、我们做什么不做什么 |

## 一句话架构

```
你的业务代码
   │
   ├── @nexagent/compliance   合规网关（输入/输出双向审核）
   ├── @nexagent/channels     IM 通道（微信 / 企微 / …）
   └── @nexagent/providers    国产模型适配
            │
            ▼
      @mastra/core            Agent 运行时（npm 依赖，非 fork）
```

**核心约定：`@nexagent/*` 只提供适配与治理能力，不重造 Agent 内核。**
