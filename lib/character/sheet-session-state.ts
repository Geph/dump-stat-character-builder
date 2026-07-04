import type { SheetToggleKey } from "@/lib/compendium/sheet-toggle-registry"
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
  usedResourcesById: Record<string, number>
  usedActionUsesById: Record<string, number>
  usedSpellSlotsByKey: Record<string, number[]>
  rechargeCapsByResourceId: Record<string, number>
  currentHp: number
  tempHp: number
  deathSaves: { successes: number; failures: number }
  hasInspiration: boolean
  realTimeCooldowns: CharacterSheetPlayState["realTimeCooldowns"]
  accumulatedResources: CharacterSheetPlayState["accumulatedResources"]
  savedAt?: string | null
}): CharacterSheetPlayState {
  return normalizeSheetPlayState({
    ...params,
    savedAt: params.savedAt ?? null,
  })
}
