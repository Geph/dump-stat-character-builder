/**
 * Reads Hit Dice spend/restore wiring off `class_resource` FeatureEffects so the sheet does not
 * treat HD as a `class_resources` row. One `classResourceKey` is reserved and routes to the
 * sheet Hit Dice tracker:
 *
 * - `hit_dice` (aliases: `hit_point_dice`, `hit_point_die`)
 *
 * Same pattern as `spell_slots` / `pact_magic_slots` in `spell-slot-use-effects.ts`.
 * See `docs/custom-modifiers.md`.
 */
import { resolveFixedValueAtLevel } from "@/lib/compendium/bonus-by-level"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { FeatureEffect } from "@/lib/types"

export const HIT_DICE_RESOURCE_KEY = "hit_dice"

const HIT_DICE_RESOURCE_ALIASES = new Set([
  HIT_DICE_RESOURCE_KEY,
  "hit_point_dice",
  "hit_point_die",
])

export type HitDiceUseEffects = {
  /** `class_resource` reduce — omitted when the feature only restores HD. */
  spendHitDiceOnUse?: number
  /** `class_resource` increase amount, or `all` for reset. */
  restoreHitDiceOnUse?: number | "all"
}

type HitDiceEffectSource = {
  activation?: { effects?: FeatureEffect[] | null } | null
  linkedModifiers?: LinkedModifierInstance[] | null
  limitedUses?: { type?: string; classResourceKey?: string; classResourceAmount?: number } | null
}

function classResourceEffects(item: HitDiceEffectSource): FeatureEffect[] {
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

export function normalizeResourceKey(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_")
}

export function isHitDiceResourceKey(key: string | null | undefined): boolean {
  return HIT_DICE_RESOURCE_ALIASES.has(normalizeResourceKey(key))
}

function resolveEffectAmount(effect: FeatureEffect, classLevel: number): number {
  const base = Math.max(1, effect.classResourceAmount ?? 1)
  const scaled = resolveFixedValueAtLevel(effect.bonusByLevel, classLevel, base)
  return Math.max(1, scaled ?? base)
}

/**
 * Map the reserved `hit_dice` `class_resource` effects on one feature onto spend/restore hooks.
 */
export function resolveHitDiceUseEffects(
  item: HitDiceEffectSource,
  classLevel = 1,
): HitDiceUseEffects {
  const resolved: HitDiceUseEffects = {}
  for (const effect of classResourceEffects(item)) {
    if (!isHitDiceResourceKey(effect.classResourceKey)) continue
    const change = effect.classResourceChange
    if (change === "reduce" || change == null) {
      resolved.spendHitDiceOnUse = resolveEffectAmount(effect, classLevel)
      continue
    }
    if (change === "reset") {
      resolved.restoreHitDiceOnUse = "all"
      continue
    }
    if (change === "increase") {
      resolved.restoreHitDiceOnUse = resolveEffectAmount(effect, classLevel)
    }
  }
  return resolved
}

/** True when this action's limitedUses / menu pool is the sheet Hit Dice tracker. */
export function limitedUsesSpendHitDice(item: HitDiceEffectSource): boolean {
  return (
    item.limitedUses?.type === "class_resource" &&
    isHitDiceResourceKey(item.limitedUses.classResourceKey)
  )
}
