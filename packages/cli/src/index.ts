#!/usr/bin/env node
import { access, mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { stdin, stdout } from 'node:process'
import { createInterface } from 'node:readline/promises'

/**
 * create-nexagent —— 交互式脚手架。
 *
 * 目标：让用户敲完回车就能拿到一个**能跑起来**的国产模型 Agent 项目。
 * 零运行时依赖：只用 Node 内置模块，避免脚手架本身成为安装负担。
 */

interface ProviderChoice {
  id: string
  label: string
  env: string
  model: string
}

// 与 @nexagent/providers 保持一致。此处刻意内联，让脚手架不依赖任何 workspace 包。
const PROVIDERS: readonly ProviderChoice[] = [
  { id: 'deepseek', label: 'DeepSeek（推荐，便宜且快）', env: 'DEEPSEEK_API_KEY', model: 'deepseek-chat' },
  { id: 'dashscope', label: '通义千问（阿里云百炼）', env: 'DASHSCOPE_API_KEY', model: 'qwen-plus' },
  { id: 'glm', label: '智谱 GLM', env: 'ZHIPU_API_KEY', model: 'glm-4-plus' },
  { id: 'kimi', label: '月之暗面 Kimi', env: 'MOONSHOT_API_KEY', model: 'moonshot-v1-32k' },
  { id: 'doubao', label: '字节豆包（火山方舟）', env: 'ARK_API_KEY', model: 'doubao-pro-32k' },
  { id: 'ernie', label: '百度文心（千帆）', env: 'QIANFAN_API_KEY', model: 'ernie-4.0-8k' },
]

function isValidPackageName(name: string): boolean {
  return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name)
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function pkgJson(name: string, provider: ProviderChoice): string {
  return `${JSON.stringify(
    {
      name,
      version: '0.1.0',
      private: true,
      type: 'module',
      scripts: {
        dev: 'node --experimental-strip-types src/index.ts',
        start: 'node --experimental-strip-types src/index.ts',
      },
      dependencies: {
        '@mastra/core': '^0.10.0',
        '@nexagent/providers': '^0.1.0',
      },
      devDependencies: {
        '@types/node': '^22.10.2',
        typescript: '^5.7.2',
      },
    },
    null,
    2,
  )}\n`
}

function envExample(provider: ProviderChoice): string {
  return [
    '# 复制为 .env 并填入你的 Key',
    '# 申请地址见 https://github.com/zoeworth521-wq/nexagent/blob/main/docs/providers.md',
    '',
    `NEXAGENT_PROVIDER=${provider.id}`,
    `${provider.env}=`,
    '',
  ].join('\n')
}

function indexTs(provider: ProviderChoice): string {
  return `import { Agent } from '@mastra/core/agent'
import { getProvider, resolveApiKey } from '@nexagent/providers'

const provider = getProvider('${provider.id}')
const apiKey = resolveApiKey(provider)

const agent = new Agent({
  name: 'nexagent-demo',
  instructions: '你是一个简洁、直接的中文助手。回答控制在 3 句以内。',
  model: {
    provider: 'openai-compatible',
    name: provider.defaultModel,
    url: provider.baseURL,
    apiKey,
  } as never,
})

const answer = await agent.generate('用一句话解释什么是 AI Agent。')
console.log(answer.text)
`
}

function readme(name: string, provider: ProviderChoice): string {
  return `# ${name}

用 [create-nexagent](https://github.com/zoeworth521-wq/nexagent) 生成的国产模型 Agent 项目。

## 开始

\`\`\`bash
npm install
cp .env.example .env   # 填入 ${provider.env}
npm run dev
\`\`\`

## 切换模型

改 \`.env\` 里的 \`NEXAGENT_PROVIDER\` 即可，可选：
${PROVIDERS.map((p) => `- \`${p.id}\`（${p.label}）`).join('\n')}
`
}

function gitignore(): string {
  return 'node_modules/\ndist/\n.env\n.env.*\n!.env.example\n*.log\n'
}

function tsconfig(): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
        skipLibCheck: true,
        types: ['node'],
        noEmit: true,
        allowImportingTsExtensions: true,
      },
      include: ['src/**/*.ts'],
    },
    null,
    2,
  )}\n`
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    stdout.write(
      [
        'create-nexagent —— 生成一个可运行的国产模型 Agent 项目',
        '',
        '用法：',
        '  npx create-nexagent [目录名]',
        '',
        '示例：',
        '  npx create-nexagent my-agent',
        '',
      ].join('\n'),
    )
    return
  }

  const rl = createInterface({ input: stdin, output: stdout })

  try {
    let targetName = args[0]
    if (targetName === undefined || targetName === '') {
      targetName = (await rl.question('项目目录名 (my-agent): ')).trim() || 'my-agent'
    }

    const targetDir = resolve(process.cwd(), targetName)
    if (await exists(targetDir)) {
      stdout.write(`\n目录已存在：${targetDir}\n请换一个名字，或先删掉它。\n`)
      process.exitCode = 1
      return
    }

    stdout.write('\n可选模型厂商：\n')
    PROVIDERS.forEach((p, i) => stdout.write(`  ${i + 1}. ${p.label}\n`))
    const pickRaw = (await rl.question(`选择 [1-${PROVIDERS.length}] (1): `)).trim()
    const pick = pickRaw === '' ? 1 : Number.parseInt(pickRaw, 10)

    if (!Number.isInteger(pick) || pick < 1 || pick > PROVIDERS.length) {
      stdout.write('\n选择无效。\n')
      process.exitCode = 1
      return
    }

    const provider = PROVIDERS[pick - 1] as ProviderChoice
    const pkgName = targetName.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase()
    if (!isValidPackageName(pkgName)) {
      stdout.write(`\n无法从 "${targetName}" 推导出合法的包名，请换一个目录名。\n`)
      process.exitCode = 1
      return
    }

    await mkdir(join(targetDir, 'src'), { recursive: true })
    await writeFile(join(targetDir, 'package.json'), pkgJson(pkgName, provider), 'utf8')
    await writeFile(join(targetDir, 'tsconfig.json'), tsconfig(), 'utf8')
    await writeFile(join(targetDir, '.env.example'), envExample(provider), 'utf8')
    await writeFile(join(targetDir, '.gitignore'), gitignore(), 'utf8')
    await writeFile(join(targetDir, 'src', 'index.ts'), indexTs(provider), 'utf8')
    await writeFile(join(targetDir, 'README.md'), readme(pkgName, provider), 'utf8')

    stdout.write(
      [
        '',
        `✅ 已生成：${targetDir}`,
        '',
        '接下来：',
        `  cd ${targetName}`,
        '  npm install',
        '  cp .env.example .env      # 填入 Key',
        '  npm run dev',
        '',
      ].join('\n'),
    )
  } finally {
    rl.close()
  }
}

main().catch((error: unknown) => {
  stdout.write(`\n生成失败：${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
