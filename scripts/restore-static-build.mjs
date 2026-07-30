#!/usr/bin/env node
/** Restores dynamic [id] routes after a static build. */
import { cpSync, existsSync, mkdirSync, rmSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import { DYNAMIC_ROUTES } from "./static-build-routes.mjs"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const stashRoot = join(root, ".static-build-stash")

for (const rel of DYNAMIC_ROUTES) {
  const src = join(stashRoot, rel)
  const dest = join(root, rel)
  if (!existsSync(src)) continue
  mkdirSync(dirname(dest), { recursive: true })
  if (existsSync(dest)) rmSync(dest, { recursive: true, force: true })
  cpSync(src, dest, { recursive: true })
  console.log(`Restored ${rel}`)
}

if (existsSync(stashRoot)) {
  rmSync(stashRoot, { recursive: true, force: true })
}

console.log("Dynamic routes restored.")
