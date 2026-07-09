import type { AppThemeId } from "@/lib/themes/app-themes"
import { withBasePath } from "@/lib/config/deploy-mode"

const themePageBackground = (themeId: AppThemeId) =>
  withBasePath(`/images/page-backgrounds/${themeId}.webp`)

/**
 * Bundled page-background art per color theme (2:3 portrait).
 * Place files under `public/images/page-backgrounds/{theme}.webp` and set paths here.
 */
export const THEME_PAGE_BACKGROUND_ASSETS: Record<AppThemeId, string | null> = {
  parchment: themePageBackground("parchment"),
  arcane: themePageBackground("arcane"),
  stone: themePageBackground("stone"),
  moss: themePageBackground("moss"),
  sands: themePageBackground("sands"),
}

export function getThemePageBackgroundAsset(themeId: AppThemeId): string | null {
  return THEME_PAGE_BACKGROUND_ASSETS[themeId]
}

export function themePageBackgroundAssetPath(themeId: AppThemeId): string {
  return themePageBackground(themeId)
}
