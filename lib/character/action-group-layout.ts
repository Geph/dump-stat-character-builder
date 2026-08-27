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
