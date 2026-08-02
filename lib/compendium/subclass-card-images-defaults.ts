import { withBasePath } from "@/lib/config/deploy-mode"
import {
  isHostedDumpstatCardImageUrl,
  isBundledCompendiumCardImagePath,
  normalizeCardImageUrl,
} from "@/lib/compendium/card-image"
import { shouldAssignBundledCardArt } from "@/lib/site-settings/app-presentation-mode"

/**
 * Default card art for subclasses — files live under
 * `public/images/compendium/subclasses/{class-slug}/{subclass-slug}.png`
 * so same-named subclasses from different parent classes do not collide
 * (e.g. Artificer Reanimator vs Necromancer Reanimator).
 *
 * Masters: `scripts/subclass-card-sources/{class-slug}/{subclass-slug}.*`
 */

export function subclassClassSlug(className: string): string {
  return className
    .trim()
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/\s+/g, "-")
}

const subclassCardImage = (className: string, itemSlug: string) =>
  withBasePath(
    `/images/compendium/subclasses/${subclassClassSlug(className)}/${itemSlug}.png`,
  )

type SubclassCardImageEntry = {
  className: string
  name: string
  /** Filename slug under the class folder (may differ from kebab name, e.g. shadow-magic). */
  slug: string
}

const SUBCLASS_CARD_IMAGE_ENTRIES: SubclassCardImageEntry[] = [
  // Artificer (Eberron + Ravenloft)
  { className: "Artificer", name: "Alchemist", slug: "alchemist" },
  { className: "Artificer", name: "Armorer", slug: "armorer" },
  { className: "Artificer", name: "Artillerist", slug: "artillerist" },
  { className: "Artificer", name: "Battle Smith", slug: "battle-smith" },
  { className: "Artificer", name: "Cartographer", slug: "cartographer" },
  { className: "Artificer", name: "Reanimator", slug: "reanimator" },

  // Inventor (KibblesTasty)
  { className: "Inventor", name: "Fleshsmith", slug: "fleshsmith" },
  { className: "Inventor", name: "Gadgetsmith", slug: "gadgetsmith" },
  { className: "Inventor", name: "Golemsmith", slug: "golemsmith" },
  { className: "Inventor", name: "Infusionsmith", slug: "infusionsmith" },
  { className: "Inventor", name: "Potionsmith", slug: "potionsmith" },
  { className: "Inventor", name: "Runesmith", slug: "runesmith" },
  { className: "Inventor", name: "Thundersmith", slug: "thundersmith" },
  { className: "Inventor", name: "Warsmith", slug: "warsmith" },

  // Barbarian
  { className: "Barbarian", name: "Path of the Berserker", slug: "path-of-the-berserker" },
  { className: "Barbarian", name: "Path of the Wild Heart", slug: "path-of-the-wild-heart" },
  { className: "Barbarian", name: "Path of the World Tree", slug: "path-of-the-world-tree" },
  { className: "Barbarian", name: "Path of the Zealot", slug: "path-of-the-zealot" },

  // Bard
  { className: "Bard", name: "College of Dance", slug: "college-of-dance" },
  { className: "Bard", name: "College of Glamour", slug: "college-of-glamour" },
  { className: "Bard", name: "College of Lore", slug: "college-of-lore" },
  { className: "Bard", name: "College of Spirits", slug: "college-of-spirits" },
  { className: "Bard", name: "College of the Moon", slug: "college-of-the-moon" },
  { className: "Bard", name: "College of Valor", slug: "college-of-valor" },

  // Cleric
  { className: "Cleric", name: "Grave Domain", slug: "grave-domain" },
  { className: "Cleric", name: "Knowledge Domain", slug: "knowledge-domain" },
  { className: "Cleric", name: "Life Domain", slug: "life-domain" },
  { className: "Cleric", name: "Light Domain", slug: "light-domain" },
  { className: "Cleric", name: "Trickery Domain", slug: "trickery-domain" },
  { className: "Cleric", name: "War Domain", slug: "war-domain" },

  // Druid
  { className: "Druid", name: "Circle of the Land", slug: "circle-of-the-land" },
  { className: "Druid", name: "Circle of the Moon", slug: "circle-of-the-moon" },
  { className: "Druid", name: "Circle of the Sea", slug: "circle-of-the-sea" },
  { className: "Druid", name: "Circle of the Stars", slug: "circle-of-the-stars" },

  // Fighter
  { className: "Fighter", name: "Banneret", slug: "banneret" },
  { className: "Fighter", name: "Battle Master", slug: "battle-master" },
  { className: "Fighter", name: "Champion", slug: "champion" },
  { className: "Fighter", name: "Eldritch Knight", slug: "eldritch-knight" },
  { className: "Fighter", name: "Psi Warrior", slug: "psi-warrior" },

  // Monk
  { className: "Monk", name: "Warrior of Mercy", slug: "warrior-of-mercy" },
  { className: "Monk", name: "Warrior of Shadow", slug: "warrior-of-shadow" },
  { className: "Monk", name: "Warrior of the Elements", slug: "warrior-of-the-elements" },
  { className: "Monk", name: "Warrior of the Open Hand", slug: "warrior-of-the-open-hand" },

  // Paladin
  { className: "Paladin", name: "Oath of Devotion", slug: "oath-of-devotion" },
  { className: "Paladin", name: "Oath of Glory", slug: "oath-of-glory" },
  { className: "Paladin", name: "Oath of the Ancients", slug: "oath-of-the-ancients" },
  { className: "Paladin", name: "Oath of the Noble Genies", slug: "oath-of-the-noble-genies" },
  { className: "Paladin", name: "Oath of Vengeance", slug: "oath-of-vengeance" },

  // Ranger
  { className: "Ranger", name: "Beast Master", slug: "beast-master" },
  { className: "Ranger", name: "Fey Wanderer", slug: "fey-wanderer" },
  { className: "Ranger", name: "Gloom Stalker", slug: "gloom-stalker" },
  { className: "Ranger", name: "Hollow Warden", slug: "hollow-warden" },
  { className: "Ranger", name: "Hunter", slug: "hunter" },
  { className: "Ranger", name: "Winter Walker", slug: "winter-walker" },

  // Rogue
  { className: "Rogue", name: "Arcane Trickster", slug: "arcane-trickster" },
  { className: "Rogue", name: "Assassin", slug: "assassin" },
  { className: "Rogue", name: "Gadgeteer", slug: "gadgeteer" },
  { className: "Rogue", name: "Phantom", slug: "phantom" },
  { className: "Rogue", name: "Scion of the Three", slug: "scion-of-the-three" },
  { className: "Rogue", name: "Soulknife", slug: "soulknife" },
  { className: "Rogue", name: "Thief", slug: "thief" },

  // Sorcerer
  { className: "Sorcerer", name: "Aberrant Sorcery", slug: "aberrant-sorcery" },
  { className: "Sorcerer", name: "Clockwork Sorcery", slug: "clockwork-sorcery" },
  { className: "Sorcerer", name: "Draconic Sorcery", slug: "draconic-sorcery" },
  { className: "Sorcerer", name: "Shadow Sorcery", slug: "shadow-magic" },
  { className: "Sorcerer", name: "Spellfire Sorcery", slug: "spellfire-sorcery" },
  { className: "Sorcerer", name: "Wild Magic Sorcery", slug: "wild-magic-sorcery" },

  // Warlock
  { className: "Warlock", name: "Archfey Patron", slug: "archfey-patron" },
  { className: "Warlock", name: "Celestial Patron", slug: "celestial-patron" },
  { className: "Warlock", name: "Fiend Patron", slug: "fiend-patron" },
  { className: "Warlock", name: "Great Old One Patron", slug: "great-old-one-patron" },
  { className: "Warlock", name: "Undead Patron", slug: "undead-patron" },

  // Wizard
  { className: "Wizard", name: "Abjurer", slug: "abjurer" },
  { className: "Wizard", name: "Bladesinger", slug: "bladesinger" },
  { className: "Wizard", name: "Diviner", slug: "diviner" },
  { className: "Wizard", name: "Evoker", slug: "evoker" },
  { className: "Wizard", name: "Illusionist", slug: "illusionist" },

  // KibblesTasty Psion
  { className: "Psion", name: "Awakened Mind", slug: "awakened-mind" },
  { className: "Psion", name: "Consuming Mind", slug: "consuming-mind" },
  { className: "Psion", name: "Elemental Mind", slug: "elemental-mind" },
  { className: "Psion", name: "Knowing Mind", slug: "knowing-mind" },
  { className: "Psion", name: "Shaper's Mind", slug: "shapers-mind" },
  { className: "Psion", name: "Shaper’s Mind", slug: "shapers-mind" }, // curly apostrophe
  { className: "Psion", name: "Transcended Mind", slug: "transcended-mind" },
  { className: "Psion", name: "Unleashed Mind", slug: "unleashed-mind" },
  { className: "Psion", name: "Wandering Mind", slug: "wandering-mind" },
]

