/** Custom home page Library Stats background (stored in localStorage as a data URL). */

export const LIBRARY_BG_STORAGE_KEY = "dumpstat:library-background"

export const LIBRARY_BG_CHANGE_EVENT = "dumpstat:library-background-change"

/** Wide section cover — Library Stats band on the home page. */
export const LIBRARY_BG_ASPECT_LABEL = "16:9 landscape"

export const LIBRARY_BG_RECOMMENDED_WIDTH = 1600

export const LIBRARY_BG_RECOMMENDED_HEIGHT = 900

export const MAX_LIBRARY_BG_FILE_BYTES = 2 * 1024 * 1024

export const MAX_LIBRARY_BG_FILE_MB = 2

export const MAX_LIBRARY_BG_DATA_URL_LENGTH =
  Math.ceil(MAX_LIBRARY_BG_FILE_BYTES * (4 / 3)) + 128

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

export function formatLibraryBackgroundUploadHint(): string {
  return `${LIBRARY_BG_ASPECT_LABEL} · ${LIBRARY_BG_RECOMMENDED_WIDTH}×${LIBRARY_BG_RECOMMENDED_HEIGHT}px recommended · Max ${MAX_LIBRARY_BG_FILE_MB} MB · JPEG, PNG, or WebP`
}

export function isValidLibraryBackgroundUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false
  if (!url.startsWith("data:image/")) return false
  return url.length <= MAX_LIBRARY_BG_DATA_URL_LENGTH
}

export function getCustomLibraryBackground(): string | null {
  if (typeof localStorage === "undefined") return null
  const stored = localStorage.getItem(LIBRARY_BG_STORAGE_KEY)
  return isValidLibraryBackgroundUrl(stored) ? stored : null
}

export function setCustomLibraryBackground(dataUrl: string | null): void {
  if (typeof localStorage === "undefined") return
  if (dataUrl && isValidLibraryBackgroundUrl(dataUrl)) {
    localStorage.setItem(LIBRARY_BG_STORAGE_KEY, dataUrl)
  } else {
    localStorage.removeItem(LIBRARY_BG_STORAGE_KEY)
  }
  window.dispatchEvent(new CustomEvent(LIBRARY_BG_CHANGE_EVENT))
}

export function validateLibraryBackgroundFile(file: File): string | null {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return "Use a JPEG, PNG, or WebP image."
  }
  if (file.size > MAX_LIBRARY_BG_FILE_BYTES) {
    return `Image must be ${MAX_LIBRARY_BG_FILE_MB} MB or smaller.`
  }
  return null
}

export function readLibraryBackgroundFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const error = validateLibraryBackgroundFile(file)
    if (error) {
      reject(new Error(error))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== "string" || !isValidLibraryBackgroundUrl(result)) {
        reject(new Error("Could not read image or file is too large after encoding."))
        return
      }
      resolve(result)
    }
    reader.onerror = () => reject(new Error("Failed to read image file."))
    reader.readAsDataURL(file)
  })
}
