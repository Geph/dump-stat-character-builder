/**
 * Reads "regain uses of a named pool when you use this" wiring off `class_resource` FeatureEffects
 * (Martial Recovery: regain all expended Battle Dice as a Bonus Action). Reserved keys
 * (`hit_dice`, `spell_slots`, `pact_magic_slots`) have their own hooks, and effects that carry an
 * Initiative / Critical Hit / rest trigger are refreshes run by `collect-resource-refresh-effects.ts`,
 * not on-Use restores.
 */
import { isHitDiceResourceKey } from "@/lib/character/hit-dice-use-effects"
import { PACT_SLOT_RESOURCE_KEY, SPELL_SLOT_RESOURCE_KEY } from "@/lib/character/spell-slot-use-effects"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { FeatureEffect } from "@/lib/types"

export type ClassResourceRestoreOnUse = {
  resourceKey: string
  /** Uses regained, or `all` to refill the pool. */
  amount: number | "all"
}

type RestoreEffectSource = {
  activation?: { effects?: FeatureEffect[] | null } | null
  linkedModifiers?: LinkedModifierInstance[] | null
}

function isOnUseRestore(effect: FeatureEffect): boolean {
  if (effect.kind !== "class_resource") return false
  if (effect.classResourceChange !== "reset" && effect.classResourceChange !== "increase") return false
  const key = effect.classResourceKey?.trim()
  if (!key || isHitDiceResourceKey(key)) return false
  if (key === SPELL_SLOT_RESOURCE_KEY || key === PACT_SLOT_RESOURCE_KEY) return false
  return !(
    effect.restoreFromSpellSlot ||
    effect.resourceRefreshOnInitiative ||
    effect.resourceRefreshOnCriticalHit ||
    effect.resourceRefreshOnRest ||
    effect.regainAllOnLinkedFeatureUse
  )
}

export function resolveClassResourceRestoreOnUse(
  item: RestoreEffectSource,
): ClassResourceRestoreOnUse | undefined {
  const effects = [
    ...(item.activation?.effects ?? []),
    ...(item.linkedModifiers ?? []).flatMap((instance) => instance.activation?.effects ?? []),
  ]
  const effect = effects.find(isOnUseRestore)
  if (!effect) return undefined
  const resourceKey = effect.classResourceKey!.trim()
  if (effect.classResourceChange === "reset") {
    const cap = effect.classResourceAmount
    return { resourceKey, amount: cap != null && cap > 0 ? cap : "all" }
  }
  return { resourceKey, amount: Math.max(1, effect.classResourceAmount ?? 1) }
}
