import fs from "node:fs"
import path from "node:path"
import sharp from "sharp"

const ROOT = path.resolve(import.meta.dirname, "..")
const ASSETS = process.env.PAGE_BG_SOURCES ?? path.join(ROOT, "scripts", "page-bg-sources")
const CLASS_CARD_SOURCES =
  process.env.CLASS_CARD_SOURCES ?? path.join(ROOT, "scripts", "class-card-sources")
const SUBCLASS_CARD_SOURCES =
  process.env.SUBCLASS_CARD_SOURCES ?? path.join(ROOT, "scripts", "subclass-card-sources")
const BACKGROUND_CARD_SOURCES =
  process.env.BACKGROUND_CARD_SOURCES ?? path.join(ROOT, "scripts", "background-card-sources")
const SPECIES_CARD_SOURCES =
  process.env.SPECIES_CARD_SOURCES ?? path.join(ROOT, "scripts", "species-card-sources")
const SPELL_CARD_SOURCES =
  process.env.SPELL_CARD_SOURCES ?? path.join(ROOT, "scripts", "spell-card-sources")
const PAGE_BG_OUT = path.join(ROOT, "public", "images", "page-backgrounds")
const HERO_OUT = path.join(ROOT, "public", "images", "hero")
const FEATURE_OUT = path.join(ROOT, "public", "images", "features")
const SPLASH_OUT = path.join(ROOT, "public", "images", "welcome-splash")
const CLASS_CARD_OUT = path.join(ROOT, "public", "images", "compendium", "classes")
const SUBCLASS_CARD_OUT = path.join(ROOT, "public", "images", "compendium", "subclasses")
const BACKGROUND_CARD_OUT = path.join(ROOT, "public", "images", "compendium", "backgrounds")
const SPECIES_CARD_OUT = path.join(ROOT, "public", "images", "compendium", "species")
const SPELL_CARD_OUT = path.join(ROOT, "public", "images", "compendium", "spells")

const WEBP_QUALITY = Number(process.env.SITE_IMAGE_QUALITY ?? 85)
const CARD_JPEG_QUALITY = Number(process.env.CARD_JPEG_QUALITY ?? 82)

/** Bundled page background WebP — downscale from full-res sources, never upscale. */
const PAGE_BG_WIDTH = Number(process.env.PAGE_BG_WIDTH ?? 1200)
const PAGE_BG_HEIGHT = Number(process.env.PAGE_BG_HEIGHT ?? 1800)

/** Home hero rotating art — wide 2:1 cinematic banners. */
const HERO_WIDTH = Number(process.env.HERO_WIDTH ?? 2560)
const HERO_HEIGHT = Number(process.env.HERO_HEIGHT ?? 1280)

/** Home feature cards — 16:9 thumbnails (object-cover in UI). */
const FEATURE_WIDTH = Number(process.env.FEATURE_WIDTH ?? 1200)
const FEATURE_HEIGHT = Number(process.env.FEATURE_HEIGHT ?? 675)

/** Welcome splash card art — 4:3 (matches splash card aspect). */
const SPLASH_WIDTH = Number(process.env.SPLASH_WIDTH ?? 1200)
const SPLASH_HEIGHT = Number(process.env.SPLASH_HEIGHT ?? 900)

/** GitHub README hero — preserve aspect, cap max dimensions. */
const README_HERO_MAX_WIDTH = Number(process.env.README_HERO_MAX_WIDTH ?? 1400)
const README_HERO_MAX_HEIGHT = Number(process.env.README_HERO_MAX_HEIGHT ?? 1200)

/** Compendium portrait card art (classes / subclasses / species / spells) — 3:4. */
const CARD_WIDTH = Number(process.env.CARD_WIDTH ?? 771)
const CARD_HEIGHT = Number(process.env.CARD_HEIGHT ?? 1024)

