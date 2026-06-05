#!/usr/bin/env node
/**
 * Fails if the repo still references Supabase (this app uses MySQL only).
 * Run: node scripts/check-no-supabase.mjs
 */
import { readFileSync, readdirSync, statSync } from "fs"
import { join } from "path"
import { fileURLToPath } from "url"

const ROOT = fileURLToPath(new URL("..", import.meta.url))
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "public/icons"])
const FORBIDDEN = [
  /@supabase\//,
  /lib\/supabase/,
  /from\s+["']@\/lib\/supabase/,
  /\bSUPABASE_/,
  /createClient\s*\(\s*\)\s*from\s+["'][^"']*supabase/i,
]

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (SKIP_DIRS.has(name)) continue
    const st = statSync(path)
    if (st.isDirectory()) walk(path, files)
    else if (/\.(ts|tsx|js|mjs|json|md|example)$/.test(name)) files.push(path)
  }
  return files
}

let failed = false

for (const file of walk(ROOT)) {
  const rel = file.slice(ROOT.length + 1)
  const text = readFileSync(file, "utf8")
  for (const re of FORBIDDEN) {
    if (re.test(text)) {
      console.error(`Supabase reference (${re}): ${rel}`)
      failed = true
      break
    }
  }
}

if (failed) {
  console.error("\nRemove Supabase references — data layer is MySQL via lib/db and /api/* routes.")
  process.exit(1)
}

console.log("OK: no Supabase references in source.")
