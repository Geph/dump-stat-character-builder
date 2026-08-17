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
 * Only ship art that was converted from `scripts/graphics` (SRD uploads,
 * PHB Barbarian subclasses placed there on purpose) plus Kibbles / Mage Hand Press.
 * Do not map PHB / Eberron / Ravenloft / FRUA product art.
 *
 * Masters for a re-optimize: `scripts/subclass-card-sources/{class-slug}/{subclass-slug}.*`
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
  // SRD — scripts/graphics/subclass card images/SRD
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
  { className: "Warlock", name: "Fiend Patron", slug: "fiend-patron" },

  // PHB Barbarian — converted from scripts/graphics/subclass card images/PHB
  { className: "Barbarian", name: "Path of the Wild Heart", slug: "path-of-the-wild-heart" },
  { className: "Barbarian", name: "Path of the World Tree", slug: "path-of-the-world-tree" },
  { className: "Barbarian", name: "Path of the Zealot", slug: "path-of-the-zealot" },

  // KibblesTasty Inventor
  { className: "Inventor", name: "Fleshsmith", slug: "fleshsmith" },
  { className: "Inventor", name: "Gadgetsmith", slug: "gadgetsmith" },
  { className: "Inventor", name: "Golemsmith", slug: "golemsmith" },
  { className: "Inventor", name: "Infusionsmith", slug: "infusionsmith" },
  { className: "Inventor", name: "Potionsmith", slug: "potionsmith" },
  { className: "Inventor", name: "Runesmith", slug: "runesmith" },
  { className: "Inventor", name: "Thundersmith", slug: "thundersmith" },
  { className: "Inventor", name: "Warsmith", slug: "warsmith" },

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

  // KibblesTasty extras
  { className: "Rogue", name: "Gadgeteer", slug: "gadgeteer" },
  { className: "Wizard", name: "Evoker", slug: "evoker" },
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

/** Pre-nesting bundled URL: `/images/compendium/subclasses/{slug}.png` (no class folder). */
export function isLegacyFlatSubclassCardImagePath(url: string): boolean {
  return /\/images\/compendium\/subclasses\/[^/]+\.png$/i.test(url.trim())
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
