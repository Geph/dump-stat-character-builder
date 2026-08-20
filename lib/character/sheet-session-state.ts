import type { SheetToggleKey } from "@/lib/compendium/sheet-toggle-registry"
import { defaultRampageTurnState } from "@/lib/character/rampage-die"
import {
  defaultSheetPlayState,
  normalizeSheetPlayState,
  type CharacterSheetPlayState,
} from "@/lib/character/sheet-play-state"

export type { CharacterSheetPlayState } from "@/lib/character/sheet-play-state"
export { defaultSheetPlayState, normalizeSheetPlayState } from "@/lib/character/sheet-play-state"

const STORAGE_PREFIX = "dump-stat-sheet-session:"

function storageKey(characterId: string): string {
  return `${STORAGE_PREFIX}${characterId}`
}

/** @deprecated Prefer CharacterSheetPlayState — kept for backward-compatible sessionStorage reads. */
export type SheetSessionState = Pick<
  CharacterSheetPlayState,
  "activeConditions" | "exhaustionLevel" | "activeSheetToggleIds"
>

export function loadSheetSessionState(characterId: string): CharacterSheetPlayState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(storageKey(characterId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CharacterSheetPlayState>
    return normalizeSheetPlayState(parsed)
  } catch {
    return null
  }
}

export function saveSheetSessionState(characterId: string, state: CharacterSheetPlayState): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(storageKey(characterId), JSON.stringify(state))
  } catch {
    // ignore quota errors
  }
}

export function defaultSheetSessionState(): CharacterSheetPlayState {
  return defaultSheetPlayState()
}

export function buildSheetPlayStateFromSheet(params: {
  activeConditions: string[]
  exhaustionLevel: number
  activeSheetToggleIds: SheetToggleKey[]
  sheetToggleNotes: CharacterSheetPlayState["sheetToggleNotes"]
  usedResourcesById: Record<string, number>
  usedActionUsesById: Record<string, number>
  usedSpellSlotsByKey: Record<string, number[]>
  rechargeCapsByResourceId: Record<string, number>
  usedHitDiceByClassId: Record<string, number>
  currentHp: number
  tempHp: number
  deathSaves: { successes: number; failures: number }
  hasInspiration: boolean
  realTimeCooldowns: CharacterSheetPlayState["realTimeCooldowns"]
  accumulatedResources: CharacterSheetPlayState["accumulatedResources"]
  resourceDieSidesByKey: CharacterSheetPlayState["resourceDieSidesByKey"]
  rampageTurn?: CharacterSheetPlayState["rampageTurn"]
  mutationDie?: CharacterSheetPlayState["mutationDie"]
  fleshWarpAllyBenefitCounts?: CharacterSheetPlayState["fleshWarpAllyBenefitCounts"]
  illusionTokens?: CharacterSheetPlayState["illusionTokens"]
  skillSortMode?: CharacterSheetPlayState["skillSortMode"]
  pinnedSkillNames?: CharacterSheetPlayState["pinnedSkillNames"]
  pinnedEquipmentIds?: CharacterSheetPlayState["pinnedEquipmentIds"]
  durationReminders?: CharacterSheetPlayState["durationReminders"]
  skillAbilityOverrides?: CharacterSheetPlayState["skillAbilityOverrides"]
  savedAt?: string | null
}): CharacterSheetPlayState {
  return normalizeSheetPlayState({
    ...params,
    rampageTurn: params.rampageTurn ?? defaultRampageTurnState(),
    mutationDie: params.mutationDie ?? null,
    fleshWarpAllyBenefitCounts: params.fleshWarpAllyBenefitCounts ?? {},
    illusionTokens: params.illusionTokens ?? [],
    savedAt: params.savedAt ?? null,
  })
}
