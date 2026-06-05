#!/usr/bin/env node
/** Static export for GitHub Pages (IndexedDB, no server). */
import { spawnSync } from "child_process"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

const basePath =
  process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "/dump-stat-character-builder"

function run(label, cmd, args, extraEnv = {}) {
  console.log(`\n> ${label}`)
  const result = spawnSync(cmd, args, {
    cwd: root,
    env: {
      ...process.env,
      NEXT_PUBLIC_DEPLOY_MODE: "static",
      NEXT_OUTPUT: "export",
      NEXT_PUBLIC_BASE_PATH: basePath,
      ...extraEnv,
    },
    stdio: "inherit",
    shell: true,
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

run("Icon manifest", "node", ["scripts/build-icon-manifest.mjs"])
run("Prepare static routes", "node", ["scripts/prepare-static-build.mjs"])
run("Next.js static export", "pnpm", ["exec", "next", "build"])
run("Restore dynamic routes", "node", ["scripts/restore-static-build.mjs"])

console.log("\nStatic export written to out/")
