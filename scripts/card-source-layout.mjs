/** Shared source-layout helpers for scripts/optimize-site-images.mjs */

export function kebabSlug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** Strip Drive duplicate suffixes like "Dragonborn (1)". */
export function stripCopySuffix(basename) {
  return String(basename ?? "")
    .replace(/\s*\(\d+\)\s*$/u, "")
    .trim()
}

export const CARD_OUTPUT_SLUG_ALIASES = {
  "aasimar-2024": "aasimar",
  "changeling-2024": "changeling",
  archeaeologist: "archaeologist",
  "house-thurani-heir": "house-thuranni-heir",
  "house-tharashk": "house-tharashk-heir",
  "gate-guardian": "gate-warden",
  "dhakanni-golindar": "dhakaani-golindar",
}

export const SPELL_CARD_OUTPUT_SLUG_ALIASES = {
  "beam-of-annhilation": "beam-of-annihilation",
  "dancing-object": "dancing-object-animate-object",
  "terrific-transposition": "trarys-terrific-transposition",
  "sapre-the-dying": "spare-the-dying",
}

export function spellCardSourceToSlug(basename) {
  return kebabSlug(basename)
}

/**
 * Parse spell card masters like "Mutate 2.png" / "Repair Front.png".
 * Trailing version numbers collapse to one slug; higher version wins.
 */
export function parseSpellCardSourceBase(base) {
  let stem = String(base ?? "")
    .replace(/\s+Front$/i, "")
    .trim()
  let version = 0
  const versionMatch = stem.match(/^(.*?)(?:\s+|-)(\d+)$/)
  if (versionMatch) {
    stem = versionMatch[1].trim()
    version = Number(versionMatch[2])
  }
  const slug = spellCardSourceToSlug(stem)
  const outputSlug = SPELL_CARD_OUTPUT_SLUG_ALIASES[slug] ?? slug
  return { outputSlug, version }
}

const CLASS_PREFIXES = [
  "Artificer",
  "Inventor",
  "Occultist",
  "Barbarian",
  "Paladin",
  "Sorcerer",
  "Warlock",
  "Fighter",
  "Ranger",
  "Cleric",
  "Druid",
  "Wizard",
  "Monk",
  "Rogue",
  "Bard",
  "Psion",
  "Warden",
  "Necromancer",
].sort((a, b) => b.length - a.length)

/** Short filename remainder → official display name, keyed by class. */
const SUBCLASS_SHORT_TO_DISPLAY = {
  Barbarian: {
    Berserker: "Path of the Berserker",
    "Wild Heart": "Path of the Wild Heart",
    "World Tree": "Path of the World Tree",
    Zealot: "Path of the Zealot",
  },
  Bard: {
    Lore: "College of Lore",
    Dance: "College of Dance",
    Glamour: "College of Glamour",
    Valor: "College of Valor",
  },
  Cleric: {
    Life: "Life Domain",
    Light: "Light Domain",
    Trickery: "Trickery Domain",
    War: "War Domain",
    Arcana: "Arcana Domain",
    Grave: "Grave Domain",
    Knowledge: "Knowledge Domain",
    Mind: "Mind Domain",
  },
  Druid: {
    Land: "Circle of the Land",
    Moon: "Circle of the Moon",
    Sea: "Circle of the Sea",
    Stars: "Circle of the Stars",
    Forged: "Circle of the Forged",
  },
  Monk: {
    "Open Hand": "Warrior of the Open Hand",
    Elements: "Warrior of the Elements",
    Mercy: "Warrior of Mercy",
    Shadow: "Warrior of Shadow",
    "Living Weapon": "Warrior of the Living Weapon",
    "Mystric Arts": "Mystic Arts",
    "Mystic Arts": "Mystic Arts",
  },
  Paladin: {
    Devotion: "Oath of Devotion",
  },
  Sorcerer: {
    Draconic: "Draconic Sorcery",
  },
  Warlock: {
    Fiend: "Fiend Patron",
  },
  Psion: {
    Awakened: "Awakened Mind",
    Consuming: "Consuming Mind",
    Elemental: "Elemental Mind",
    Knowing: "Knowing Mind",
    Shapers: "Shaper's Mind",
    Transcended: "Transcended Mind",
    Unleashed: "Unleashed Mind",
    Wandering: "Wandering Mind",
  },
}

export function subclassClassSlug(className) {
  return kebabSlug(className)
}

export function subclassItemSlug(displayName) {
  return kebabSlug(displayName)
}

export function parseSubclassSourceBasename(basename) {
  const trimmed = String(basename ?? "").trim()
  if (!trimmed) return null
  const prefix = CLASS_PREFIXES.find(
    (name) =>
      trimmed === name ||
      trimmed.startsWith(`${name} `) ||
      trimmed.toLowerCase().startsWith(`${name.toLowerCase()} `),
  )
  if (!prefix) return null
  const remainder = trimmed.slice(prefix.length).trim()
  if (!remainder) return null
  const display =
    SUBCLASS_SHORT_TO_DISPLAY[prefix]?.[remainder] ??
    SUBCLASS_SHORT_TO_DISPLAY[prefix]?.[
      Object.keys(SUBCLASS_SHORT_TO_DISPLAY[prefix] ?? {}).find(
        (key) => key.toLowerCase() === remainder.toLowerCase(),
      ) ?? ""
    ] ??
    remainder
  return {
    className: prefix,
    displayName: display,
    classSlug: subclassClassSlug(prefix),
    itemSlug: subclassItemSlug(display),
  }
}

export function flattenSourceBasenameToSlug(basename) {
  const stripped = stripCopySuffix(basename)
  const raw = kebabSlug(stripped)
  return CARD_OUTPUT_SLUG_ALIASES[raw] ?? raw
}
