/** Custom home page hero background (stored in localStorage as a data URL). */

export const HERO_BG_STORAGE_KEY = "dumpstat:hero-background"

export const HERO_BG_CHANGE_EVENT = "dumpstat:hero-background-change"

/** Wide cinematic banner — matches ~1370×498 hero (~2.75:1). */
export const HERO_BG_ASPECT_LABEL = "21:9 wide (~2.75:1)"

export const HERO_BG_RECOMMENDED_WIDTH = 2560

export const HERO_BG_RECOMMENDED_HEIGHT = 1080

/** Keep modest for localStorage; JPEG/WebP compress well at this size. */
export const MAX_HERO_BG_FILE_BYTES = 2 * 1024 * 1024

export const MAX_HERO_BG_FILE_MB = 2

export const MAX_HERO_BG_DATA_URL_LENGTH =
  Math.ceil(MAX_HERO_BG_FILE_BYTES * (4 / 3)) + 128

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

export function formatHeroBackgroundUploadHint(): string {
  return `${HERO_BG_ASPECT_LABEL} · ${HERO_BG_RECOMMENDED_WIDTH}×${HERO_BG_RECOMMENDED_HEIGHT}px recommended · Max ${MAX_HERO_BG_FILE_MB} MB · JPEG, PNG, or WebP`
}

export function isValidHeroBackgroundUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false
  if (!url.startsWith("data:image/")) return false
  return url.length <= MAX_HERO_BG_DATA_URL_LENGTH
}

export function getCustomHeroBackground(): string | null {
  if (typeof localStorage === "undefined") return null
  const stored = localStorage.getItem(HERO_BG_STORAGE_KEY)
  return isValidHeroBackgroundUrl(stored) ? stored : null
}

export function setCustomHeroBackground(dataUrl: string | null): void {
  if (typeof localStorage === "undefined") return
  if (dataUrl && isValidHeroBackgroundUrl(dataUrl)) {
    localStorage.setItem(HERO_BG_STORAGE_KEY, dataUrl)
  } else {
    localStorage.removeItem(HERO_BG_STORAGE_KEY)
  }
  window.dispatchEvent(new CustomEvent(HERO_BG_CHANGE_EVENT))
}

export function validateHeroBackgroundFile(file: File): string | null {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return "Use a JPEG, PNG, or WebP image."
  }
  if (file.size > MAX_HERO_BG_FILE_BYTES) {
    return `Image must be ${MAX_HERO_BG_FILE_MB} MB or smaller.`
  }
  return null
}

export function readHeroBackgroundFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const error = validateHeroBackgroundFile(file)
    if (error) {
      reject(new Error(error))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== "string" || !isValidHeroBackgroundUrl(result)) {
        reject(new Error("Could not read image or file is too large after encoding."))
        return
      }
      resolve(result)
    }
    reader.onerror = () => reject(new Error("Failed to read image file."))
    reader.readAsDataURL(file)
  })
}
