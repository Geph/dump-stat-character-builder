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
  hero("rotating-01.jpeg"),
  hero("rotating-02.jpeg"),
  hero("rotating-03.jpeg"),
  hero("rotating-04.jpeg"),
  hero("rotating-05.jpeg"),
  // Add rotating-06.jpeg (and list here) when you have a sixth hero image
] as const

export const LIBRARY_STATS_BACKGROUND = withBasePath("/images/backgrounds/library-stats.jpeg")

/**
 * Home page “Make Everything You Need” cards — full-width image on each card.
 * Drop replacements in public/images/features/ (same paths; JPEG/PNG/WebP OK if you update extensions here).
 */
export const FEATURE_CARD_IMAGES = {
  characterCreation: withBasePath("/images/features/character-creation.png"),
  compendium: withBasePath("/images/features/compendium.png"),
  importContent: withBasePath("/images/features/import-content.png"),
  characterSheet: withBasePath("/images/features/character-sheet.png"),
  appearance: withBasePath("/images/features/appearance.png"),
  exportDatabase: withBasePath("/images/features/export-database.png"),
} as const

/** Builder starting-equipment package cards (cinematic view edge art). */
export const STARTING_EQUIPMENT_CARD_IMAGES = {
  gear: withBasePath("/images/builder/starting-equipment-gear.png"),
  gold: withBasePath("/images/builder/starting-equipment-gold.png"),
} as const

/** Screenshot for GitHub README (repo root path, not Pages basePath) */
export const README_HERO_IMAGE = "/images/readme/hero.png"
