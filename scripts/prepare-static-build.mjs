#!/usr/bin/env node
/**
 * Moves dynamic [id] routes aside so `next build` with output: export can succeed.
 * Restored by restore-static-build.mjs after the static build.
 */
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

function stashPath(rel) {
  return join(stashRoot, rel)
}

mkdirSync(stashRoot, { recursive: true })

for (const rel of DYNAMIC_ROUTES) {
  const src = join(root, rel)
  const dest = stashPath(rel)
  if (!existsSync(src)) continue
  mkdirSync(dirname(dest), { recursive: true })
  if (existsSync(dest)) rmSync(dest, { recursive: true, force: true })
  cpSync(src, dest, { recursive: true })
  rmSync(src, { recursive: true, force: true })
  console.log(`Stashed ${rel}`)
}

console.log("Dynamic routes stashed for static export.")
