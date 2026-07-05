import type { AppThemeId } from "@/lib/themes/app-themes"
import { getThemePageBackgroundAsset } from "@/lib/site-settings/theme-page-backgrounds"

/** Custom full-page background graphic (stored in localStorage as a data URL). */

export const PAGE_BG_STORAGE_KEY = "dumpstat:page-background"

export const PAGE_BG_CHANGE_EVENT = "dumpstat:page-background-change"

/** Set on `<html>` while a page background (custom or theme default) is active. */
export const PAGE_BG_ACTIVE_ATTR = "data-page-background"

/** Portrait tile — 2:3 width:height. */
export const PAGE_BG_ASPECT_LABEL = "2:3 portrait"

export const PAGE_BG_RECOMMENDED_WIDTH = 1200

export const PAGE_BG_RECOMMENDED_HEIGHT = 1800

export const MAX_PAGE_BG_FILE_BYTES = 4 * 1024 * 1024

export const MAX_PAGE_BG_FILE_MB = 4

export const MAX_PAGE_BG_DATA_URL_LENGTH =
  Math.ceil(MAX_PAGE_BG_FILE_BYTES * (4 / 3)) + 128

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

export function formatPageBackgroundUploadHint(): string {
  return `${PAGE_BG_ASPECT_LABEL} · ${PAGE_BG_RECOMMENDED_WIDTH}×${PAGE_BG_RECOMMENDED_HEIGHT}px recommended · Max ${MAX_PAGE_BG_FILE_MB} MB · JPEG, PNG, or WebP`
}

export function isValidPageBackgroundUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false
  if (!url.startsWith("data:image/")) return false
  return url.length <= MAX_PAGE_BG_DATA_URL_LENGTH
}

export function getCustomPageBackground(): string | null {
  if (typeof localStorage === "undefined") return null
  const stored = localStorage.getItem(PAGE_BG_STORAGE_KEY)
  return isValidPageBackgroundUrl(stored) ? stored : null
}

export function setCustomPageBackground(dataUrl: string | null): void {
  if (typeof localStorage === "undefined") return
  if (dataUrl && isValidPageBackgroundUrl(dataUrl)) {
    localStorage.setItem(PAGE_BG_STORAGE_KEY, dataUrl)
  } else {
    localStorage.removeItem(PAGE_BG_STORAGE_KEY)
  }
  window.dispatchEvent(new CustomEvent(PAGE_BG_CHANGE_EVENT))
}

export function validatePageBackgroundFile(file: File): string | null {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return "Use a JPEG, PNG, or WebP image."
  }
  if (file.size > MAX_PAGE_BG_FILE_BYTES) {
    return `Image must be ${MAX_PAGE_BG_FILE_MB} MB or smaller.`
  }
  return null
}

export function readPageBackgroundFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const error = validatePageBackgroundFile(file)
    if (error) {
      reject(new Error(error))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== "string" || !isValidPageBackgroundUrl(result)) {
        reject(new Error("Could not read image or file is too large after encoding."))
        return
      }
      resolve(result)
    }
    reader.onerror = () => reject(new Error("Failed to read image file."))
    reader.readAsDataURL(file)
  })
}

/** Custom upload wins; otherwise the active theme's bundled default (if any). */
export function resolvePageBackgroundUrl(themeId: AppThemeId): string | null {
  const custom = getCustomPageBackground()
  if (custom) return custom
  return getThemePageBackgroundAsset(themeId)
}

export function hasCustomPageBackground(): boolean {
  return getCustomPageBackground() != null
}
