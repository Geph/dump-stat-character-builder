export const DISPLAY_NON_COMBAT_ACTIONS_STORAGE_KEY = "dumpstat:display-non-combat-actions"
export const DISPLAY_NON_COMBAT_ACTIONS_CHANGE_EVENT = "dumpstat:display-non-combat-actions-change"

/** Shown by default; only an explicit "0" hides the standard non-combat action cards. */
export function isDisplayNonCombatActionsEnabled(): boolean {
  if (typeof localStorage === "undefined") return true
  return localStorage.getItem(DISPLAY_NON_COMBAT_ACTIONS_STORAGE_KEY) !== "0"
}

export function setDisplayNonCombatActionsEnabled(enabled: boolean): void {
  if (typeof localStorage === "undefined") return
  if (enabled) localStorage.removeItem(DISPLAY_NON_COMBAT_ACTIONS_STORAGE_KEY)
  else localStorage.setItem(DISPLAY_NON_COMBAT_ACTIONS_STORAGE_KEY, "0")
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DISPLAY_NON_COMBAT_ACTIONS_CHANGE_EVENT))
  }
}
