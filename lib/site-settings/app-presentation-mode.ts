/** Splash choice: full visual experience vs compact text-only presentation. */
export type AppPresentationMode = "visual-compact" | "compact-only"

export const APP_PRESENTATION_MODE_STORAGE_KEY = "dumpstat:app-presentation-mode"

export const APP_PRESENTATION_MODE_CHANGE_EVENT = "dumpstat:app-presentation-mode-change"

export const DEFAULT_APP_PRESENTATION_MODE: AppPresentationMode = "visual-compact"

export function isAppPresentationMode(value: unknown): value is AppPresentationMode {
  return value === "visual-compact" || value === "compact-only"
}

export function getAppPresentationMode(): AppPresentationMode {
  if (typeof localStorage === "undefined") return DEFAULT_APP_PRESENTATION_MODE
  const stored = localStorage.getItem(APP_PRESENTATION_MODE_STORAGE_KEY)
  return isAppPresentationMode(stored) ? stored : DEFAULT_APP_PRESENTATION_MODE
}

export function setAppPresentationMode(mode: AppPresentationMode): void {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(APP_PRESENTATION_MODE_STORAGE_KEY, mode)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(APP_PRESENTATION_MODE_CHANGE_EVENT))
  }
}

export function isCompactOnlyPresentation(): boolean {
  return getAppPresentationMode() === "compact-only"
}

/** Compendium browse and editors suppress card art when compact-only. Visual/Compact layout is enforced separately via areBrowseCardImagesEnabled. */
export function areCompendiumImagesEnabled(): boolean {
  if (typeof window === "undefined") return true
  return !isCompactOnlyPresentation()
}

/**
 * Whether seed/import enrichment should write bundled default `card_image_url` values.
 * Compact Only (splash) opts out. Server routes can force this via `runWithBundledCardArtAssignment`.
 */
let bundledCardArtAssignmentOverride: boolean | null = null

export function shouldAssignBundledCardArt(): boolean {
  if (bundledCardArtAssignmentOverride != null) return bundledCardArtAssignmentOverride
  return areCompendiumImagesEnabled()
}

/** Run seed/import work with an explicit card-art assignment policy (for server routes). */
export function runWithBundledCardArtAssignment<T>(
  assignArt: boolean,
  fn: () => T,
): T {
  const previous = bundledCardArtAssignmentOverride
  bundledCardArtAssignmentOverride = assignArt
  try {
    return fn()
  } finally {
    bundledCardArtAssignmentOverride = previous
  }
}

/** Hero, page, and marketing surfaces use solid theme fills instead of photos. */
export function areDecorativeBackgroundImagesEnabled(): boolean {
  if (typeof window === "undefined") return true
  return !isCompactOnlyPresentation()
}