/** Background card art — 21:9 landscape (matches browse/detail heroes). */
const BACKGROUND_CARD_WIDTH = Number(process.env.BACKGROUND_CARD_WIDTH ?? 1680)
const BACKGROUND_CARD_HEIGHT = Number(process.env.BACKGROUND_CARD_HEIGHT ?? 720)

const EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"]

/** theme id → candidate source basenames (first match wins). */
const THEME_SOURCES = {
  parchment: ["parchment"],
  astral: ["astral", "arcane"],
  stone: ["stone"],
  moss: ["moss"],
  sands: ["sands", "clay"],
}

/** output basename → candidate source basenames */
const HERO_SOURCES = {
  "rotating-01": ["rotating (1)", "rotating-01", "rotating-1"],
  "rotating-02": ["rotating (2)", "rotating-02", "rotating-2"],
  "rotating-03": ["rotating (3)", "rotating-03", "rotating-3"],
  "rotating-04": ["rotating (4)", "rotating-04", "rotating-4"],
}

/** output basename → candidate source basenames */
const FEATURE_SOURCES = {
  "character-creation": ["Character-Builder", "character-creation", "character-builder"],
  compendium: ["Compendium", "compendium"],
  "import-content": ["Import", "import-content", "import"],
  "character-sheet": ["Character-Sheet", "character-sheet"],
  appearance: ["Appearance", "Apperance", "appearance"],
  "export-database": ["Export", "export-database", "export"],
}

/** output basename → candidate source basenames */
const SPLASH_SOURCES = {
  "visual-compact": ["dual-mode", "visual-compact", "Visual-Compact"],
  "compact-interface": ["compact-interface", "Compact-Interface"],
  "no-ai": ["no-ai", "No-AI"],
}

function resolveSourcePath(basenames, assetsDir = ASSETS) {
  for (const base of basenames) {
    for (const ext of EXTENSIONS) {
      const candidate = path.join(assetsDir, `${base}${ext}`)
      if (fs.existsSync(candidate)) return candidate
    }
  }
  return null
}

/**
 * Source basenames → output basenames (without extension).
 * Keeps Drive’s `aasimar-2024` / `changeling-2024` masters while shipping canonical URLs.
 * MotM portraits stay year-suffixed (`aasimar-2022`, `changeling-2022`).
 */
const CARD_OUTPUT_SLUG_ALIASES = {
  "aasimar-2024": "aasimar",
  "changeling-2024": "changeling",
}

/** Discover card sources by slug basename (supports nested dirs, e.g. artificer/reanimator). Prefer .png > .webp > .jpg/.jpeg when duplicates exist. */
function discoverCardSlugs(sourcesDir) {
  if (!fs.existsSync(sourcesDir)) return []
  const rank = (ext) => {
    if (ext === ".png") return 0
    if (ext === ".webp") return 1
    if (ext === ".jpg" || ext === ".jpeg") return 2
    return 9
  }
  /** Prefer *-2024 aliased sources over a plain canonical file when both exist. */
  const sourceRank = (sourceSlug) => (sourceSlug.endsWith("-2024") ? 0 : 1)
  const byOutputSlug = new Map()

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
      const rel = path.relative(sourcesDir, full)
      const sourceSlug = rel.slice(0, -ext.length).split(path.sep).join("/")
      if (!sourceSlug) continue
      const parts = sourceSlug.split("/")
      const base = parts[parts.length - 1]
      const aliasedBase = CARD_OUTPUT_SLUG_ALIASES[base] ?? base
      parts[parts.length - 1] = aliasedBase
      const outputSlug = parts.join("/")
      const prev = byOutputSlug.get(outputSlug)
      if (
        !prev ||
        sourceRank(base) < sourceRank(prev.sourceSlug) ||
        (sourceRank(base) === sourceRank(prev.sourceSlug) &&
          rank(ext) < rank(path.extname(prev.path).toLowerCase()))
      ) {
        byOutputSlug.set(outputSlug, { path: full, sourceSlug: base })
      }
    }
  }
  walk(sourcesDir)

  return [...byOutputSlug.entries()]
    .map(([slug, { path: full }]) => [slug, full])
    .sort(([a], [b]) => a.localeCompare(b))
}

