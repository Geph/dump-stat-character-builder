/**
 * Download SRD 5.2.1 markdown and build lib/srd/seed-data/*.json for /api/seed.
 *
 *   node scripts/build-srd-seed.mjs
 *
 * Optional: place official PDF at data/srd.pdf for reference (not required).
 * Markdown source: https://github.com/downfallx/dnd-5e-srd-markdown (CC-BY, SRD 5.2.1)
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parseAll } from "../lib/srd/parser.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const outDir = path.join(root, "lib", "srd", "seed-data")
const cacheDir = path.join(root, "data", "srd-source")

const BASE =
  "https://raw.githubusercontent.com/downfallx/dnd-5e-srd-markdown/master/"

const FILES = {
  origins: "character-origins.md",
  classes: "classes.md",
  spells: "spells.md",
  feats: "feats.md",
  equipment: "equipment.md",
  magicItems: "magic-items.md",
}

async function fetchMarkdown(name) {
  const cachePath = path.join(cacheDir, name)
  if (fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath, "utf8")
  }
  const url = BASE + name
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  const text = await res.text()
  fs.mkdirSync(cacheDir, { recursive: true })
  fs.writeFileSync(cachePath, text)
  return text
}

async function main() {
  console.log("Fetching SRD markdown...")
  const sources = {}
  for (const [key, file] of Object.entries(FILES)) {
    sources[key] = await fetchMarkdown(file)
    console.log(`  ${file}: ${(sources[key].length / 1024).toFixed(0)} KB`)
  }

  console.log("Parsing...")
  const data = parseAll(sources)

  fs.mkdirSync(outDir, { recursive: true })
  for (const [key, rows] of Object.entries(data)) {
    const fileName = key === "magicItems" ? "magic-items.json" : `${key}.json`
    const file = path.join(outDir, fileName)
    fs.writeFileSync(file, JSON.stringify(rows, null, 0))
    console.log(`  ${fileName}: ${rows.length} records`)
  }

  const manifest = {
    version: "5.2.1",
    source: "downfallx/dnd-5e-srd-markdown",
    license: "CC-BY-4.0 (SRD 5.2.1 by Wizards of the Coast)",
    generatedAt: new Date().toISOString(),
    counts: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v.length]),
    ),
  }
  fs.writeFileSync(
    path.join(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  )

  const total = Object.values(data).reduce((n, arr) => n + arr.length, 0)
  console.log(`\nDone. ${total} total records → lib/srd/seed-data/`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
