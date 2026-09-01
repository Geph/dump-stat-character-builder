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
    return `${PORTRAIT_ASPECT_LABEL} crop · ${PORTRAIT_RECOMMENDED_WIDTH}×${PORTRAIT_RECOMMENDED_HEIGHT}px · Max ${MAX_PORTRAIT_FILE_MB} MB`
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

export const PORTRAIT_CROP_MIN_ZOOM = 1
export const PORTRAIT_CROP_MAX_ZOOM = 4
export const PORTRAIT_CROP_OUTPUT_SIZE = 512

export type PortraitCrop = {
  /** Crop center as a 0–1 fraction of image width. */
  cx: number
  /** Crop center as a 0–1 fraction of image height. */
  cy: number
  /** 1 = largest inscribed square; higher zooms in. */
  zoom: number
}

export function defaultPortraitCrop(): PortraitCrop {
  return { cx: 0.5, cy: 0.5, zoom: 1 }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.5
  return Math.min(1, Math.max(0, value))
}

function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return PORTRAIT_CROP_MIN_ZOOM
  return Math.min(PORTRAIT_CROP_MAX_ZOOM, Math.max(PORTRAIT_CROP_MIN_ZOOM, zoom))
}

/** Pixel rectangle for a 1:1 crop inside the source image. */
export function resolvePortraitCropRect(
  imageWidth: number,
  imageHeight: number,
  crop: PortraitCrop,
): { sx: number; sy: number; size: number } {
  const width = Math.max(1, imageWidth)
  const height = Math.max(1, imageHeight)
  const size = Math.min(width, height) / clampZoom(crop.zoom)
  let sx = clamp01(crop.cx) * width - size / 2
  let sy = clamp01(crop.cy) * height - size / 2
  sx = Math.min(Math.max(0, sx), width - size)
  sy = Math.min(Math.max(0, sy), height - size)
  return { sx, sy, size }
}

export function normalizePortraitCrop(
  imageWidth: number,
  imageHeight: number,
  crop: PortraitCrop,
): PortraitCrop {
  const width = Math.max(1, imageWidth)
  const height = Math.max(1, imageHeight)
  const rect = resolvePortraitCropRect(width, height, crop)
  return {
    cx: (rect.sx + rect.size / 2) / width,
    cy: (rect.sy + rect.size / 2) / height,
    zoom: clampZoom(crop.zoom),
  }
}

export function panPortraitCrop(
  imageWidth: number,
  imageHeight: number,
  crop: PortraitCrop,
  deltaXNorm: number,
  deltaYNorm: number,
): PortraitCrop {
  return normalizePortraitCrop(imageWidth, imageHeight, {
    ...crop,
    cx: crop.cx + deltaXNorm,
    cy: crop.cy + deltaYNorm,
  })
}

export function cropPortraitToDataUrl(
  image: CanvasImageSource & { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number },
  crop: PortraitCrop,
): string {
  const width = image.naturalWidth || image.width || 1
  const height = image.naturalHeight || image.height || 1
  const { sx, sy, size } = resolvePortraitCropRect(width, height, crop)
  const canvas = document.createElement("canvas")
  canvas.width = PORTRAIT_CROP_OUTPUT_SIZE
  canvas.height = PORTRAIT_CROP_OUTPUT_SIZE
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Could not crop the portrait.")
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(image, sx, sy, size, size, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL("image/jpeg", 0.88)
}
