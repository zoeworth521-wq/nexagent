# basic-agent 示例

最小可运行示例：**国产模型 + 合规网关**。

## 运行

```bash
cd examples/basic-agent
cp .env.example .env       # 填入 DEEPSEEK_API_KEY（或你选的厂商）
npm install
npm run dev                # 等价于 node --experimental-strip-types src/index.ts
```

带参数提问：

```bash
npm run dev -- "帮我把这段话改得更简洁：……"
```

## 它做了什么

1. 从 `NEXAGENT_PROVIDER`（默认 `deepseek`）解析出厂商配置与 API Key；
2. 把该配置接到 Mastra `Agent` 上；
3. 提问前先过输入合规检查，拿到回答后再过输出合规检查。

## 注意

- 本示例依赖 `@mastra/core`，需要联网安装。
- Mastra 的 `model` 配置形态随版本演进，请以其官方文档为准；
  我们提供的是 `baseURL` / `defaultModel` / `apiKey` 这三个值。
- 示例目录**不在**根 workspace 里，因此不会影响根仓库的 `npm install` 速度。
