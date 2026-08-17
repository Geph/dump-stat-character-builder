export type FeatureActionPinTarget = "combat" | "utility"

export type FeatureLayoutState = {
  sectionOrder: string[]
  itemOrderBySection: Record<string, string[]>
  pinnedFeatureIds: string[]
  actionPins: Record<string, FeatureActionPinTarget[]>
}

const STORAGE_PREFIX = "dump-stat-feature-layout:"

export function defaultFeatureLayout(): FeatureLayoutState {
  return {
    sectionOrder: [],
    itemOrderBySection: {},
    pinnedFeatureIds: [],
    actionPins: {},
  }
}

export function featureLayoutStorageKey(characterId: string): string {
  return `${STORAGE_PREFIX}${characterId}`
}

export function loadFeatureLayout(characterId: string): FeatureLayoutState {
  if (typeof window === "undefined") return defaultFeatureLayout()
  try {
    const raw = localStorage.getItem(featureLayoutStorageKey(characterId))
    if (!raw) return defaultFeatureLayout()
    return normalizeFeatureLayout(JSON.parse(raw))
  } catch {
    return defaultFeatureLayout()
  }
}

export function saveFeatureLayout(characterId: string, state: FeatureLayoutState): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(featureLayoutStorageKey(characterId), JSON.stringify(state))
  } catch {
    // ignore quota
  }
}

export function normalizeFeatureLayout(raw: Partial<FeatureLayoutState> | null | undefined): FeatureLayoutState {
  const base = defaultFeatureLayout()
  if (!raw) return base
  return {
    sectionOrder: Array.isArray(raw.sectionOrder)
      ? raw.sectionOrder.filter((id): id is string => typeof id === "string")
      : base.sectionOrder,
    itemOrderBySection:
      raw.itemOrderBySection && typeof raw.itemOrderBySection === "object"
        ? Object.fromEntries(
            Object.entries(raw.itemOrderBySection).filter((entry): entry is [string, string[]] =>
              Array.isArray(entry[1]),
            ),
          )
        : base.itemOrderBySection,
    pinnedFeatureIds: Array.isArray(raw.pinnedFeatureIds)
      ? raw.pinnedFeatureIds.filter((id): id is string => typeof id === "string")
      : base.pinnedFeatureIds,
    actionPins:
      raw.actionPins && typeof raw.actionPins === "object"
        ? Object.fromEntries(
            Object.entries(raw.actionPins).map(([id, targets]) => [
              id,
              (Array.isArray(targets) ? targets : []).filter(
                (target): target is FeatureActionPinTarget =>
                  target === "combat" || target === "utility",
              ),
            ]),
          )
        : base.actionPins,
  }
}

export function applyOrder<T>(items: T[], order: string[] | undefined, idOf: (item: T) => string): T[] {
  if (!order?.length) return items
  const index = new Map(order.map((id, i) => [id, i]))
  return [...items].sort((a, b) => {
    const ai = index.get(idOf(a))
    const bi = index.get(idOf(b))
    if (ai == null && bi == null) return 0
    if (ai == null) return 1
    if (bi == null) return -1
    return ai - bi
  })
}

export function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return items
  if (fromIndex >= items.length || toIndex >= items.length) return items
  const next = [...items]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved!)
  return next
}

/** Reorder known ids so `fromId` lands where `toId` currently is. */
export function moveOrderedId(allIds: string[], order: string[] | undefined, fromId: string, toId: string): string[] {
  const ids = applyOrder(allIds, order, (id) => id)
  const from = ids.indexOf(fromId)
  const to = ids.indexOf(toId)
  if (from < 0 || to < 0) return ids
  return moveItem(ids, from, to)
}

export function sortPinnedFirst<T>(items: T[], pinnedIds: string[], idOf: (item: T) => string): T[] {
  if (!pinnedIds.length) return items
  const pinned = new Set(pinnedIds)
  return [...items.filter((item) => pinned.has(idOf(item))), ...items.filter((item) => !pinned.has(idOf(item)))]
}

export function togglePinnedFeature(state: FeatureLayoutState, featureId: string): FeatureLayoutState {
  const pinned = state.pinnedFeatureIds.includes(featureId)
  return {
    ...state,
    pinnedFeatureIds: pinned
      ? state.pinnedFeatureIds.filter((id) => id !== featureId)
      : [...state.pinnedFeatureIds, featureId],
  }
}

export function toggleActionPin(
  state: FeatureLayoutState,
  featureId: string,
  target: FeatureActionPinTarget,
): FeatureLayoutState {
  const current = state.actionPins[featureId] ?? []
  const next = current.includes(target)
    ? current.filter((entry) => entry !== target)
    : [...current, target]
  const actionPins = { ...state.actionPins }
  if (next.length) actionPins[featureId] = next
  else delete actionPins[featureId]
  return { ...state, actionPins }
}