async function encodeWebp(input, output, width, height) {
  const inputMeta = await sharp(input).metadata()
  const inputKb = (fs.statSync(input).size / 1024).toFixed(1)

  await sharp(input)
    .resize(width, height, {
      fit: "cover",
      position: "centre",
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY, effort: 6 })
    .toFile(output)

  const outMeta = await sharp(output).metadata()
  const outKb = (fs.statSync(output).size / 1024).toFixed(1)
  const action =
    (inputMeta.width ?? 0) > width || (inputMeta.height ?? 0) > height ? "downscaled" : "encoded"

  return { inputMeta, outMeta, inputKb, outKb, action }
}

async function encodeWebpFitInside(input, output, maxWidth, maxHeight) {
  const inputMeta = await sharp(input).metadata()
  const inputKb = (fs.statSync(input).size / 1024).toFixed(1)

  await sharp(input)
    .resize(maxWidth, maxHeight, {
      fit: "inside",
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY, effort: 6 })
    .toFile(output)

  const outMeta = await sharp(output).metadata()
  const outKb = (fs.statSync(output).size / 1024).toFixed(1)
  const action =
    (inputMeta.width ?? 0) > maxWidth || (inputMeta.height ?? 0) > maxHeight
      ? "downscaled"
      : "encoded"

  return { inputMeta, outMeta, inputKb, outKb, action }
}

/** Portrait card art — JPEG bytes under a .png extension (matches class/species defaults). */
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

async function encodeCardBatch(label, sourcesDir, outDir, width = CARD_WIDTH, height = CARD_HEIGHT) {
  console.log(`\n${label} → ${path.relative(ROOT, outDir)}/ (${width}×${height})`)
  fs.mkdirSync(outDir, { recursive: true })
  const entries = discoverCardSlugs(sourcesDir)
  if (entries.length === 0) {
    console.log("  − no sources (keeping existing outputs if any)")
    return 0
  }
  let missing = 0
  for (const [slug, input] of entries) {
    const output = path.join(outDir, `${slug}.png`)
    fs.mkdirSync(path.dirname(output), { recursive: true })
    try {
      const { inputMeta, outMeta, inputKb, outKb, action } = await encodeCardJpeg(
        input,
        output,
        width,
        height,
      )
      console.log(
        `  ${slug}.png  ${inputMeta.width}x${inputMeta.height} (${inputKb} KB) → ${outMeta.width}x${outMeta.height} (${outKb} KB) [${action}]`,
      )
    } catch (error) {
      console.error(`  ✗ ${slug}: ${error instanceof Error ? error.message : error}`)
      missing += 1
    }
  }
  return missing
}

fs.mkdirSync(PAGE_BG_OUT, { recursive: true })
fs.mkdirSync(HERO_OUT, { recursive: true })
fs.mkdirSync(FEATURE_OUT, { recursive: true })
fs.mkdirSync(SPLASH_OUT, { recursive: true })

let missing = 0

console.log("Page backgrounds → public/images/page-backgrounds/")
for (const [theme, basenames] of Object.entries(THEME_SOURCES)) {
  const input = resolveSourcePath(basenames)
  const output = path.join(PAGE_BG_OUT, `${theme}.webp`)
  if (!input) {
    console.log(`  − ${theme}: no source (keeping existing output if any)`)
    continue
  }

  const { inputMeta, outMeta, inputKb, outKb, action } = await encodeWebp(
    input,
    output,
    PAGE_BG_WIDTH,
    PAGE_BG_HEIGHT,
  )
  console.log(
    `  ${theme}.webp  ${inputMeta.width}x${inputMeta.height} (${inputKb} KB) → ${outMeta.width}x${outMeta.height} (${outKb} KB) [${action}]`,
  )
}

