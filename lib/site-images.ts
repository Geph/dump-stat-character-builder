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
] as const

export const LIBRARY_STATS_BACKGROUND = withBasePath("/images/backgrounds/library-stats.jpeg")

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
export const README_HERO_IMAGE = "/images/features/hero.webp"
