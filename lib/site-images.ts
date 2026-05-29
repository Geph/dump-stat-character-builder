/**
 * Site marketing and layout images served from /public/images/.
 * Add new files under public/images/ and reference them here.
 */

const hero = (name: string) => `/images/hero/${name}`

/** Hero backgrounds — one chosen at random on the home page */
export const HERO_ROTATING_IMAGES = [
  hero("rotating-01.jpeg"),
  hero("rotating-02.jpeg"),
  hero("rotating-03.jpeg"),
  hero("rotating-04.jpeg"),
  hero("rotating-05.jpeg"),
  // Add rotating-06.jpeg (and list here) when you have a sixth hero image
] as const

export const LIBRARY_STATS_BACKGROUND = "/images/backgrounds/library-stats.jpeg"

/** Screenshot for GitHub README (also under public/ for consistency) */
export const README_HERO_IMAGE = "/images/readme/hero.png"
