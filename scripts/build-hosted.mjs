#!/usr/bin/env node
/** Production build for VPS / Node hosting (MySQL via API). */
import { spawnSync } from "child_process"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const env = {
  ...process.env,
  NEXT_PUBLIC_DEPLOY_MODE: "hosted",
}

const result = spawnSync("pnpm", ["exec", "next", "build"], {
  cwd: root,
  env,
  stdio: "inherit",
  shell: true,
})

process.exit(result.status ?? 1)
