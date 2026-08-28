import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import {
  MAGIC_INITIATE_SPELL_LISTS,
  type MagicInitiateSpellList,
} from "@/lib/compendium/background-origin-feat"
import type { ModifierPlayerChoiceSlot } from "@/lib/builder/modifier-player-choices"

export const MAGIC_INITIATE_ABILITY_OPTIONS: AbilityScoreKey[] = [
  "intelligence",
  "wisdom",
  "charisma",
]

export { MAGIC_INITIATE_SPELL_LISTS }

/** Default spellcasting ability for a Magic Initiate spell list (2024). */
export function magicInitiateAbilityForSpellList(
  spellList: MagicInitiateSpellList | string | null | undefined,
): AbilityScoreKey {
  const list = (spellList ?? "").trim().toLowerCase()
  if (list === "wizard") return "intelligence"
  if (list === "cleric" || list === "druid") return "wisdom"
  return "intelligence"
}

export function normalizeSpellcastingAbilityPick(
  raw: string | null | undefined,
): AbilityScoreKey | null {
  const value = (raw ?? "").trim().toLowerCase()
  if (value === "intelligence" || value === "int") return "intelligence"
  if (value === "wisdom" || value === "wis") return "wisdom"
  if (value === "charisma" || value === "cha") return "charisma"
  return null
}

/** Canonical Magic Initiate spell-list name, or null if unrecognized. */
export function normalizeMagicInitiateSpellList(
  raw: string | null | undefined,
): MagicInitiateSpellList | null {
  const value = (raw ?? "").trim().toLowerCase()
  if (!value) return null
  return (
    MAGIC_INITIATE_SPELL_LISTS.find((list) => list.toLowerCase() === value) ?? null
  )
}

/** True when this modifier source is a Magic Initiate feat grant/pick. */
export function isMagicInitiateSourceLabel(sourceLabel: string | null | undefined): boolean {
  return /^magic initiate\b/i.test((sourceLabel ?? "").trim())
}

/**
 * Spell lists already claimed by other Magic Initiate takes.
 * `currentSlotKey` is excluded so the active pick keeps its own option visible.
 */
export function takenMagicInitiateSpellLists(
  slots: readonly ModifierPlayerChoiceSlot[],
  picks: Record<string, string[]>,
  currentSlotKey?: string | null,
): Set<string> {
  const taken = new Set<string>()
  for (const slot of slots) {
    if (slot.kind !== "spell_list_class") continue
    if (!isMagicInitiateSourceLabel(slot.sourceLabel)) continue
    if (currentSlotKey && slot.slotKey === currentSlotKey) continue
    const list = normalizeMagicInitiateSpellList(picks[slot.slotKey]?.[0])
    if (list) taken.add(list.toLowerCase())
  }
  return taken
}

/**
 * Abilities already claimed by other Magic Initiate takes.
 * Uses an explicit spellcasting_ability pick when present; otherwise infers from the
 * chosen spell list (Wizard→INT, Cleric/Druid→WIS) so background grants lock correctly.
 * `currentSlotKey` is excluded so the active pick keeps its own option visible.
 */
export function takenMagicInitiateAbilities(
  slots: readonly ModifierPlayerChoiceSlot[],
  picks: Record<string, string[]>,
  currentSlotKey?: string | null,
): Set<AbilityScoreKey> {
  const taken = new Set<AbilityScoreKey>()
  const miSourceKeys = new Set(
    slots
      .filter((slot) => isMagicInitiateSourceLabel(slot.sourceLabel))
      .map((slot) => slot.sourceKey),
  )

  for (const sourceKey of miSourceKeys) {
    const abilitySlot = slots.find(
      (slot) =>
        slot.sourceKey === sourceKey &&
        slot.kind === "spellcasting_ability" &&
        isMagicInitiateSourceLabel(slot.sourceLabel),
    )
    if (currentSlotKey && abilitySlot?.slotKey === currentSlotKey) continue

    const explicit = abilitySlot
      ? normalizeSpellcastingAbilityPick(picks[abilitySlot.slotKey]?.[0])
      : null
    if (explicit) {
      taken.add(explicit)
      continue
    }

    const listSlot = slots.find(
      (slot) => slot.sourceKey === sourceKey && slot.kind === "spell_list_class",
    )
    const listName = listSlot ? picks[listSlot.slotKey]?.[0] : null
    if (listName) {
      taken.add(magicInitiateAbilityForSpellList(listName))
    }
  }
  return taken
}

