<div align="center">

# NexAgent

**面向中文生态的 AI Agent 应用底座**

国产模型开箱可用 · 微信/飞书/钉钉一键接入 · 内置内容合规 · 全中文文档

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.10-339933.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6.svg)](https://www.typescriptlang.org)
[![Status](https://img.shields.io/badge/status-v0.1.0%20early-2f6fed.svg)](./CHANGELOG.md)

</div>

---

## 这是什么

NexAgent **不是又一个 Agent 框架**。它是一层**适配层**。

内核用 [Mastra](https://github.com/mastra-ai/mastra)（TypeScript 原生 Agent 框架，Apache-2.0），
以 npm 依赖的方式引入 —— **不复制、不 fork 它的源码**。我们只做 Mastra 没做、
而国内开发者第一天就会卡住的那一层：

| 你遇到的第一个问题 | NexAgent 的答案 |
| --- | --- |
| 通义 / DeepSeek / GLM / Kimi / 豆包 / 文心 怎么接？ | `@nexagent/providers` 统一适配，换一个环境变量即可切换厂商 |
| 怎么把 Agent 接到微信 / 企业微信 / 飞书？ | `@nexagent/channels` 把六条微信通道抽象成同一个 `MessageChannel` 接口 |
| 内容合规怎么办？ | `@nexagent/compliance` 输入输出双向审核钩子 |
| 文档全是英文、示例跑不通？ | 全中文文档 + `create-nexagent` 一键脚手架 |

> 一句话定位：**让国内开发者 10 分钟把 Agent 跑起来，模型用国产的，入口接微信/飞书。**

## 仓库结构

```
nexagent/
├── packages/
│   ├── providers/     @nexagent/providers   国产模型统一适配层
│   ├── channels/      @nexagent/channels    企业 IM 通道抽象与实现
│   ├── compliance/    @nexagent/compliance  内容合规中间件
│   └── cli/           create-nexagent       一键脚手架
├── examples/
│   └── basic-agent/   最小可运行示例
├── docs/              中文文档
└── .github/           CI、Issue / PR 模板
```

## 快速开始（本地，现在就能跑）

```bash
# 1. 克隆
git clone https://github.com/zoeworth521-wq/nexagent.git
cd nexagent

# 2. 安装依赖（根依赖很轻：typescript + vitest）
npm install

# 3. 类型检查 / 构建 / 测试
npm run typecheck
npm run build
npm test

# 4. 跑最小示例
cd examples/basic-agent
cp .env.example .env          # 填入 DEEPSEEK_API_KEY
npm install
npm run dev
```

### 用脚手架生成一个新项目（v0.2 目标）

```bash
npx create-nexagent@latest my-agent
```

> 脚手架代码已在 `packages/cli`，npm 包尚未发布 —— 见 [路线图](./CHANGELOG.md)。

## 支持的国产模型

| 厂商 | provider id | 协议 | 备注 |
| --- | --- | --- | --- |
| DeepSeek 深度求索 | `deepseek` | OpenAI 兼容 | 延迟低、便宜，推荐首选 |
| 通义千问（阿里云百炼） | `dashscope` | OpenAI 兼容 | 兼容性最好 |
| 智谱 GLM | `glm` | OpenAI 兼容 | |
| 月之暗面 Kimi | `kimi` | OpenAI 兼容 | 长上下文 |
| 字节豆包 | `doubao` | OpenAI 兼容 | 走方舟 endpoint id |
| 百度文心 | `ernie` | 自有协议 / 兼容层 | 差异点较多，见文档 |

适配层重点处理的**差异点**：流式分片格式、function calling 字段、
embedding 维度、限流与重试。

## 与 Mastra 的关系（必读）

这是被问得最多的问题，所以直接说清楚：

- ✅ **是依赖关系，不是 fork 关系。** Mastra 在 `package.json` 里，不在源码里。
- ✅ **上游升级只需改版本号。** 不会被上游的破坏性变更冲垮。
- ✅ **许可干净。** 本项目 MIT；Mastra 核心 Apache-2.0，我们主动规避其 `ee/` 目录。
- ❌ **本项目不包含任何 Mastra 源码。** 若你发现仓库里有，请提 Issue —— 那是 bug。

详见 [`docs/why-nexagent.md`](./docs/why-nexagent.md)。

## 文档

- [快速开始](./docs/getting-started.md)
- [模型接入指南](./docs/providers.md)
- [微信 / 企业微信接入](./docs/channels/wechat.md)
- [常见问题](./docs/faq.md)
- [为什么不是又一个框架](./docs/why-nexagent.md)

## 路线图

| 版本 | 内容 | 状态 |
| --- | --- | --- |
| v0.1.0 | 骨架、providers、channels 抽象 + 微信实现、compliance、CLI、文档 | ✅ 当前 |
| v0.2.0 | 6 家模型全部端到端跑通、`create-nexagent` 发 npm、文档站上线 | ⏳ |
| v0.3.0 | 飞书 / 钉钉适配器、可观测面板、中文评测集 | ⏳ |

## 参与贡献

欢迎 Issue 与 PR —— 尤其是**你踩到的坑**，那是最好的文档素材。
请先读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 许可

本项目基于 [MIT](./LICENSE) 发布。
依赖的上游组件许可见 [NOTICE](./NOTICE)。

---

<div align="center">
<sub>NexAgent 是一个独立项目，与 Mastra 官方无隶属关系。</sub>
</div>
