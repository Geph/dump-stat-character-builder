/**
 * Optimize spell card masters only (skip page/hero/class batches).
 * Usage: node scripts/optimize-spell-cards.mjs
 */
import fs from "node:fs"
import path from "node:path"
import sharp from "sharp"
import {
  parseSpellCardSourceBase,
  shouldSkipSpellCardSourceBase,
} from "./card-source-layout.mjs"
import {
  isBundledCardSourceOrigin,
  isBundledPublicCardArtPath,
  cardSourceOriginFromRelative,
} from "./bundled-card-art.mjs"

const ROOT = path.resolve(import.meta.dirname, "..")
const SPELL_CARD_SOURCES = path.join(ROOT, "scripts", "spell-card-sources")
const SPELL_CARD_OUT = path.join(ROOT, "public", "images", "compendium", "spells")
const CARD_WIDTH = 771
const CARD_HEIGHT = 1024
const CARD_JPEG_QUALITY = 82
const EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"]

function extensionRank(ext) {
  if (ext === ".png") return 0
  if (ext === ".webp") return 1
  if (ext === ".jpg" || ext === ".jpeg") return 2
  return 9
}

function walkImageFiles(sourcesDir, onFile) {
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
        continue
      }
      const ext = path.extname(entry.name).toLowerCase()
      if (!EXTENSIONS.includes(ext)) continue
      const relative = path.relative(sourcesDir, full).replace(/\\/g, "/")
      const origin = cardSourceOriginFromRelative(relative)
      onFile({
        full,
        ext,
        base: entry.name.slice(0, -ext.length),
        relative,
        origin,
        originRank: isBundledCardSourceOrigin(origin) ? 0 : 1,
      })
    }
  }
  walk(sourcesDir)
}

function discoverSpellCardSlugs(sourcesDir) {
  if (!fs.existsSync(sourcesDir)) return []
  const byOutputSlug = new Map()
  walkImageFiles(sourcesDir, ({ full, ext, base }) => {
    if (shouldSkipSpellCardSourceBase(base)) return
    const { outputSlug, version } = parseSpellCardSourceBase(base)
    if (!outputSlug) return
    const prev = byOutputSlug.get(outputSlug)
    if (
      !prev ||
      version > prev.version ||
      (version === prev.version &&
        extensionRank(ext) < extensionRank(path.extname(prev.path).toLowerCase()))
    ) {
      byOutputSlug.set(outputSlug, { path: full, version })
    }
  })
  return [...byOutputSlug.entries()]
    .map(([slug, { path: full }]) => [slug, full])
    .sort(([a], [b]) => a.localeCompare(b))
}

async function encodeCardJpeg(input, output, width, height) {
  const inputMeta = await sharp(input).metadata()
  const inputKb = (fs.statSync(input).size / 1024).toFixed(1)
  await sharp(input)
    .resize(width, height, {
      fit: "cover",
      position: "centre",
      kernel: sharp.kernel.lanczos3,
    })
    .jpeg({ quality: CARD_JPEG_QUALITY, mozjpeg: true })
    .toFile(output)
  const outMeta = await sharp(output).metadata()
  const outKb = (fs.statSync(output).size / 1024).toFixed(1)
  const action =
    (inputMeta.width ?? 0) !== width || (inputMeta.height ?? 0) !== height
      ? "resized"
      : "encoded"
  return { inputMeta, outMeta, inputKb, outKb, action }
}

const entries = discoverSpellCardSlugs(SPELL_CARD_SOURCES)
console.log(`Spell card art → ${entries.length} unique slugs`)
fs.mkdirSync(SPELL_CARD_OUT, { recursive: true })
let bundled = 0
let localOnly = 0
let missing = 0
for (const [slug, input] of entries) {
  const output = path.join(SPELL_CARD_OUT, `${slug}.png`)
  try {
    const { inputMeta, outMeta, inputKb, outKb, action } = await encodeCardJpeg(
      input,
      output,
      CARD_WIDTH,
      CARD_HEIGHT,
    )
    const repoRel = path.relative(ROOT, output).replace(/\\/g, "/")
    const ship = isBundledPublicCardArtPath(repoRel)
    if (ship) bundled += 1
    else localOnly += 1
    if (!ship || action === "resized") {
      // keep log quieter for huge batches — only note failures and summary
    }
    void inputMeta
    void outMeta
    void inputKb
    void outKb
  } catch (error) {
    console.error(`  ✗ ${slug}: ${error instanceof Error ? error.message : error}`)
    missing += 1
  }
}
console.log(`→ ${bundled} currently bundled · ${localOnly} local-only · ${missing} failed`)
if (missing) process.exitCode = 1
