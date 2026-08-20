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
    const error = new Error(`${label} failed`)
    error.exitCode = result.status ?? 1
    throw error
  }
}

let routesStashed = false
try {
  run("Icon manifest", "node", ["scripts/build-icon-manifest.mjs"])
  run("Prepare static routes", "node", ["scripts/prepare-static-build.mjs"])
  routesStashed = true
  run("Next.js static export", "pnpm", ["exec", "next", "build"])
} catch (error) {
  process.exitCode = error.exitCode ?? 1
} finally {
  if (routesStashed) {
    try {
      run("Restore dynamic routes", "node", ["scripts/restore-static-build.mjs"])
    } catch (restoreError) {
      console.error("Failed to restore dynamic routes after static build.")
      process.exitCode = restoreError.exitCode ?? 1
    }
  }
}

if (!process.exitCode) console.log("\nStatic export written to out/")
