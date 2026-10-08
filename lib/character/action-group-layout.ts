import { applyOrder, moveOrderedId } from "@/lib/character/feature-layout"

export const ACTION_GROUP_IDS = [
  "weapons",
  "weapon-attack",
  "action",
  "triggered",
  "bonus",
  "reaction",
] as const

export type ActionGroupId = (typeof ACTION_GROUP_IDS)[number]

const STORAGE_PREFIX = "dump-stat-action-group-order:"
const COLUMN_STORAGE_PREFIX = "dump-stat-action-group-columns:"

export type ActionGroupColumnMap = Record<string, 0 | 1>

/** Combat default: weapons left of Action, Passive left of Bonus — same 2-col pairing as today. */
export const DEFAULT_COMBAT_ACTION_GROUP_ORDER: ActionGroupId[] = [
  "weapons",
  "action",
  "triggered",
  "bonus",
  "reaction",
  "weapon-attack",
]

export function actionGroupLayoutStorageKey(characterId: string, scope: string): string {
  return `${STORAGE_PREFIX}${characterId}:${scope}`
}

export function actionGroupColumnStorageKey(characterId: string, scope: string): string {
  return `${COLUMN_STORAGE_PREFIX}${characterId}:${scope}`
}

export function loadActionGroupOrder(characterId: string, scope: string): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(actionGroupLayoutStorageKey(characterId, scope))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === "string")
  } catch {
    return []
  }
}

export function saveActionGroupOrder(characterId: string, scope: string, order: string[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(actionGroupLayoutStorageKey(characterId, scope), JSON.stringify(order))
  } catch {
    // ignore quota
  }
}

export function loadActionGroupColumns(characterId: string, scope: string): ActionGroupColumnMap {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(actionGroupColumnStorageKey(characterId, scope))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, 0 | 1] => {
        return entry[1] === 0 || entry[1] === 1
      }),
    )
  } catch {
    return {}
  }
}

export function saveActionGroupColumns(
  characterId: string,
  scope: string,
  columns: ActionGroupColumnMap,
): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(actionGroupColumnStorageKey(characterId, scope), JSON.stringify(columns))
  } catch {
    // ignore quota
  }
}

export function defaultActionGroupColumn(id: string): 0 | 1 {
  const index = DEFAULT_COMBAT_ACTION_GROUP_ORDER.indexOf(id as ActionGroupId)
  return index >= 0 && index % 2 === 1 ? 1 : 0
}

export function orderActionGroups<T>(
  groups: T[],
  savedOrder: string[] | undefined,
  idOf: (group: T) => string,
  fallbackOrder: string[] = DEFAULT_COMBAT_ACTION_GROUP_ORDER,
): T[] {
  return applyOrder(groups, savedOrder?.length ? savedOrder : fallbackOrder, idOf)
}

export function moveActionGroup(allIds: string[], order: string[] | undefined, fromId: string, toId: string): string[] {
  return moveOrderedId(allIds, order, fromId, toId)
}

/** Where a dragged group lands: before `beforeId`, or at the end of the column when null. */
export type ActionGroupDropSlot = { column: 0 | 1; beforeId: string | null }

export type ActionGroupPlacement = { id: string; column: 0 | 1; top: number; height: number }

/** Pack measured groups into the shortest column, respecting explicit player placements. */
export function packActionGroups(
  ids: readonly string[],
  heights: Readonly<Record<string, number>>,
  columnCount: 1 | 2,
  preferredColumns: ActionGroupColumnMap = {},
  gap = 10,
): ActionGroupPlacement[] {
  const bottoms = [0, 0]
  return ids.map((id) => {
    const column: 0 | 1 = columnCount === 1 ? 0
      : preferredColumns[id] ?? (id === "weapons" ? 0 : bottoms[0] <= bottoms[1] ? 0 : 1)
    const height = Math.max(1, Math.ceil(heights[id] ?? (id === "weapons" ? 220 : 120)))
    const top = bottoms[column]
    bottoms[column] = top + height + gap
    return { id, column, top, height }
  })
}

/**
 * Reorder `orderedIds` so `fromId` sits before `beforeId`, or after the last group of the
 * target column (`columnIds`, in display order) when `beforeId` is null.
 */
export function placeActionGroup(
  orderedIds: string[],
  fromId: string,
  beforeId: string | null,
  columnIds: string[],
): string[] {
  if (!orderedIds.includes(fromId) || beforeId === fromId) return orderedIds
  const ids = orderedIds.filter((id) => id !== fromId)
  if (beforeId) {
    const index = ids.indexOf(beforeId)
    if (index >= 0) {
      ids.splice(index, 0, fromId)
      return ids
    }
  }
  const lastInColumn = [...columnIds].reverse().find((id) => id !== fromId && ids.includes(id))
  if (lastInColumn) {
    ids.splice(ids.indexOf(lastInColumn) + 1, 0, fromId)
  } else {
    ids.push(fromId)
  }
  return ids
}

/** Slots that would leave `draggingId` where it already is. */
export function isNoOpActionGroupSlot(
  slot: ActionGroupDropSlot,
  draggingId: string,
  draggingColumn: 0 | 1,
  columnIds: string[],
): boolean {
  if (slot.column !== draggingColumn) return false
  const index = columnIds.indexOf(draggingId)
  if (index < 0) return false
  const nextId = columnIds[index + 1] ?? null
  return slot.beforeId === draggingId || slot.beforeId === nextId
}
