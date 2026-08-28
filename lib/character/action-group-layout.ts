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
