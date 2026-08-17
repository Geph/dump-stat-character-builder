/** House rule: click a skill's ability to use a different modifier. */

export const MANUAL_SKILL_ABILITY_STORAGE_KEY = "dumpstat:manual-skill-ability"
export const MANUAL_SKILL_ABILITY_CHANGE_EVENT = "dumpstat:manual-skill-ability-change"

export function isManualSkillAbilityEnabled(): boolean {
  if (typeof localStorage === "undefined") return false
  return localStorage.getItem(MANUAL_SKILL_ABILITY_STORAGE_KEY) === "1"
}

export function setManualSkillAbilityEnabled(enabled: boolean): void {
  if (typeof localStorage === "undefined") return
  if (enabled) localStorage.setItem(MANUAL_SKILL_ABILITY_STORAGE_KEY, "1")
  else localStorage.removeItem(MANUAL_SKILL_ABILITY_STORAGE_KEY)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(MANUAL_SKILL_ABILITY_CHANGE_EVENT))
  }
}
