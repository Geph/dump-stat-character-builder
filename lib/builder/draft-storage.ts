import type { CharacterDraft } from "@/lib/types"

const STORAGE_KEY = "dump-stat-builder-draft"

export type BuilderPreviewTab = "summary" | "features"

export function normalizePreviewTab(value: unknown): BuilderPreviewTab {
  if (value === "proficiencies") return "features"
  if (value === "combat" || value === "equipment") return "summary"
  if (value === "summary" || value === "features") {
    return value
  }
  return "summary"
}

/** Legacy builder had a removed Review step at id 7. Class Abilities uses id 8. */
export function normalizeBuilderStepId(step: number): number {
  if (step === 7) return 6
  if (step === 8) return 8
  if (step > 8) return 6
  return step >= 1 ? step : 1
}

/**
 * Draft v1 used Class Abilities as display step 2 and Origin as display step 3.
 * v2 swaps those steps, so migrate by workflow position rather than silently
 * making a previously reached step inaccessible.
 */
export function migrateBuilderCurrentStepForVersion(step: number, version: number): number {
  const normalized = normalizeBuilderStepId(step)
  if (version !== 1) return normalized
  // A v1 draft parked on old step 2 should now complete Origin first.
  if (normalized === 8) return 2
  return normalized
}

export function migrateBuilderMaxStepForVersion(step: number, version: number): number {
  const normalized = normalizeBuilderStepId(step)
  if (version !== 1) return normalized
  // Preserve the furthest display position reached under the old ordering.
  if (normalized === 8) return 2
  if (normalized === 2) return 8
  return normalized
}

export type BuilderDraftSnapshot = {
  version: 1 | 2
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
  spellFilterSchoolByClassId?: Record<string, string>
  spellLevelPages?: Record<string, number>
  previewTab: BuilderPreviewTab
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
    if ((parsed.version !== 1 && parsed.version !== 2) || !parsed.character) return null
    const classLevels = normalizeDraftClassLevels(parsed)
    return {
      ...parsed,
      classLevels,
      currentStep: migrateBuilderCurrentStepForVersion(parsed.currentStep, parsed.version),
      maxStepReached: migrateBuilderMaxStepForVersion(parsed.maxStepReached, parsed.version),
      classAddOrder:
        Array.isArray(parsed.classAddOrder) && parsed.classAddOrder.length > 0
          ? parsed.classAddOrder
          : classLevels.map((entry) => entry.classId),
      primaryClassId:
        parsed.primaryClassId ?? parsed.character.class_id ?? classLevels[0]?.classId ?? null,
      previewTab: normalizePreviewTab(parsed.previewTab),
    }
  } catch {
    return null
  }
}

export function saveBuilderDraft(snapshot: Omit<BuilderDraftSnapshot, "version" | "savedAt">) {
  if (!isBrowser()) return
  try {
    const payload: BuilderDraftSnapshot = {
      version: 2,
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
