/**
 * After optimizing spell cards: expand SRD bundled allowlists + defaults map.
 * Run: node scripts/sync-srd-spell-card-art.mjs
 */
import fs from "node:fs"
import path from "node:path"
import { kebabSlug } from "./card-source-layout.mjs"

const ROOT = path.resolve(import.meta.dirname, "..")
const SPELLS_OUT = path.join(ROOT, "public", "images", "compendium", "spells")
const SRD_SPELLS = JSON.parse(
  fs.readFileSync(path.join(ROOT, "lib", "srd", "seed-data", "spells.json"), "utf8"),
)

function loadSeedSpellNames(relJsonPath) {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(ROOT, relJsonPath), "utf8"))
    const rows = Array.isArray(raw) ? raw : (raw.spells ?? [])
    return rows
      .map((row) => (typeof row?.name === "string" ? row.name.trim() : ""))
      .filter(Boolean)
  } catch {
    return []
  }
}

const MHP_SPELL_NAMES = loadSeedSpellNames(
  "lib/seed-packs/mage-hand-press/magehandpress-spells.json",
)
const KIBBLES_SPELL_NAMES = [
  ...loadSeedSpellNames("lib/seed-packs/kibbles-tasty/kibbles-spells.json"),
  // Fallback empty if pack path differs — previous defaults still preserved below.
].filter(Boolean)

const existingPngs = new Set(
  fs.existsSync(SPELLS_OUT)
    ? fs.readdirSync(SPELLS_OUT).filter((name) => name.endsWith(".png"))
    : [],
)

/** Already-shipped cantrips that may sit outside the shorter seed list. */
const LEGACY_BUNDLED_CANTRIPS = [
  "acid-splash.png",
  "blade-ward.png",
  "booming-blade.png",
  "chill-touch.png",
  "control-flames.png",
  "create-bonfire.png",
  "dancing-lights.png",
  "druidcraft.png",
  "eldritch-blast.png",
  "elementalism.png",
  "fire-bolt.png",
  "friends.png",
  "frostbite.png",
  "green-flame-blade.png",
  "guidance.png",
  "gust.png",
  "infestation.png",
  "light.png",
  "lightning-lure.png",
  "mage-hand.png",
  "magic-stone.png",
  "mending.png",
  "message.png",
  "mind-sliver.png",
  "minor-illusion.png",
  "mold-earth.png",
  "poison-spray.png",
  "prestidigitation.png",
  "primal-savagery.png",
  "produce-flame.png",
  "ray-of-frost.png",
  "resistance.png",
  "sacred-flame.png",
  "shape-water.png",
  "shillelagh.png",
  "shocking-grasp.png",
  "sorcerous-burst.png",
  "spare-the-dying.png",
  "starry-wisp.png",
  "sword-burst.png",
  "thaumaturgy.png",
  "toll-the-dead.png",
  "true-strike.png",
  "vicious-mockery.png",
  "word-of-radiance.png",
]

const srdShipped = []
for (const spell of SRD_SPELLS) {
  const file = `${kebabSlug(spell.name)}.png`
  if (existingPngs.has(file)) srdShipped.push({ name: spell.name, file })
}

const bundledFiles = new Set([
  ...LEGACY_BUNDLED_CANTRIPS.filter((file) => existingPngs.has(file)),
  ...srdShipped.map((row) => row.file),
])
const bundledFileList = [...bundledFiles].sort((a, b) => a.localeCompare(b))

console.log(
  `SRD with art: ${srdShipped.length}/${SRD_SPELLS.length}; bundled PNG allowlist: ${bundledFileList.length}`,
)

function replaceBundledSpellSet(source, label) {
  const start = source.indexOf("const BUNDLED_SPELL_FILES = new Set([")
  if (start < 0) throw new Error(`BUNDLED_SPELL_FILES not found in ${label}`)
  const end = source.indexOf("])", start)
  if (end < 0) throw new Error(`BUNDLED_SPELL_FILES end not found in ${label}`)
  const body = bundledFileList.map((file) => `  "${file}",`).join("\n")
  return `${source.slice(0, start)}const BUNDLED_SPELL_FILES = new Set([\n${body}\n${source.slice(end)}`
}

