/** Home page can jump to the last opened character after first use. */

export const RESUME_LAST_CHARACTER_STORAGE_KEY = "dumpstat:resume-last-character"
export const LAST_CHARACTER_ID_STORAGE_KEY = "dumpstat:last-character-id"
export const RESUME_LAST_CHARACTER_CHANGE_EVENT = "dumpstat:resume-last-character-change"

export function isResumeLastCharacterEnabled(): boolean {
  if (typeof localStorage === "undefined") return false
  return localStorage.getItem(RESUME_LAST_CHARACTER_STORAGE_KEY) === "1"
}

export function setResumeLastCharacterEnabled(enabled: boolean): void {
  if (typeof localStorage === "undefined") return
  if (enabled) localStorage.setItem(RESUME_LAST_CHARACTER_STORAGE_KEY, "1")
  else localStorage.removeItem(RESUME_LAST_CHARACTER_STORAGE_KEY)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(RESUME_LAST_CHARACTER_CHANGE_EVENT))
  }
}

export function getLastCharacterId(): string | null {
  if (typeof localStorage === "undefined") return null
  return localStorage.getItem(LAST_CHARACTER_ID_STORAGE_KEY)
}

export function rememberLastCharacterId(id: string): void {
  if (typeof localStorage === "undefined" || !id.trim()) return
  localStorage.setItem(LAST_CHARACTER_ID_STORAGE_KEY, id)
}
