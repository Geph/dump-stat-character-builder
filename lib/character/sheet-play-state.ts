import type { SheetToggleKey } from "@/lib/compendium/sheet-toggle-registry"
import type { RealTimeCooldownState } from "@/lib/character/real-time-recharge"

/** Per-resource banked value with optional real-time decay (Influence, Balance of Power). */
export type AccumulatedResourceState = {
  value: number
  /** ISO timestamp when the bank expires to zero. */
  expiresAt: string | null
}

/**
 * Ephemeral combat/play state for the character sheet.
 * Stored in sessionStorage by default; persisted to characters.sheet_state on explicit save.
 */
export type CharacterSheetPlayState = {
  activeConditions: string[]
  exhaustionLevel: number
  activeSheetToggleIds: SheetToggleKey[]
  usedResourcesById: Record<string, number>
  usedActionUsesById: Record<string, number>
  usedSpellSlotsByKey: Record<string, number[]>
  rechargeCapsByResourceId: Record<string, number>
  /** Hit dice spent since the last long rest, keyed by class id. */
  usedHitDiceByClassId: Record<string, number>
  currentHp: number | null
  tempHp: number
  deathSaves: { successes: number; failures: number }
  hasInspiration: boolean
  realTimeCooldowns: RealTimeCooldownState
  accumulatedResources: Record<string, AccumulatedResourceState>
  /** Set when the player last saved play state to the database. */
  savedAt: string | null
}

export function defaultSheetPlayState(): CharacterSheetPlayState {
  return {
    activeConditions: [],
    exhaustionLevel: 0,
    activeSheetToggleIds: [],
    usedResourcesById: {},
    usedActionUsesById: {},
    usedSpellSlotsByKey: {},
    rechargeCapsByResourceId: {},
    usedHitDiceByClassId: {},
    currentHp: null,
    tempHp: 0,
    deathSaves: { successes: 0, failures: 0 },
    hasInspiration: false,
    realTimeCooldowns: {},
    accumulatedResources: {},
    savedAt: null,
  }
}

export function normalizeSheetPlayState(
  raw: Partial<CharacterSheetPlayState> | null | undefined,
): CharacterSheetPlayState {
  const base = defaultSheetPlayState()
  if (!raw) return base
  return {
    activeConditions: Array.isArray(raw.activeConditions)
      ? raw.activeConditions.filter((entry): entry is string => typeof entry === "string")
      : base.activeConditions,
    exhaustionLevel:
      typeof raw.exhaustionLevel === "number" ? raw.exhaustionLevel : base.exhaustionLevel,
    activeSheetToggleIds: Array.isArray(raw.activeSheetToggleIds)
      ? raw.activeSheetToggleIds.filter((entry): entry is string => typeof entry === "string")
      : base.activeSheetToggleIds,
    usedResourcesById:
      raw.usedResourcesById && typeof raw.usedResourcesById === "object"
        ? { ...raw.usedResourcesById }
        : base.usedResourcesById,
    usedActionUsesById:
      raw.usedActionUsesById && typeof raw.usedActionUsesById === "object"
        ? { ...raw.usedActionUsesById }
        : base.usedActionUsesById,
    usedSpellSlotsByKey:
      raw.usedSpellSlotsByKey && typeof raw.usedSpellSlotsByKey === "object"
        ? { ...raw.usedSpellSlotsByKey }
        : base.usedSpellSlotsByKey,
    rechargeCapsByResourceId:
      raw.rechargeCapsByResourceId && typeof raw.rechargeCapsByResourceId === "object"
        ? { ...raw.rechargeCapsByResourceId }
        : base.rechargeCapsByResourceId,
    usedHitDiceByClassId:
      raw.usedHitDiceByClassId && typeof raw.usedHitDiceByClassId === "object"
        ? { ...raw.usedHitDiceByClassId }
        : base.usedHitDiceByClassId,
    currentHp: typeof raw.currentHp === "number" ? raw.currentHp : base.currentHp,
    tempHp: typeof raw.tempHp === "number" ? raw.tempHp : base.tempHp,
    deathSaves:
      raw.deathSaves &&
      typeof raw.deathSaves.successes === "number" &&
      typeof raw.deathSaves.failures === "number"
        ? { successes: raw.deathSaves.successes, failures: raw.deathSaves.failures }
        : base.deathSaves,
    hasInspiration: Boolean(raw.hasInspiration),
    realTimeCooldowns:
      raw.realTimeCooldowns && typeof raw.realTimeCooldowns === "object"
        ? { ...raw.realTimeCooldowns }
        : base.realTimeCooldowns,
    accumulatedResources:
      raw.accumulatedResources && typeof raw.accumulatedResources === "object"
        ? { ...raw.accumulatedResources }
        : base.accumulatedResources,
    savedAt: typeof raw.savedAt === "string" ? raw.savedAt : base.savedAt,
  }
}
