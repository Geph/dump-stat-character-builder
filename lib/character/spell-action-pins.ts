/** Persist which spells appear as cast buttons on the Abilities tab. */

const STORAGE_PREFIX = "dump-stat-spell-action-pins:"

export type SpellActionPinsState = {
  /** Spell catalog ids pinned to Abilities & Skills actions. */
  utilitySpellIds: string[]
}

export function defaultSpellActionPins(): SpellActionPinsState {
  return { utilitySpellIds: [] }
}

export function spellActionPinsStorageKey(characterId: string): string {
  return `${STORAGE_PREFIX}${characterId}`
}

export function normalizeSpellActionPins(
  raw: Partial<SpellActionPinsState> | null | undefined,
): SpellActionPinsState {
  const base = defaultSpellActionPins()
  if (!raw) return base
  return {
    utilitySpellIds: Array.isArray(raw.utilitySpellIds)
      ? raw.utilitySpellIds.filter((id): id is string => typeof id === "string" && Boolean(id.trim()))
      : base.utilitySpellIds,
  }
}

export function loadSpellActionPins(characterId: string): SpellActionPinsState {
  if (typeof window === "undefined") return defaultSpellActionPins()
  try {
    const raw = localStorage.getItem(spellActionPinsStorageKey(characterId))
    if (!raw) return defaultSpellActionPins()
    return normalizeSpellActionPins(JSON.parse(raw))
  } catch {
    return defaultSpellActionPins()
  }
}

export function saveSpellActionPins(characterId: string, state: SpellActionPinsState): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(spellActionPinsStorageKey(characterId), JSON.stringify(state))
  } catch {
    // ignore quota
  }
}

export function isSpellPinnedToAbilities(state: SpellActionPinsState, spellId: string): boolean {
  return state.utilitySpellIds.includes(spellId)
}

export function toggleSpellPinnedToAbilities(
  state: SpellActionPinsState,
  spellId: string,
): SpellActionPinsState {
  const pinned = state.utilitySpellIds.includes(spellId)
  return {
    utilitySpellIds: pinned
      ? state.utilitySpellIds.filter((id) => id !== spellId)
      : [...state.utilitySpellIds, spellId],
  }
}
