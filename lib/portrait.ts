/** Max uploaded portrait file size (10 MB). */
export const MAX_PORTRAIT_FILE_BYTES = 10 * 1024 * 1024

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