console.log("\nHero rotating → public/images/hero/")
for (const [basename, candidates] of Object.entries(HERO_SOURCES)) {
  const input = resolveSourcePath(candidates)
  const output = path.join(HERO_OUT, `${basename}.webp`)
  if (!input) {
    console.log(`  − ${basename}: no source (keeping existing output if any)`)
    continue
  }

  const { inputMeta, outMeta, inputKb, outKb, action } = await encodeWebp(
    input,
    output,
    HERO_WIDTH,
    HERO_HEIGHT,
  )
  console.log(
    `  ${basename}.webp  ${inputMeta.width}x${inputMeta.height} (${inputKb} KB) → ${outMeta.width}x${outMeta.height} (${outKb} KB) [${action}]`,
  )
}

console.log("\nFeature cards → public/images/features/")
for (const [basename, candidates] of Object.entries(FEATURE_SOURCES)) {
  const input = resolveSourcePath(candidates)
  const output = path.join(FEATURE_OUT, `${basename}.webp`)
  if (!input) {
    console.log(`  − ${basename}: no source (keeping existing output if any)`)
    continue
  }

  const { inputMeta, outMeta, inputKb, outKb, action } = await encodeWebp(
    input,
    output,
    FEATURE_WIDTH,
    FEATURE_HEIGHT,
  )
  console.log(
    `  ${basename}.webp  ${inputMeta.width}x${inputMeta.height} (${inputKb} KB) → ${outMeta.width}x${outMeta.height} (${outKb} KB) [${action}]`,
  )
}

console.log("\nWelcome splash → public/images/welcome-splash/")
for (const [basename, candidates] of Object.entries(SPLASH_SOURCES)) {
  const input = resolveSourcePath(candidates)
  const output = path.join(SPLASH_OUT, `${basename}.webp`)
  if (!input) {
    console.log(`  − ${basename}: no source (keeping existing output if any)`)
    continue
  }

  const { inputMeta, outMeta, inputKb, outKb, action } = await encodeWebp(
    input,
    output,
    SPLASH_WIDTH,
    SPLASH_HEIGHT,
  )
  console.log(
    `  ${basename}.webp  ${inputMeta.width}x${inputMeta.height} (${inputKb} KB) → ${outMeta.width}x${outMeta.height} (${outKb} KB) [${action}]`,
  )
}

console.log("\nREADME hero → public/images/features/")
const readmeHeroInput = resolveSourcePath(["hero", "readme-hero"])
if (readmeHeroInput) {
  const output = path.join(FEATURE_OUT, "hero.webp")
  const { inputMeta, outMeta, inputKb, outKb, action } = await encodeWebpFitInside(
    readmeHeroInput,
    output,
    README_HERO_MAX_WIDTH,
    README_HERO_MAX_HEIGHT,
  )
  console.log(
    `  hero.webp  ${inputMeta.width}x${inputMeta.height} (${inputKb} KB) → ${outMeta.width}x${outMeta.height} (${outKb} KB) [${action}]`,
  )
} else {
  console.log("  − hero: no source (keeping existing output if any)")
}

missing += await encodeCardBatch("Class card art", CLASS_CARD_SOURCES, CLASS_CARD_OUT)
missing += await encodeCardBatch("Subclass card art", SUBCLASS_CARD_SOURCES, SUBCLASS_CARD_OUT)
missing += await encodeCardBatch(
  "Background card art",
  BACKGROUND_CARD_SOURCES,
  BACKGROUND_CARD_OUT,
  BACKGROUND_CARD_WIDTH,
  BACKGROUND_CARD_HEIGHT,
)
missing += await encodeCardBatch("Species card art", SPECIES_CARD_SOURCES, SPECIES_CARD_OUT)
missing += await encodeCardBatch("Spell card art", SPELL_CARD_SOURCES, SPELL_CARD_OUT)

if (missing > 0) {
  process.exitCode = 1
}
