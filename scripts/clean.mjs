// 删除所有 workspace 包的 dist 目录与构建缓存。
// 用 Node 写而不是 rm -rf，是为了在 Windows / macOS / Linux 上行为一致。
import { rm } from 'node:fs/promises'
import { readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const packagesDir = join(root, 'packages')

const entries = await readdir(packagesDir, { withFileTypes: true })
const targets = entries
  .filter((e) => e.isDirectory())
  .map((e) => join(packagesDir, e.name, 'dist'))

for (const target of targets) {
  await rm(target, { recursive: true, force: true })
  console.log(`cleaned ${target}`)
}
