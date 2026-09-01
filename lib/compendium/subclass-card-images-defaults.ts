import {
  maybeFilterDefaultCardImageUrl,
  type DefaultCardImageAvailability,
} from "@/lib/compendium/available-card-art"
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
 * Masters live in origin folders under `scripts/subclass-card-sources`
 * (`PHB/Bard Dance.png`, `SRD/Cleric Life.png`, `kibbles/Psion Knowing.png`).
 * Output stays `{class-slug}/{subclass-slug}.png`.
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
  /** Filename slug under the class folder. */
  slug: string
}

const SUBCLASS_CARD_IMAGE_ENTRIES: SubclassCardImageEntry[] = [
  // SRD
  { className: "Barbarian", name: "Path of the Berserker", slug: "path-of-the-berserker" },
  { className: "Bard", name: "College of Lore", slug: "college-of-lore" },
  { className: "Cleric", name: "Life Domain", slug: "life-domain" },
  { className: "Druid", name: "Circle of the Land", slug: "circle-of-the-land" },
  { className: "Fighter", name: "Champion", slug: "champion" },
  { className: "Monk", name: "Warrior of the Open Hand", slug: "warrior-of-the-open-hand" },
  { className: "Paladin", name: "Oath of Devotion", slug: "oath-of-devotion" },
  { className: "Ranger", name: "Hunter", slug: "hunter" },
  { className: "Rogue", name: "Thief", slug: "thief" },
  { className: "Sorcerer", name: "Draconic Sorcery", slug: "draconic-sorcery" },
  { className: "Sorcerer", name: "Aberrant Sorcery", slug: "aberrant-sorcery" },
  { className: "Sorcerer", name: "Clockwork Sorcery", slug: "clockwork-sorcery" },
  { className: "Sorcerer", name: "Wild Magic Sorcery", slug: "wild-magic-sorcery" },
  { className: "Warlock", name: "Fiend Patron", slug: "fiend-patron" },
  { className: "Warlock", name: "Celestial Patron", slug: "celestial-patron" },
  { className: "Wizard", name: "Evoker", slug: "evoker" },

  // PHB
  { className: "Barbarian", name: "Path of the Wild Heart", slug: "path-of-the-wild-heart" },
  { className: "Barbarian", name: "Path of the World Tree", slug: "path-of-the-world-tree" },
  { className: "Barbarian", name: "Path of the Zealot", slug: "path-of-the-zealot" },
  { className: "Bard", name: "College of Dance", slug: "college-of-dance" },
  { className: "Bard", name: "College of Glamour", slug: "college-of-glamour" },
  { className: "Bard", name: "College of Valor", slug: "college-of-valor" },
  { className: "Cleric", name: "Light Domain", slug: "light-domain" },
  { className: "Cleric", name: "Trickery Domain", slug: "trickery-domain" },
  { className: "Cleric", name: "Trickster Domain", slug: "trickery-domain" },
  { className: "Cleric", name: "War Domain", slug: "war-domain" },
  { className: "Druid", name: "Circle of the Moon", slug: "circle-of-the-moon" },
  { className: "Druid", name: "Circle of the Sea", slug: "circle-of-the-sea" },
  { className: "Druid", name: "Circle of the Stars", slug: "circle-of-the-stars" },
  { className: "Fighter", name: "Battle Master", slug: "battle-master" },
  { className: "Fighter", name: "Eldritch Knight", slug: "eldritch-knight" },
  { className: "Fighter", name: "Psi Warrior", slug: "psi-warrior" },
  { className: "Monk", name: "Warrior of the Elements", slug: "warrior-of-the-elements" },
  { className: "Monk", name: "Warrior of Mercy", slug: "warrior-of-mercy" },
  { className: "Monk", name: "Warrior of Shadow", slug: "warrior-of-shadow" },
  { className: "Paladin", name: "Oath of the Ancients", slug: "oath-of-the-ancients" },
  { className: "Paladin", name: "Oath of Glory", slug: "oath-of-glory" },
  { className: "Paladin", name: "Oath of Vengeance", slug: "oath-of-vengeance" },
  { className: "Ranger", name: "Beast Master", slug: "beast-master" },
  { className: "Ranger", name: "Beastmaster", slug: "beast-master" },
  { className: "Ranger", name: "Fey Wanderer", slug: "fey-wanderer" },
  { className: "Ranger", name: "Gloom Stalker", slug: "gloom-stalker" },
  { className: "Rogue", name: "Assassin", slug: "assassin" },
  { className: "Rogue", name: "Arcane Trickster", slug: "arcane-trickster" },
  { className: "Rogue", name: "Soulknife", slug: "soulknife" },
  { className: "Rogue", name: "Soul Knife", slug: "soulknife" },

  // Heroes of Faerûn
  { className: "Bard", name: "College of the Moon", slug: "college-of-the-moon" },
  { className: "Cleric", name: "Knowledge Domain", slug: "knowledge-domain" },
  { className: "Fighter", name: "Banneret", slug: "banneret" },
  { className: "Paladin", name: "Oath of the Noble Genies", slug: "oath-of-the-noble-genies" },
  { className: "Ranger", name: "Winter Walker", slug: "winter-walker" },
  { className: "Rogue", name: "Scion of the Three", slug: "scion-of-the-three" },
  { className: "Sorcerer", name: "Spellfire Sorcery", slug: "spellfire-sorcery" },
  { className: "Wizard", name: "Bladesinging", slug: "bladesinging" },

  // Eberron
  { className: "Artificer", name: "Alchemist", slug: "alchemist" },
  { className: "Artificer", name: "Armorer", slug: "armorer" },
  { className: "Artificer", name: "Artillerist", slug: "artillerist" },
  { className: "Artificer", name: "Battle Smith", slug: "battle-smith" },
  { className: "Artificer", name: "Cartographer", slug: "cartographer" },
  { className: "Artificer", name: "Forge Adept", slug: "forge-adept" },
  { className: "Artificer", name: "Maverick", slug: "maverick" },
  { className: "Bard", name: "Dirge Singer", slug: "dirge-singer" },
  { className: "Cleric", name: "Mind Domain", slug: "mind-domain" },
  { className: "Druid", name: "Circle of the Forged", slug: "circle-of-the-forged" },
  { className: "Monk", name: "Warrior of the Living Weapon", slug: "warrior-of-the-living-weapon" },
  { className: "Monk", name: "Living Weapon", slug: "warrior-of-the-living-weapon" },

  // Arcana Unleashed
  { className: "Cleric", name: "Arcana Domain", slug: "arcana-domain" },
  { className: "Fighter", name: "Arcane Archer", slug: "arcane-archer" },
  { className: "Monk", name: "Mystic Arts", slug: "mystic-arts" },
  { className: "Monk", name: "Way of the Mystic Arts", slug: "mystic-arts" },
  { className: "Warlock", name: "Vestige Patron", slug: "vestige-patron" },
  { className: "Wizard", name: "Abjurer", slug: "abjurer" },
  { className: "Wizard", name: "Conjurer", slug: "conjurer" },
  { className: "Wizard", name: "Diviner", slug: "diviner" },
  { className: "Wizard", name: "Enchanter", slug: "enchanter" },
  { className: "Wizard", name: "Illusionist", slug: "illusionist" },
  { className: "Wizard", name: "Necromancer", slug: "necromancer" },
  { className: "Wizard", name: "Transmuter", slug: "transmuter" },

  // PHB patrons / schools (remaining)
  { className: "Warlock", name: "Archfey Patron", slug: "archfey-patron" },
  { className: "Warlock", name: "Arch Fey Patron", slug: "archfey-patron" },
  { className: "Warlock", name: "Great Old One Patron", slug: "great-old-one-patron" },

  // Ravenloft
  { className: "Artificer", name: "Reanimator", slug: "reanimator" },
  { className: "Bard", name: "College of Spirits", slug: "college-of-spirits" },
  { className: "Cleric", name: "Grave Domain", slug: "grave-domain" },
  { className: "Ranger", name: "Warden", slug: "warden" },
  { className: "Rogue", name: "Phantom", slug: "phantom" },
  { className: "Sorcerer", name: "Shadow Sorcery", slug: "shadow-sorcery" },
  { className: "Warlock", name: "Undead Patron", slug: "undead-patron" },

  // KibblesTasty Inventor
  { className: "Inventor", name: "Cursesmith", slug: "cursesmith" },
  { className: "Inventor", name: "Fleshsmith", slug: "fleshsmith" },
  { className: "Inventor", name: "Gadgetsmith", slug: "gadgetsmith" },
  { className: "Inventor", name: "Golemsmith", slug: "golemsmith" },
  { className: "Inventor", name: "Infusionsmith", slug: "infusionsmith" },
  { className: "Inventor", name: "Potionsmith", slug: "potionsmith" },
  { className: "Inventor", name: "Relicsmith", slug: "relicsmith" },
  { className: "Inventor", name: "Runesmith", slug: "runesmith" },
  { className: "Inventor", name: "Thundersmith", slug: "thundersmith" },
  { className: "Inventor", name: "Warsmith", slug: "warsmith" },

  // KibblesTasty Psion
  { className: "Psion", name: "Awakened Mind", slug: "awakened-mind" },
  { className: "Psion", name: "Consuming Mind", slug: "consuming-mind" },
  { className: "Psion", name: "Elemental Mind", slug: "elemental-mind" },
  { className: "Psion", name: "Knowing Mind", slug: "knowing-mind" },
  { className: "Psion", name: "Shaper's Mind", slug: "shapers-mind" },
  { className: "Psion", name: "Shaper’s Mind", slug: "shapers-mind" },
  { className: "Psion", name: "Transcended Mind", slug: "transcended-mind" },
  { className: "Psion", name: "Unleashed Mind", slug: "unleashed-mind" },
  { className: "Psion", name: "Wandering Mind", slug: "wandering-mind" },

  // KibblesTasty extras
  { className: "Rogue", name: "Gadgeteer", slug: "gadgeteer" },

  // KibblesTasty Occultist
  { className: "Occultist", name: "Hedge Mage", slug: "hedge-mage" },
  { className: "Occultist", name: "Oracle", slug: "oracle" },
  { className: "Occultist", name: "Shaman", slug: "shaman" },
  { className: "Occultist", name: "Spiritualist", slug: "spiritualist" },
  { className: "Occultist", name: "Voidwatcher", slug: "voidwatcher" },
  { className: "Occultist", name: "Witch", slug: "witch" },

  // KibblesTasty Warden
  { className: "Warden", name: "Astral Guardian", slug: "astral-guardian" },
  { className: "Warden", name: "Beasthide", slug: "beasthide" },
  { className: "Warden", name: "Bone Binder", slug: "bone-binder" },
  { className: "Warden", name: "Dreadwing", slug: "dreadwing" },
  { className: "Warden", name: "Dread Wing", slug: "dreadwing" },
  { className: "Warden", name: "Elderheart", slug: "elderheart" },
  { className: "Warden", name: "Elemental Soul", slug: "elemental-soul" },
  { className: "Warden", name: "Gravity Binder", slug: "gravity-binder" },
  { className: "Warden", name: "Ironbound", slug: "ironbound" },
  { className: "Warden", name: "Stoneblood", slug: "stoneblood" },
  { className: "Warden", name: "Sunwatcher", slug: "sunwatcher" },
  { className: "Warden", name: "Timetwister", slug: "timetwister" },
  { className: "Warden", name: "Time Twister", slug: "timetwister" },

  // Mage Hand Press Alchemist (local-only portraits)
  { className: "Alchemist", name: "Amorist", slug: "amorist" },
  { className: "Alchemist", name: "Apothecary", slug: "apothecary" },
  { className: "Alchemist", name: "Dynamo Engineer", slug: "dynamo-engineer" },
  { className: "Alchemist", name: "Mutagenist", slug: "mutagenist" },
  { className: "Alchemist", name: "Ooze Rancher", slug: "ooze-rancher" },
  { className: "Alchemist", name: "Slime Rancher", slug: "ooze-rancher" },
  { className: "Alchemist", name: "Venomsmith", slug: "venomsmith" },
  { className: "Alchemist", name: "Xenoalchemist", slug: "xenoalchemist" },
]

