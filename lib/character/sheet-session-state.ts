import type { SheetToggleKey } from "@/lib/compendium/sheet-toggle-registry"

export type SheetSessionState = {
  activeConditions: string[]
  exhaustionLevel: number
  activeSheetToggleIds: SheetToggleKey[]
}

const STORAGE_PREFIX = "dump-stat-sheet-session:"

function storageKey(characterId: string): string {
  return `${STORAGE_PREFIX}${characterId}`
}

export function loadSheetSessionState(characterId: string): SheetSessionState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(storageKey(characterId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SheetSessionState>
    return {
      activeConditions: Array.isArray(parsed.activeConditions) ? parsed.activeConditions : [],
      exhaustionLevel:
        typeof parsed.exhaustionLevel === "number" ? parsed.exhaustionLevel : 0,
      activeSheetToggleIds: Array.isArray(parsed.activeSheetToggleIds)
        ? parsed.activeSheetToggleIds.filter((id): id is string => typeof id === "string")
        : [],
    }
  } catch {
    return null
  }
}

export function saveSheetSessionState(characterId: string, state: SheetSessionState): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(storageKey(characterId), JSON.stringify(state))
  } catch {
    // ignore quota errors
  }
}

export function defaultSheetSessionState(): SheetSessionState {
  return {
    activeConditions: [],
    exhaustionLevel: 0,
    activeSheetToggleIds: [],
  }
}