function updateTsDefaults() {
  const filePath = path.join(ROOT, "lib", "compendium", "spell-card-images-defaults.ts")
  let source = fs.readFileSync(filePath, "utf8")
  const startMarker = "export const BUNDLED_SPELL_CARD_IMAGE_NAMES = ["
  const start = source.indexOf(startMarker)
  const end = source.indexOf("] as const", start)
  if (start < 0 || end < 0) throw new Error("BUNDLED_SPELL_CARD_IMAGE_NAMES block not found")

  const previousBlock = source.slice(start + startMarker.length, end)
  const previousNames = [...previousBlock.matchAll(/"((?:\\.|[^"\\])*)"/g)].map((m) =>
    JSON.parse(`"${m[1]}"`),
  )

  // Keep prior Kibbles / alias names; add every SRD name that has art.
  const merged = new Map()
  for (const name of previousNames) merged.set(name, true)
  for (const row of srdShipped) merged.set(row.name, true)

  // Prefer exact seed-pack spell names (Hex:abate, etc.) when the PNG slug matches.
  for (const name of [...MHP_SPELL_NAMES, ...KIBBLES_SPELL_NAMES]) {
    const file = `${kebabSlug(name)}.png`
    if (existingPngs.has(file)) merged.set(name, true)
  }

  // Local-only leftovers: Title Case from slug only when no seed name covered the file.
  const coveredSlugs = new Set(
    [...merged.keys()].map((name) => `${kebabSlug(name)}.png`),
  )
  for (const file of existingPngs) {
    if (coveredSlugs.has(file)) continue
    const slug = file.replace(/\.png$/i, "")
    if (!slug) continue
    const title = slug
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
    if (title) merged.set(title, true)
  }

  // Drop Title Case stand-ins that collide with a seed Hex:/apostrophe form for the same slug.
  const preferredBySlug = new Map()
  for (const name of merged.keys()) {
    const slug = kebabSlug(name)
    const prev = preferredBySlug.get(slug)
    if (!prev) {
      preferredBySlug.set(slug, name)
      continue
    }
    const score = (value) =>
      (value.includes(":") ? 4 : 0) +
      (/['\u2019]/.test(value) ? 2 : 0) +
      (/[a-z]/.test(value) ? 1 : 0)
    if (score(name) > score(prev)) preferredBySlug.set(slug, name)
  }
  for (const name of [...merged.keys()]) {
    const preferred = preferredBySlug.get(kebabSlug(name))
    if (preferred && preferred !== name) merged.delete(name)
  }

  // Prefer canonical SRD apostrophe forms when both exist.
  for (const row of srdShipped) {
    const ascii = row.name.replace(/\u2019/g, "'")
    if (ascii !== row.name && merged.has(ascii)) merged.delete(ascii)
  }

  const names = [...merged.keys()].sort((a, b) => a.localeCompare(b))
  const body = names.map((name) => `  ${JSON.stringify(name)},`).join("\n")
  source = `${source.slice(0, start)}${startMarker}\n${body}\n${source.slice(end)}`
  fs.writeFileSync(filePath, source)
  console.log(`Updated ${path.relative(ROOT, filePath)} (${names.length} names)`)
}

function updateGitignore() {
  const filePath = path.join(ROOT, ".gitignore")
  let source = fs.readFileSync(filePath, "utf8")
  const marker = "public/images/compendium/spells/*"
  const idx = source.indexOf(marker)
  if (idx < 0) throw new Error("spell gitignore marker not found")
  const lineEnd = source.indexOf("\n", idx)
  if (lineEnd < 0) throw new Error("spell gitignore line end not found")
  const after = lineEnd + 1
  let rest = source.slice(after)
  rest = rest.replace(/^(?:!public\/images\/compendium\/spells\/.+\r?\n)+/, "")
  const exceptions = bundledFileList
    .map((file) => `!public/images/compendium/spells/${file}`)
    .join("\n")
  source = `${source.slice(0, after)}${exceptions}\n${rest}`
  fs.writeFileSync(filePath, source)
  console.log(`Updated .gitignore with ${bundledFileList.length} spell un-ignores`)
}

for (const rel of ["scripts/bundled-card-art.mjs", "lib/compendium/bundled-card-art.ts"]) {
  const filePath = path.join(ROOT, rel)
  const next = replaceBundledSpellSet(fs.readFileSync(filePath, "utf8"), rel)
  fs.writeFileSync(filePath, next)
  console.log(`Updated ${rel}`)
}

updateTsDefaults()
updateGitignore()

const { isBundledPublicCardArtPath } = await import(`./bundled-card-art.mjs?ts=${Date.now()}`)
{
  const compendiumRoot = path.join(ROOT, "public", "images", "compendium")
  const paths = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
        continue
      }
      if (!/\.png$/i.test(entry.name)) continue
      const repoRel = path.relative(ROOT, full).replace(/\\/g, "/")
      if (isBundledPublicCardArtPath(repoRel)) continue
      paths.push(path.relative(compendiumRoot, full).replace(/\\/g, "/"))
    }
  }
  walk(compendiumRoot)
  paths.sort((a, b) => a.localeCompare(b))
  fs.writeFileSync(
    path.join(compendiumRoot, "local-available-card-art.json"),
    `${JSON.stringify({ generatedBy: "images:optimize", paths }, null, 2)}\n`,
  )
  console.log(`Rewrote local-available manifest (${paths.length} local-only)`)
}

const missing = SRD_SPELLS.filter((spell) => !existingPngs.has(`${kebabSlug(spell.name)}.png`)).map(
  (spell) => spell.name,
)
if (missing.length) {
  console.log(`SRD spells still without art (${missing.length}): ${missing.join(", ")}`)
}
