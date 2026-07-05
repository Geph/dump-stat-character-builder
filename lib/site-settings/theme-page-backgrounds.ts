import type { AppThemeId } from "@/lib/themes/app-themes"

/**
 * Bundled page-background art per color theme (2:3 portrait).
 * Place files under `public/images/page-backgrounds/{theme}.webp` and set paths here.
 */
export const THEME_PAGE_BACKGROUND_ASSETS: Record<AppThemeId, string | null> = {
  parchment: "/images/page-backgrounds/parchment.png",
  arcane: "/images/page-backgrounds/arcane.png",
  stone: "/images/page-backgrounds/stone.png",
  moss: "/images/page-backgrounds/moss.png",
  sands: "/images/page-backgrounds/sands.png",
}

export function getThemePageBackgroundAsset(themeId: AppThemeId): string | null {
  return THEME_PAGE_BACKGROUND_ASSETS[themeId]
}

export function themePageBackgroundAssetPath(themeId: AppThemeId): string {
  return `/images/page-backgrounds/${themeId}.png`
}
