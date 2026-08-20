#!/usr/bin/env node
/**
 * Local CI-parity gate.
 *
 * Keep this list aligned with .github/workflows/ci.yml. The pre-push hook runs
 * the full gate because Vitest's --changed selection can miss behavior reached
 * indirectly through normalization and schema helpers.
 */
import { spawnSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const gitDirResult = spawnSync("git", ["rev-parse", "--git-dir"], {
  cwd: root,
  encoding: "utf8",
})
const gitDir =
  gitDirResult.status === 0 ? join(root, gitDirResult.stdout.trim()) : null
const cachePath = gitDir ? join(gitDir, "dump-stat-verify-ci-cache") : null
const useCache = process.argv.includes("--pre-push") && !process.env.PREPUSH_FULL

const checks = [
  ["MySQL dependency audit", process.execPath, ["scripts/check-no-supabase.mjs"]],
  ["ESLint", process.execPath, ["node_modules/eslint/bin/eslint.js", "."]],
  ["TypeScript", process.execPath, ["node_modules/typescript/bin/tsc", "--noEmit"]],
  ["Vitest", process.execPath, ["node_modules/vitest/vitest.mjs", "run"]],
  [
    "SRD class feature audit",
    process.execPath,
    ["scripts/run-vite-node.mjs", "scripts/audit-srd-class-features.ts"],
  ],
  [
    "Modifier wiring registry audit",
    process.execPath,
    ["scripts/run-vite-node.mjs", "scripts/audit-modifier-wiring-registry.ts"],
  ],
  [
    "Modifier catalog audit",
    process.execPath,
    ["scripts/run-vite-node.mjs", "scripts/audit-modifier-catalog.ts"],
  ],
  ["Static export", process.execPath, ["scripts/build-static.mjs"]],
]

function verificationKey() {
  const head = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  })
  if (head.status !== 0) return null
  const hash = createHash("sha256")
  hash.update(head.stdout.trim())
  // Include tracked working-tree changes. This prevents a successful run with
  // local edits from being reused later for the clean version of the same HEAD.
  const diff = spawnSync("git", ["diff", "HEAD", "--binary"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  })
  if (diff.status === 0) hash.update(diff.stdout)
  for (const path of [
    "package.json",
    "pnpm-lock.yaml",
    ".github/workflows/ci.yml",
    "scripts/verify-ci.mjs",
  ]) {
    const absolute = join(root, path)
    if (existsSync(absolute)) hash.update(readFileSync(absolute))
  }
  return hash.digest("hex")
}

const key = verificationKey()
if (useCache && key && cachePath && existsSync(cachePath)) {
  const cached = readFileSync(cachePath, "utf8").trim()
  if (cached === key) {
    console.error("pre-push: this commit already passed the full local CI gate.")
    process.exit(0)
  }
}

const started = Date.now()
for (const [label, command, args] of checks) {
  console.log(`\n=== ${label} ===`)
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      CI: "1",
      NEXT_PUBLIC_BASE_PATH: "/dump-stat-character-builder",
    },
  })
  if (result.status !== 0) {
    console.error(`\nCI verification FAILED at: ${label}`)
    console.error("Push blocked. Fix the error and retry.")
    process.exit(result.status ?? 1)
  }
}

if (useCache && key && cachePath) writeFileSync(cachePath, `${key}\n`)

const seconds = Math.round((Date.now() - started) / 1000)
console.log(`\nCI verification passed (${seconds}s).`)
