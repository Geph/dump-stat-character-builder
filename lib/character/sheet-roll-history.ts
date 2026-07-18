export type SheetRollKind = "d20" | "damage" | "spell" | "manual"

export type SheetRollEntry = {
  id: string
  at: number
  kind: SheetRollKind
  label: string
  summary: string
  /** d20 natural roll when applicable (for nat 1/20 styling). */
  natural?: number
}

const STORAGE_PREFIX = "dump-stat-roll-history-"
const MAX_ENTRIES = 200

function storageKey(characterId: string): string {
  return `${STORAGE_PREFIX}${characterId}`
}

export function loadSheetRollHistory(characterId: string): SheetRollEntry[] {
  if (typeof window === "undefined" || !characterId) return []
  try {
    const raw = sessionStorage.getItem(storageKey(characterId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as SheetRollEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveSheetRollHistory(characterId: string, entries: SheetRollEntry[]): void {
  if (typeof window === "undefined" || !characterId) return
  try {
    sessionStorage.setItem(storageKey(characterId), JSON.stringify(entries.slice(0, MAX_ENTRIES)))
  } catch {
    // ignore quota errors
  }
}

export function createSheetRollEntry(
  partial: Omit<SheetRollEntry, "id" | "at">,
): SheetRollEntry {
  return {
    ...partial,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    at: Date.now(),
  }
}

export function formatRollTime(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  })
}
