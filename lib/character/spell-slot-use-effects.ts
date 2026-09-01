/**
 * Reads spell-slot spend/restore wiring off `class_resource` FeatureEffects so the sheet does not
 * have to special-case Magical Cunning / Arcane Recovery / Dark Arcana / Traditional Expertise by
 * name. Two `classResourceKey` values are reserved and route to the spell-slot trackers instead of
 * a `class_resources` row:
 *
 * - `pact_magic_slots` — the Warlock pact table (also mirrored onto the resource of the same id).
 * - `spell_slots` — every non-pact table.
 *
 * See `docs/custom-modifiers.md` ("Same-name overlap") before adding another reserved key.
 */
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { FeatureEffect } from "@/lib/types"

export const PACT_SLOT_RESOURCE_KEY = "pact_magic_slots"
export const SPELL_SLOT_RESOURCE_KEY = "spell_slots"

/** Slot hooks a feature can declare, mirroring the matching `SheetActionEntry` fields. */
export type SpellSlotUseEffects = {
  restorePactSlotsOnUse?: "half_round_up" | "all"
  restoreSpellSlotsOnUse?: { mode: "combined_level_half_up"; maxSlotLevel: number }
  restoreResourceFromSpellSlotOnUse?: {
    resourceKey: string
    ability: "INT" | "WIS" | "CHA" | "STR" | "DEX" | "CON"
  }
  spendSpellSlotOnUse?: { minSpellLevel: number }
}

type SlotEffectSource = {
  name?: string
  activation?: { effects?: FeatureEffect[] | null } | null
  linkedModifiers?: LinkedModifierInstance[] | null
}

const DEFAULT_MAX_RECOVERED_SLOT_LEVEL = 5

function classResourceEffects(item: SlotEffectSource): FeatureEffect[] {
  const effects: FeatureEffect[] = []
  const push = (list: FeatureEffect[] | null | undefined) => {
    for (const effect of list ?? []) {
      if (effect?.kind === "class_resource") effects.push(effect)
    }
  }
  push(item.activation?.effects)
  for (const instance of item.linkedModifiers ?? []) push(instance.activation?.effects)
  return effects
}

function normalizeKey(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase()
}

/**
 * Map the `class_resource` effects on one feature onto the sheet's slot hooks. Returns an empty
 * object when the feature does not touch spell slots, so callers can spread the result.
 */
export function resolveSpellSlotUseEffects(item: SlotEffectSource): SpellSlotUseEffects {
  const resolved: SpellSlotUseEffects = {}
  for (const effect of classResourceEffects(item)) {
    const key = normalizeKey(effect.classResourceKey)
    const change = effect.classResourceChange

    if (key === PACT_SLOT_RESOURCE_KEY && change === "reset") {
      resolved.restorePactSlotsOnUse =
        effect.resourceRefreshFormula === "full" ? "all" : "half_round_up"
      continue
    }

    if (key === SPELL_SLOT_RESOURCE_KEY && change === "reset") {
      resolved.restoreSpellSlotsOnUse = {
        mode: "combined_level_half_up",
        maxSlotLevel: effect.spellSlotMaxLevel ?? DEFAULT_MAX_RECOVERED_SLOT_LEVEL,
      }
      continue
    }

    if (key === SPELL_SLOT_RESOURCE_KEY && change === "reduce") {
      resolved.spendSpellSlotOnUse = { minSpellLevel: effect.spellSlotMinLevel ?? 1 }
      continue
    }

    if (change === "increase" && effect.restoreFromSpellSlot && key) {
      resolved.restoreResourceFromSpellSlotOnUse = {
        resourceKey: effect.classResourceKey?.trim() ?? key,
        ability: effect.classResourceAmountConfig?.ability ?? "INT",
      }
    }
  }
  return resolved
}

/**
 * Feature names another feature upgrades to a full pool restore (Eldritch Master → Magical
 * Cunning). Driven by `regainAllOnLinkedFeatureUse` + `linkedFeatureName` so the upgrade is
 * authored on the Compendium row instead of matched by name in the sheet.
 */
export function collectFullRestoreLinkedFeatureNames(items: SlotEffectSource[]): Set<string> {
  const names = new Set<string>()
  for (const item of items) {
    for (const effect of classResourceEffects(item)) {
      if (!effect.regainAllOnLinkedFeatureUse) continue
      const linked = effect.linkedFeatureName?.trim().toLowerCase()
      if (linked) names.add(linked)
    }
  }
  return names
}
