# 模型接入指南

## 为什么需要一层适配

六家国产模型**大多兼容 OpenAI 协议**，但差异点集中在四处，且每一处都能让你
debug 半小时：

| 差异点 | 表现 |
| --- | --- |
| 最大 token 字段 | OpenAI 新版用 `max_completion_tokens`，国产厂商普遍只认 `max_tokens` |
| 流式分片格式 | SSE 的 `data:` 结构在个别厂商处不一致 |
| function calling | 部分模型（如 DeepSeek 的 reasoner）**不支持**，调了会报错 |
| embedding 维度 | 各家不同，写入向量库后才发现维度不符就晚了 |

`@nexagent/providers` 把这些差异**显式声明**在 `ProviderQuirks` 里，
而不是让你去翻六份文档。

## 支持的厂商

| id | 厂商 | baseURL | Key 环境变量 | 默认模型 |
| --- | --- | --- | --- | --- |
| `deepseek` | DeepSeek 深度求索 | `https://api.deepseek.com/v1` | `DEEPSEEK_API_KEY` | `deepseek-chat` |
| `dashscope` | 通义千问（阿里云百炼） | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `DASHSCOPE_API_KEY` | `qwen-plus` |
| `glm` | 智谱 GLM | `https://open.bigmodel.cn/api/paas/v4` | `ZHIPU_API_KEY` | `glm-4-plus` |
| `kimi` | 月之暗面 Kimi | `https://api.moonshot.cn/v1` | `MOONSHOT_API_KEY` | `moonshot-v1-32k` |
| `doubao` | 字节豆包（火山方舟） | `https://ark.cn-beijing.volces.com/api/v3` | `ARK_API_KEY` | `doubao-pro-32k` |
| `ernie` | 百度文心（千帆） | `https://qianfan.baidubce.com/v2` | `QIANFAN_API_KEY` | `ernie-4.0-8k` |

> 模型列表会随厂商更新，上表以代码中的预设为准，实际请以各厂商官网为准。

## 用法

```ts
import { getProvider, resolveApiKey, listProviders } from '@nexagent/providers'

// 列出全部
console.log(listProviders().map((p) => p.id))

// 取配置
const provider = getProvider('dashscope')
provider.baseURL          // https://dashscope.aliyuncs.com/compatible-mode/v1
provider.defaultModel     // qwen-plus
provider.quirks?.toolCalling

// 取 Key（缺失时抛出可读错误，而不是让请求变成 401）
const apiKey = resolveApiKey(provider)
```

## 各厂商注意事项

### DeepSeek
- `deepseek-reasoner` **不支持** function calling 与 JSON 模式，切换模型时注意。
- 建议作为默认厂商：延迟低、价格便宜。

### 通义千问（阿里云百炼）
- **必须**走 `compatible-mode` 路径才是 OpenAI 兼容协议，别用 dashscope 原生路径。
- 兼容性最好，推荐与 DeepSeek 一起作为首批接入对象。

### 智谱 GLM
- 接口路径带版本号（`/v4`），升级时留意。

### Kimi
- 上下文长度由**模型名后缀**决定（`8k` / `32k` / `128k`），超出直接报错。

### 豆包（火山方舟）
- ⚠️ `model` 字段应填**推理接入点 ID**（`ep-xxxxxxxx`），而不是模型名。
  需要先在火山方舟控制台为模型创建接入点。

### 文心（千帆）
- 千帆 v2 已提供 OpenAI 兼容接口（`/v2`），推荐使用。
- 旧版 v1 是百度自有协议，本项目**不支持**。

## 接入私有部署 / 中转网关

任何 OpenAI 兼容端点都可以注册进来（vLLM / Ollama / one-api / new-api 等）：

```ts
import { ProviderRegistry } from '@nexagent/providers'

const registry = new ProviderRegistry([])
registry.register({
  id: 'local',
  name: '本地 vLLM',
  baseURL: 'http://127.0.0.1:8000/v1',
  apiKeyEnv: 'LOCAL_API_KEY',
  defaultModel: 'qwen2.5-7b-instruct',
  models: ['qwen2.5-7b-instruct'],
  openAICompatible: true,
})
```

## 新增一家厂商

见 [`CONTRIBUTING.md`](../CONTRIBUTING.md#新增一个国产模型适配器)。
