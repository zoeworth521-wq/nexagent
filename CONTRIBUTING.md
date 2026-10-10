# 贡献指南

感谢你愿意参与 NexAgent。这份指南很短，读完大约 3 分钟。

## 开始之前

- 读一遍 [`VISION.md`](./VISION.md)。**每个 PR 都要能回答"它解决了三个问题里的哪一个"。**
- 大改动（新增适配器、改公共接口）请先开 Issue 讨论，避免白做。
- 小修小补（文档、错别字、测试）直接提 PR。

## 环境准备

- Node.js **>= 20.10**
- npm >= 10（项目用 npm workspaces）

```bash
git clone https://github.com/zoeworth521-wq/nexagent.git
cd nexagent
npm install
```

## 本地开发命令

| 命令 | 作用 |
| --- | --- |
| `npm run typecheck` | 全仓库类型检查 |
| `npm run build` | 构建所有 workspace 包 |
| `npm test` | 跑单元测试（vitest） |
| `npm run test:watch` | 测试监听模式 |

提交前请确保 **typecheck 与 test 都是绿的**。

## 目录约定

- `packages/*/src` —— 源码，**不要**放测试。
- `packages/*/test` —— 单元测试，文件名 `*.test.ts`。
- 相对导入必须带 `.js` 后缀（项目用 NodeNext ESM）。
- 类型导入统一用 `import type`。

## 新增一个国产模型适配器

1. 在 `packages/providers/src/vendors/` 新建 `<vendor>.ts`，导出一个 `ModelProviderConfig`。
2. 在 `vendors/index.ts` 注册。
3. 在 `packages/providers/test/` 补一条断言（至少验证 id / baseURL / apiKeyEnv 正确）。
4. 在 `docs/providers.md` 补一节接入说明，写清**与 OpenAI 的差异点**。

## 新增一个 IM 通道

1. 实现 `MessageChannel` 接口（`packages/channels/src/types.ts`）。
2. **必须显式声明 `capabilities`** —— 上层靠 `canPush` 决定超时策略。
3. 加解密逻辑复用 `crypto.ts` 的 `baseCrypto`，只覆盖差异部分。
4. 补测试 + 文档。

## 提交规范

采用 [Conventional Commits](https://www.conventionalcommits.org/)：

```
feat(providers): 新增智谱 GLM 适配
fix(channels): 修正企业微信 echostr 解密后的 receiveid 校验
docs: 补充 5 秒超时降级方案说明
```

## PR 检查清单

- [ ] `npm run typecheck` 通过
- [ ] `npm test` 通过
- [ ] 没有提交任何 `.env` / 密钥
- [ ] 新增代码有对应测试
- [ ] 涉及行为变更的，已更新文档
- [ ] **没有复制任何上游源码**（尤其是 Mastra 的 `ee/`）

## 许可

贡献即表示你同意你的代码以本项目的 MIT 许可发布。
