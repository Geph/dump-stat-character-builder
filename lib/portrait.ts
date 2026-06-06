/** Max uploaded portrait file size (10 MB). */
export const MAX_PORTRAIT_FILE_BYTES = 10 * 1024 * 1024

export const MAX_PORTRAIT_FILE_MB = 10

/** Square portrait shown on sheets and lists. */
export const PORTRAIT_ASPECT_LABEL = "1:1"
export const PORTRAIT_RECOMMENDED_WIDTH = 512
export const PORTRAIT_RECOMMENDED_HEIGHT = 512

/** Wide banner behind the character sheet header. */
export const BANNER_ASPECT_LABEL = "3:1"
export const BANNER_RECOMMENDED_WIDTH = 1200
export const BANNER_RECOMMENDED_HEIGHT = 400

export function formatImageUploadHint(kind: "portrait" | "banner"): string {
  if (kind === "portrait") {
    return `${PORTRAIT_ASPECT_LABEL} · ${PORTRAIT_RECOMMENDED_WIDTH}×${PORTRAIT_RECOMMENDED_HEIGHT}px+ · Max ${MAX_PORTRAIT_FILE_MB} MB`
  }
  return `${BANNER_ASPECT_LABEL} · ${BANNER_RECOMMENDED_WIDTH}×${BANNER_RECOMMENDED_HEIGHT}px+ · Max ${MAX_PORTRAIT_FILE_MB} MB`
}

/** Base64 data URLs are ~4/3 the raw file size plus a small prefix. */
export const MAX_PORTRAIT_DATA_URL_LENGTH =
  Math.ceil(MAX_PORTRAIT_FILE_BYTES * (4 / 3)) + 64

export function isValidPortraitUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false
  if (url.startsWith("data:image/")) {
    return url.length <= MAX_PORTRAIT_DATA_URL_LENGTH
  }
  // Short external URLs (if ever used)
  return url.length <= 2048
}

export function normalizePortraitUrl(url: unknown): string | null {
  if (typeof url !== "string" || !url.trim()) return null
  return isValidPortraitUrl(url) ? url : null
}

/** Landscape banner uses the same size limits as portraits. */
export const normalizeBannerUrl = normalizePortraitUrl
