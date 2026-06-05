import type { CharacterDraft } from "@/lib/types"

const STORAGE_KEY = "dump-stat-builder-draft"

export type BuilderDraftSnapshot = {
  version: 1
  savedAt: string
  currentStep: number
  maxStepReached: number
  character: CharacterDraft
  abilityMethod: "pointbuy" | "standard" | "roll" | "custom"
  pointsRemaining: number
  classSearch: string
  speciesSearch: string
  backgroundSearch: string
  spellSearch: string
  equipmentSearch: string
  previewTab: "summary" | "combat" | "features" | "custom"
  mobilePanel: "steps" | "preview"
  equippedArmorId: string | null
  equippedShieldId: string | null
  equippedWeaponId: string | null
  classLevels: { classId: string; level: number }[]
  subclassByClassId: Record<string, string>
  classSkillPicks: Record<string, string[]>
  featureChoicePicks: Record<string, string[]>
  speciesTraitPicks: Record<string, string[]>
  startingEquipmentOptionIndex: number | null
  spellPicksByClassId: Record<string, string[]>
  asiAllocationsByFeatId: Record<string, Partial<Record<string, number>>>
  editingCharacterId: string | null
  currentHp: number | null
  tempHp: number
}

function isBrowser() {
  return typeof window !== "undefined"
}

export function loadBuilderDraft(): BuilderDraftSnapshot | null {
  if (!isBrowser()) return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as BuilderDraftSnapshot
    if (parsed.version !== 1 || !parsed.character) return null
    return parsed
  } catch {
    return null
  }
}

export function saveBuilderDraft(snapshot: Omit<BuilderDraftSnapshot, "version" | "savedAt">) {
  if (!isBrowser()) return
  try {
    const payload: BuilderDraftSnapshot = {
      version: 1,
      savedAt: new Date().toISOString(),
      ...snapshot,
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (err) {
    console.warn("[builder] Failed to save draft:", err)
  }
}

export function clearBuilderDraft() {
  if (!isBrowser()) return
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
