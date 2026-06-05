#!/usr/bin/env node
/** Restores dynamic [id] routes after a static build. */
import { cpSync, existsSync, mkdirSync, rmSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const stashRoot = join(root, ".static-build-stash")

const DYNAMIC_ROUTES = [
  "app/compendium/classes/[id]",
  "app/compendium/subclasses/[id]",
  "app/compendium/species/[id]",
  "app/compendium/backgrounds/[id]",
  "app/compendium/spells/[id]",
  "app/compendium/feats/[id]",
  "app/compendium/equipment/[id]",
  "app/compendium/abilities/[id]",
  "app/characters/[id]",
  "app/api",
]

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
