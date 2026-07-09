import fs from "node:fs"
import path from "node:path"
import sharp from "sharp"

const ROOT = path.resolve(import.meta.dirname, "..")
const ASSETS = process.env.PAGE_BG_SOURCES ?? path.join(ROOT, "scripts", "page-bg-sources")
const PAGE_BG_OUT = path.join(ROOT, "public", "images", "page-backgrounds")
const HERO_OUT = path.join(ROOT, "public", "images", "hero")
const FEATURE_OUT = path.join(ROOT, "public", "images", "features")
const SPLASH_OUT = path.join(ROOT, "public", "images", "welcome-splash")

const WEBP_QUALITY = Number(process.env.SITE_IMAGE_QUALITY ?? 85)

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

const EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"]

/** theme id → candidate source basenames (first match wins). */
const THEME_SOURCES = {
  parchment: ["parchment"],
  arcane: ["arcane"],
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

function resolveSourcePath(basenames) {
  for (const base of basenames) {
    for (const ext of EXTENSIONS) {
      const candidate = path.join(ASSETS, `${base}${ext}`)
      if (fs.existsSync(candidate)) return candidate
    }
  }
  return null
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
    console.error(`  ✗ ${theme}: missing ${basenames.join(" or ")}`)
    missing += 1
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
    console.error(`  ✗ ${basename}: missing ${candidates.join(" or ")}`)
    missing += 1
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
    console.error(`  ✗ ${basename}: missing ${candidates.join(" or ")}`)
    missing += 1
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

if (missing > 0) {
  process.exitCode = 1
}