/**
 * Spell-list names already claimed by other Magic Initiate takes (for graying out picker options).
 * `currentSlotKey` is excluded so the active pick keeps its own selection enabled.
 */
export function unavailableMagicInitiateSpellListNames(
  slots: readonly ModifierPlayerChoiceSlot[],
  picks: Record<string, string[]>,
  currentSlotKey?: string | null,
): string[] {
  const taken = takenMagicInitiateSpellLists(slots, picks, currentSlotKey)
  return MAGIC_INITIATE_SPELL_LISTS.filter((list) => taken.has(list.toLowerCase()))
}

/**
 * Ability option names already claimed by other Magic Initiate takes (for graying out pickers).
 */
export function unavailableMagicInitiateAbilityNames(
  slots: readonly ModifierPlayerChoiceSlot[],
  picks: Record<string, string[]>,
  currentSlotKey?: string | null,
): string[] {
  const taken = takenMagicInitiateAbilities(slots, picks, currentSlotKey)
  return MAGIC_INITIATE_ABILITY_OPTIONS.filter((ability) => taken.has(ability)).map(
    (ability) => ability.charAt(0).toUpperCase() + ability.slice(1),
  )
}

/**
 * Keep spell-list options intact. Taken lists are grayed out via unavailableOptions in the UI.
 * @deprecated Filtering was replaced by unavailableMagicInitiateSpellListNames; this is a no-op.
 */
export function filterMagicInitiateSpellListSlotOptions(
  slot: ModifierPlayerChoiceSlot,
  _slots: readonly ModifierPlayerChoiceSlot[],
  _picks: Record<string, string[]>,
): ModifierPlayerChoiceSlot {
  return slot
}

/**
 * Keep ability options intact. Taken abilities are grayed out via unavailableOptions in the UI.
 * @deprecated Filtering was replaced by unavailableMagicInitiateAbilityNames; this is a no-op.
 */
export function filterMagicInitiateAbilitySlotOptions(
  slot: ModifierPlayerChoiceSlot,
  _slots: readonly ModifierPlayerChoiceSlot[],
  _picks: Record<string, string[]>,
): ModifierPlayerChoiceSlot {
  return slot
}

/**
 * Whether another Magic Initiate may still be taken (at least one spell list free).
 * 2024 repeatable rule: each take must choose a different class's spell list.
 */
export function canTakeAnotherMagicInitiate(params: {
  slots: readonly ModifierPlayerChoiceSlot[]
  picks: Record<string, string[]>
  /** Spell lists available on Magic Initiate (defaults to Cleric/Druid/Wizard). */
  spellListOptions?: readonly string[]
}): boolean {
  const options = params.spellListOptions?.length
    ? params.spellListOptions
    : MAGIC_INITIATE_SPELL_LISTS
  const taken = takenMagicInitiateSpellLists(params.slots, params.picks)
  return options.some((list) => !taken.has(list.trim().toLowerCase()))
}

/**
 * Drop Magic Initiate spell-list picks that duplicate an earlier take.
 * Background / granted takes win over later feat picks.
 */
export function pruneConflictingMagicInitiateSpellListPicks(
  slots: readonly ModifierPlayerChoiceSlot[],
  picks: Record<string, string[]>,
): Record<string, string[]> {
  const listSlots = slots
    .filter(
      (slot) =>
        slot.kind === "spell_list_class" && isMagicInitiateSourceLabel(slot.sourceLabel),
    )
    .slice()
    .sort((a, b) => {
      const aGranted = /:granted:/.test(a.sourceKey) ? 0 : 1
      const bGranted = /:granted:/.test(b.sourceKey) ? 0 : 1
      return aGranted - bGranted
    })
  if (!listSlots.length) return picks

  const claimed = new Set<string>()
  let next = picks
  let changed = false

  for (const slot of listSlots) {
    const list = normalizeMagicInitiateSpellList(picks[slot.slotKey]?.[0])
    if (!list) continue
    const key = list.toLowerCase()
    if (!claimed.has(key)) {
      claimed.add(key)
      continue
    }

    if (!changed) next = { ...picks }
    changed = true
    delete next[slot.slotKey]
    for (const candidate of slots) {
      if (candidate.sourceKey === slot.sourceKey && candidate.kind === "spell") {
        delete next[candidate.slotKey]
      }
    }
  }

  return changed ? next : picks
}