export function subclassCardImageLookupKey(className: string, subclassName: string): string {
  return `${className.trim()}::${subclassName.trim()}`
}

/**
 * Seed/import may rename colliding classes (`Warden (Kibbles Tasty)`).
 * Mage Hand Press Warden must not receive Kibbles bond art.
 */
export function subclassCardParentClassMatches(actual: string, mapped: string): boolean {
  const a = actual.trim()
  const m = mapped.trim()
  if (!a || !m) return false
  if (a.toLowerCase() === m.toLowerCase()) return true
  if (/\bwarden\b/i.test(m) && /\bmage\s*hand|\bmhp\b/i.test(a)) return false
  if (/\bwarden\b/i.test(a) && /\bmage\s*hand|\bmhp\b/i.test(m)) return false
  const an = a.toLowerCase()
  const mn = m.toLowerCase()
  if (an.startsWith(`${mn} (`) || an.startsWith(`${mn} `)) return true
  if (mn.startsWith(`${an} (`) || mn.startsWith(`${an} `)) return true
  if (an.endsWith(` ${mn}`) || mn.endsWith(` ${an}`)) return true
  return false
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
  options?: DefaultCardImageAvailability,
): string | null {
  const trimmed = subclassName.trim()
  if (!trimmed) return null

  let resolved: string | null = null
  const cls = className?.trim()
  if (cls) {
    const lowerKey = subclassCardImageLookupKey(cls, trimmed).toLowerCase()
    for (const [key, url] of Object.entries(SUBCLASS_CARD_IMAGES_BY_CLASS_AND_NAME)) {
      if (key.toLowerCase() === lowerKey) {
        resolved = url
        break
      }
    }
    if (!resolved) {
      const lowerName = trimmed.toLowerCase()
      for (const [key, url] of Object.entries(SUBCLASS_CARD_IMAGES_BY_CLASS_AND_NAME)) {
        const sep = key.indexOf("::")
        if (sep < 0) continue
        const mappedClass = key.slice(0, sep)
        const mappedName = key.slice(sep + 2)
        if (mappedName.toLowerCase() === lowerName && subclassCardParentClassMatches(cls, mappedClass)) {
          resolved = url
          break
        }
      }
    }
  } else {
    resolved = SRD_SUBCLASS_CARD_IMAGES_BY_NAME[trimmed] ?? null
  }

  return maybeFilterDefaultCardImageUrl(resolved, options?.requireAvailable !== false)
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

/** Pre-nesting bundled URL: `/images/compendium/subclasses/{slug}.png` (no class folder). */
export function isLegacyFlatSubclassCardImagePath(url: string): boolean {
  return /\/images\/compendium\/subclasses\/[^/]+\.png$/i.test(url.trim())
}

/**
 * First PHB drop used the filename remainder as the output slug (`cleric/light.png`).
 * Canonical files now use the full display-name slug (`cleric/light-domain.png`).
 */
const SHORT_NESTED_SUBCLASS_SLUG_ALIASES: Record<string, string> = {
  "cleric/arcana": "cleric/arcana-domain",
  "cleric/grave": "cleric/grave-domain",
  "cleric/knowledge": "cleric/knowledge-domain",
  "cleric/light": "cleric/light-domain",
  "cleric/mind": "cleric/mind-domain",
  "cleric/trickery": "cleric/trickery-domain",
  "cleric/trickster": "cleric/trickery-domain",
  "cleric/war": "cleric/war-domain",
  "druid/forged": "druid/circle-of-the-forged",
  "druid/moon": "druid/circle-of-the-moon",
  "druid/sea": "druid/circle-of-the-sea",
  "druid/stars": "druid/circle-of-the-stars",
}

/**
 * Rewrite stale flat subclass card URLs to `{class}/{slug}` paths after the nesting migration.
 * Returns null when the flat file no longer exists and no nested mapping is known.
 */
export function rewriteLegacyFlatSubclassCardImageUrl(
  url: string | null | undefined,
  subclassName?: string | null,
  className?: string | null,
): string | null {
  const existing = normalizeCardImageUrl(url)
  if (!existing) return null

  const nested = existing.match(/\/images\/compendium\/subclasses\/([^/]+\/[^/]+)\.png$/i)
  const nestedAlias = nested?.[1] ? SHORT_NESTED_SUBCLASS_SLUG_ALIASES[nested[1].toLowerCase()] : null
  if (nestedAlias) {
    return withBasePath(`/images/compendium/subclasses/${nestedAlias}.png`)
  }

  if (!isLegacyFlatSubclassCardImagePath(existing)) return existing

  const fromClass = defaultSubclassCardImageUrl(String(subclassName ?? ""), className)
  if (fromClass) return fromClass

  const fromNameOnly = defaultSubclassCardImageUrl(String(subclassName ?? ""))
  if (fromNameOnly) return fromNameOnly

  const match = existing.match(/\/images\/compendium\/subclasses\/([^/]+)\.png$/i)
  const slug = match?.[1]?.toLowerCase()
  if (!slug) return null
  for (const entry of SUBCLASS_CARD_IMAGE_ENTRIES) {
    if (entry.slug === slug) return subclassCardImage(entry.className, entry.slug)
  }
  return null
}
