#!/usr/bin/env node
/**
 * Resolve vite-node from the pnpm layout and run a TypeScript entry (path aliases via Vite).
 * Avoids npx/tsx IPC issues in some sandboxed environments.
 */
import { existsSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"
import { spawnSync } from "node:child_process"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const require = createRequire(join(root, "package.json"))

function resolveViteNodeMjs() {
  /** @type {string[]} */
  const candidates = [join(root, "node_modules/vite-node/vite-node.mjs")]
  try {
    const vitestPkg = dirname(require.resolve("vitest/package.json"))
    candidates.push(join(vitestPkg, "node_modules/vite-node/vite-node.mjs"))
  } catch {
    /* vitest not resolvable */
  }
  try {
    const vnPkg = dirname(require.resolve("vite-node/package.json"))
    candidates.push(join(vnPkg, "vite-node.mjs"))
  } catch {
    /* try pnpm store below */
  }
  const pnpm = join(root, "node_modules/.pnpm")
  if (existsSync(pnpm)) {
    for (const name of readdirSync(pnpm)) {
      if (!name.startsWith("vite-node@")) continue
      const mjs = join(pnpm, name, "node_modules/vite-node/vite-node.mjs")
      if (existsSync(mjs)) candidates.push(mjs)
    }
  }
  for (const c of candidates) {
    if (existsSync(c) && c.endsWith(".mjs")) return c
  }
  return null
}

if (!process.argv[2]) {
  console.error("Usage: node scripts/run-vite-node.mjs <script.ts> [args...]")
  process.exit(2)
}

const viteNode = resolveViteNodeMjs()
if (!viteNode) {
  console.error("Could not find vite-node. Is vitest installed?")
  process.exit(1)
}

const config = join(root, "vitest.config.ts")
const args = ["-c", config, ...process.argv.slice(2)]
const result = spawnSync(process.execPath, [viteNode, ...args], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
})
process.exit(result.status ?? 1)
