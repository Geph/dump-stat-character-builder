/**
 * Card art that may be committed / pushed: SRD, Kibbles Tasty, Mage Hand Press,
 * plus all species portraits (original graphics). Other setting backgrounds /
 * class art optimize locally and stay gitignored.
 */

const BUNDLED_CARD_SOURCE_ORIGINS = new Set([
  "srd",
  "srd cantrips",
  "kibbles",
  "kibbles tasty",
  "magehandpress",
  "mage-hand-press",
  "mage hand press",
  "mhp",
])

/** Parent-class folders whose entire subclass output tree is Kibbles (or future MHP). */
const BUNDLED_SUBCLASS_CLASS_FOLDERS = new Set(["inventor", "occultist", "psion", "warden"])

const BUNDLED_CLASS_FILES = new Set([
  "barbarian.png",
  "bard.png",
  "cleric.png",
  "druid.png",
  "fighter.png",
  "inventor.png",
  "monk.png",
  "occultist.png",
  "paladin.png",
  "psion.png",
  "ranger.png",
  "rogue.png",
  "sorcerer.png",
  "warden-kibbles.png",
  "warlock.png",
  "wizard.png",
])

const BUNDLED_BACKGROUND_FILES = new Set([
  "acolyte.png",
  "apothecary.png",
  "criminal.png",
  "engineer.png",
  "sage.png",
  "soldier.png",
  "tinker.png",
])

/** Nested `{class}/{slug}.png` for SRD subclasses (Kibbles class folders are allow-all). */
const BUNDLED_SUBCLASS_FILES = new Set([
  "barbarian/path-of-the-berserker.png",
  "bard/college-of-lore.png",
  "cleric/life-domain.png",
  "druid/circle-of-the-land.png",
  "fighter/champion.png",
  "monk/warrior-of-the-open-hand.png",
  "paladin/oath-of-devotion.png",
  "ranger/hunter.png",
  "rogue/gadgeteer.png",
  "rogue/thief.png",
  "sorcerer/draconic-sorcery.png",
  "warlock/fiend-patron.png",
  "wizard/evoker.png",
])

export function normalizeRepoPath(value) {
  return String(value ?? "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
}

export function isBundledCardSourceOrigin(originFolderName) {
  return BUNDLED_CARD_SOURCE_ORIGINS.has(String(originFolderName ?? "").trim().toLowerCase())
}

/**
 * First path segment under a `scripts/*-card-sources` tree, or empty when the file is flat.
 */
export function cardSourceOriginFromRelative(relativeFromSourcesRoot) {
  const rel = normalizeRepoPath(relativeFromSourcesRoot)
  if (!rel || rel.startsWith("..")) return ""
  const slash = rel.indexOf("/")
  if (slash < 0) return ""
  return rel.slice(0, slash)
}

export function isBundledPublicCardArtPath(repoRelative) {
  const n = normalizeRepoPath(repoRelative)
  const classes = n.match(/^public\/images\/compendium\/classes\/([^/]+)$/)
  if (classes) return BUNDLED_CLASS_FILES.has(classes[1])
  const backgrounds = n.match(/^public\/images\/compendium\/backgrounds\/([^/]+)$/)
  if (backgrounds) return BUNDLED_BACKGROUND_FILES.has(backgrounds[1])
  // All species portraits are original / safe to ship (not copyrighted book scans).
  if (n.startsWith("public/images/compendium/species/") && n.endsWith(".png")) return true
  const subclass = n.match(/^public\/images\/compendium\/subclasses\/(.+)$/)
  if (subclass) {
    const rest = subclass[1]
    const classFolder = rest.split("/")[0]
    if (BUNDLED_SUBCLASS_CLASS_FOLDERS.has(classFolder)) return rest.includes("/")
    return BUNDLED_SUBCLASS_FILES.has(rest)
  }
  // Spell masters currently live only under `kibbles/` and `srd cantrips/`.
  if (n.startsWith("public/images/compendium/spells/") && n.endsWith(".png")) return true
  return false
}

export function publicCardArtPathFromUrl(url) {
  const idx = String(url ?? "").indexOf("/images/")
  if (idx < 0) return null
  return `public${url.slice(idx)}`
}