export function subclassCardImageLookupKey(className: string, subclassName: string): string {
  return `${className.trim()}::${subclassName.trim()}`
}

/** Keyed `ClassName::SubclassName` → bundled URL. */
export const SUBCLASS_CARD_IMAGES_BY_CLASS_AND_NAME: Record<string, string> = Object.fromEntries(
  SUBCLASS_CARD_IMAGE_ENTRIES.map((entry) => [
    subclassCardImageLookupKey(entry.className, entry.name),
    subclassCardImage(entry.className, entry.slug),
  ]),
)

/**
 * Name-only map for unique subclass names (legacy / tests).
 * Ambiguous names like Reanimator are omitted — use class-aware lookup.
 */
export const SRD_SUBCLASS_CARD_IMAGES_BY_NAME: Record<string, string> = (() => {
  const byName = new Map<string, string[]>()
  for (const entry of SUBCLASS_CARD_IMAGE_ENTRIES) {
    const url = subclassCardImage(entry.className, entry.slug)
    const list = byName.get(entry.name) ?? []
    if (!list.includes(url)) list.push(url)
    byName.set(entry.name, list)
  }
  const unique: Record<string, string> = {}
  for (const [name, urls] of byName) {
    if (urls.length === 1) unique[name] = urls[0]!
  }
  return unique
})()

