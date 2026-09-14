/**
 * Site marketing and layout images served from /public/images/.
 * Add new files under public/images/ and reference them here.
 *
 * Paths are prefixed with NEXT_PUBLIC_BASE_PATH for GitHub Pages static deploys.
 */

import { withBasePath } from "@/lib/config/deploy-mode"

const hero = (name: string) => withBasePath(`/images/hero/${name}`)

/** Hero backgrounds — one chosen at random on the home page */
export const HERO_ROTATING_IMAGES = [
  hero("rotating-01.webp"),
  hero("rotating-02.webp"),
  hero("rotating-03.webp"),
  hero("rotating-04.webp"),
  hero("rotating-05.webp"),
  hero("rotating-06.webp"),
] as const

export const LIBRARY_STATS_BACKGROUND = withBasePath("/images/backgrounds/library-stats.jpeg")

const sheetBanner = (name: string) => withBasePath(`/images/sheet-banners/${name}`)

/**
 * Stock character landscape banners for builder “Randomly generate” (visual mode).
 * Masters live in `scripts/sheet-banner-sources/`; run `pnpm images:optimize`.
 */
export const SHEET_BANNER_IMAGES = [
  sheetBanner("00-enchanted-wilderness.webp"),
  sheetBanner("01-eberron-rainy-sharn.webp"),
  sheetBanner("02-eberron-lightning-rail.webp"),
  sheetBanner("03-harbor-town.webp"),
  sheetBanner("04-arcane-metropolis.webp"),
  sheetBanner("05-airship-docks.webp"),
  sheetBanner("06-planar-crossroads.webp"),
  sheetBanner("06-wilderness-arctic.webp"),
  sheetBanner("07-wilderness-desert.webp"),
  sheetBanner("08-wilderness-swamp.webp"),
  sheetBanner("09-wilderness-alpine.webp"),
  sheetBanner("10-wilderness-volcanic.webp"),
  sheetBanner("11-wilderness-autumn.webp"),
  sheetBanner("12-dungeon-dwarven-forge.webp"),
  sheetBanner("13-dungeon-flooded-temple.webp"),
  sheetBanner("14-dungeon-underdark.webp"),
  sheetBanner("15-dungeon-clockwork-vault.webp"),
  sheetBanner("16-dungeon-royal-catacombs.webp"),
  sheetBanner("17-dungeon-ice-citadel.webp"),
  sheetBanner("18-jungle.webp"),
  sheetBanner("19-cityplane.webp"),
  sheetBanner("20-inventorland.webp"),
  sheetBanner("21-egypt.webp"),
  sheetBanner("22-floating-isles.webp"),
  sheetBanner("23-magic-uni.webp"),
  sheetBanner("24-art-deco.webp"),
  sheetBanner("25-more-jungle-ruins.webp"),
  sheetBanner("26-forgotten-dungeon.webp"),
  sheetBanner("27-mournland.webp"),
  sheetBanner("28-astral-voyage.webp"),
  sheetBanner("29-feathered-dinosaurs.webp"),
  sheetBanner("30-goblin-ruins.webp"),
] as const

/** Pick a stock sheet banner URL, or null when the list is empty. */
export function pickRandomSheetBannerUrl(
  images: readonly string[] = SHEET_BANNER_IMAGES,
): string | null {
  if (images.length === 0) return null
  return images[Math.floor(Math.random() * images.length)] ?? null
}

/**
 * Home page “Make Everything You Need” cards — full-width image on each card.
 * Drop replacements in public/images/features/ (same paths; JPEG/PNG/WebP OK if you update extensions here).
 */
export const FEATURE_CARD_IMAGES = {
  characterCreation: withBasePath("/images/features/character-creation.webp"),
  compendium: withBasePath("/images/features/compendium.webp"),
  importContent: withBasePath("/images/features/import-content.webp"),
  characterSheet: withBasePath("/images/features/character-sheet.webp"),
  appearance: withBasePath("/images/features/appearance.webp"),
  exportDatabase: withBasePath("/images/features/export-database.webp"),
} as const

/** Builder starting-equipment package cards (cinematic view edge art). */
export const STARTING_EQUIPMENT_CARD_IMAGES = {
  gear: withBasePath("/images/builder/starting-equipment-gear.png"),
  gold: withBasePath("/images/builder/starting-equipment-gold.png"),
} as const

/** GitHub README hero graphic (repo-relative path, not Pages basePath) */
export const README_HERO_IMAGE = "/images/features/readme-landing.png"
