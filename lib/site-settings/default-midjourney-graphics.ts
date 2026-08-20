export const DEFAULT_MIDJOURNEY_GRAPHICS_STORAGE_KEY =
  "dumpstat:disable-default-midjourney-graphics"

export const DEFAULT_MIDJOURNEY_GRAPHICS_CHANGE_EVENT =
  "dumpstat:disable-default-midjourney-graphics-change"

/** Bundled Midjourney defaults are on unless the user explicitly disables them. */
export function areDefaultMidjourneyGraphicsDisabled(): boolean {
  if (typeof localStorage === "undefined") return false
  return localStorage.getItem(DEFAULT_MIDJOURNEY_GRAPHICS_STORAGE_KEY) === "1"
}

export function setDefaultMidjourneyGraphicsDisabled(disabled: boolean): void {
  if (typeof localStorage === "undefined") return
  if (disabled) localStorage.setItem(DEFAULT_MIDJOURNEY_GRAPHICS_STORAGE_KEY, "1")
  else localStorage.removeItem(DEFAULT_MIDJOURNEY_GRAPHICS_STORAGE_KEY)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DEFAULT_MIDJOURNEY_GRAPHICS_CHANGE_EVENT))
  }
}