export function defaultSubclassCardImageUrl(
  subclassName: string,
  className?: string | null,
): string | null {
  const trimmed = subclassName.trim()
  if (!trimmed) return null

  const cls = className?.trim()
  if (cls) {
    const lowerKey = subclassCardImageLookupKey(cls, trimmed).toLowerCase()
    for (const [key, url] of Object.entries(SUBCLASS_CARD_IMAGES_BY_CLASS_AND_NAME)) {
      if (key.toLowerCase() === lowerKey) return url
    }
    return null
  }

  return SRD_SUBCLASS_CARD_IMAGES_BY_NAME[trimmed] ?? null
}

function isUpgradeableDefaultCardImage(url: string): boolean {
  return isBundledCompendiumCardImagePath(url) || isHostedDumpstatCardImageUrl(url)
}

/** Apply bundled subclass card art using parent class + name (avoids cross-class collisions). */
export function applyBundledSubclassCardImage(
  row: Record<string, unknown>,
  parentClassName: string,
): Record<string, unknown> {
  const existing = normalizeCardImageUrl(row.card_image_url)
  if (!shouldAssignBundledCardArt()) {
    if (existing && isUpgradeableDefaultCardImage(existing)) {
      return { ...row, card_image_url: null }
    }
    return existing ? { ...row, card_image_url: existing } : row
  }

  const card_image_url = defaultSubclassCardImageUrl(String(row.name ?? ""), parentClassName)
  if (existing && !isUpgradeableDefaultCardImage(existing)) {
    return { ...row, card_image_url: existing }
  }
  if (card_image_url) return { ...row, card_image_url }
  if (existing && isHostedDumpstatCardImageUrl(existing)) {
    return { ...row, card_image_url: null }
  }
  // Clear stale flat bundled paths that no longer match this class (e.g. wrong Reanimator).
  if (existing && isBundledCompendiumCardImagePath(existing)) {
    return { ...row, card_image_url: null }
  }
  return existing ? { ...row, card_image_url: existing } : row
}

/** Relative paths under subclasses/ for every mapped image (for migrate/optimize tests). */
export function listSubclassCardImageRelativePaths(): string[] {
  return [
    ...new Set(
      SUBCLASS_CARD_IMAGE_ENTRIES.map(
        (entry) => `${subclassClassSlug(entry.className)}/${entry.slug}.png`,
      ),
    ),
  ].sort()
}
