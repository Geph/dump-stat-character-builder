import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import type { MagicInitiateSpellList } from "@/lib/compendium/background-origin-feat"
import type { ModifierPlayerChoiceSlot } from "@/lib/builder/modifier-player-choices"

export const MAGIC_INITIATE_ABILITY_OPTIONS: AbilityScoreKey[] = [
  "intelligence",
  "wisdom",
  "charisma",
]

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

/** True when this modifier source is a Magic Initiate feat grant/pick. */
export function isMagicInitiateSourceLabel(sourceLabel: string | null | undefined): boolean {
  return /^magic initiate\b/i.test((sourceLabel ?? "").trim())
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

/** Filter ability options so each Magic Initiate take uses a distinct ability. */
export function filterMagicInitiateAbilitySlotOptions(
  slot: ModifierPlayerChoiceSlot,
  slots: readonly ModifierPlayerChoiceSlot[],
  picks: Record<string, string[]>,
): ModifierPlayerChoiceSlot {
  if (slot.kind !== "spellcasting_ability") return slot
  if (!isMagicInitiateSourceLabel(slot.sourceLabel)) return slot
  const taken = takenMagicInitiateAbilities(slots, picks, slot.slotKey)
  const current = normalizeSpellcastingAbilityPick(picks[slot.slotKey]?.[0])
  return {
    ...slot,
    options: (slot.options ?? []).filter((option) => {
      const ability = normalizeSpellcastingAbilityPick(option.name)
      if (!ability) return true
      if (current && ability === current) return true
      return !taken.has(ability)
    }),
  }
}

/**
 * Whether another Magic Initiate may still be taken (at least one ability free).
 * When `currentSlotFeatIsMagicInitiate`, the current slot does not consume capacity.
 */
export function canTakeAnotherMagicInitiate(params: {
  slots: readonly ModifierPlayerChoiceSlot[]
  picks: Record<string, string[]>
  /** Ability options available on Magic Initiate (defaults to INT/WIS/CHA). */
  abilityOptions?: readonly AbilityScoreKey[]
}): boolean {
  const options = params.abilityOptions?.length
    ? params.abilityOptions
    : MAGIC_INITIATE_ABILITY_OPTIONS
  const taken = takenMagicInitiateAbilities(params.slots, params.picks)
  return options.some((ability) => !taken.has(ability))
}
