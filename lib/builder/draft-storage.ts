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
  equipmentFilterCategory?: string
  spellFilterLevelByClassId?: Record<string, string>
  spellLevelPages?: Record<string, number>
  previewTab: "summary" | "combat" | "features" | "custom"
  mobilePanel: "steps" | "preview"
  equippedArmorId: string | null
  equippedShieldId: string | null
  equippedWeaponId: string | null
  classLevels: { classId: string; level: number }[]
  primaryClassId: string | null
  classAddOrder: string[]
  subclassByClassId: Record<string, string>
  classSkillPicks: Record<string, string[]>
  classToolPicks?: Record<string, string[]>
  featureChoicePicks: Record<string, string[]>
  featChoicePicks: Record<string, string[]>
  modifierPlayerPicks: Record<string, string[]>
  speciesTraitPicks: Record<string, string[]>
  startingEquipmentOptionIndex: number | null
  backgroundStartingEquipmentOptionIndex: number | null
  goldPurchasedEquipmentIds: string[]
  cardViewMode: "dense" | "cinematic"
  spellPicksByClassId: Record<string, string[]>
  asiAllocationsByFeatId: Record<string, Partial<Record<string, number>>>
  standardArrayAssignments: Partial<
    Record<"strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma", number>
  >
  editingCharacterId: string | null
  currentHp: number | null
  tempHp: number
}

function isBrowser() {
  return typeof window !== "undefined"
}

export function normalizeDraftClassLevels(
  snapshot: Pick<BuilderDraftSnapshot, "classLevels" | "character">,
): { classId: string; level: number }[] {
  if (Array.isArray(snapshot.classLevels) && snapshot.classLevels.length > 0) {
    return snapshot.classLevels
  }
  if (snapshot.character.class_id) {
    return [
      {
        classId: snapshot.character.class_id,
        level: snapshot.character.level > 0 ? snapshot.character.level : 1,
      },
    ]
  }
  return []
}

export function loadBuilderDraft(): BuilderDraftSnapshot | null {
  if (!isBrowser()) return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as BuilderDraftSnapshot
    if (parsed.version !== 1 || !parsed.character) return null
    const classLevels = normalizeDraftClassLevels(parsed)
    return {
      ...parsed,
      classLevels,
      classAddOrder:
        Array.isArray(parsed.classAddOrder) && parsed.classAddOrder.length > 0
          ? parsed.classAddOrder
          : classLevels.map((entry) => entry.classId),
      primaryClassId:
        parsed.primaryClassId ?? parsed.character.class_id ?? classLevels[0]?.classId ?? null,
    }
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
