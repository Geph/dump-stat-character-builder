import type { RollContext } from "@/lib/character/roll-context"
import { collectActiveFeatureEffects } from "@/lib/character/collect-limited-feature-effects"
import type { LimitationEvaluationContext } from "@/lib/compendium/modifier-limitations"
import { modifierLimitationsMet } from "@/lib/compendium/modifier-limitations"
import { resolveCheckRollMode } from "@/lib/compendium/class-feature-metadata"
import { combineRollModes, type D20RollMode } from "@/lib/dice/d20-roll"
import type { Feature, FeatureEffect } from "@/lib/types"

const ABILITY_FULL_NAMES: Record<string, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
}

function abilityNamesMatch(
  effectAbility: string | null | undefined,
  contextAbility: string | undefined,
): boolean {
  if (!effectAbility || !contextAbility) return !effectAbility
  const normalizedEffect = effectAbility.toLowerCase()
  const normalizedContext = contextAbility.toLowerCase()
  return (
    normalizedEffect === normalizedContext ||
    normalizedEffect.startsWith(normalizedContext.slice(0, 3)) ||
    normalizedContext.startsWith(normalizedEffect.slice(0, 3))
  )
}

export function featureEffectMatchesRollContext(
  effect: FeatureEffect,
  context: RollContext,
): boolean {
  const category = effect.checkCategory
  if (!category || category === "other") return false

  if (category === "initiative") return context.kind === "initiative"
  if (category === "attack") return context.kind === "attack"
  if (category === "spell_attack") return context.kind === "spell_attack"
  if (category === "spell_save_dc") return context.kind === "spell_save_dc"

  if (category === "ability") {
    if (context.kind !== "ability") return false
    return abilityNamesMatch(effect.checkAbility, context.ability)
  }

  if (category === "death_save") return context.kind === "death_save"

  if (category === "save") {
    if (context.kind === "death_save") {
      // Death Saving Throws aren't tied to an ability score — only generic "advantage on all
      // saving throws" effects (no checkAbility set) apply, not ability-specific ones (e.g.
      // Wisdom saves). Effects scoped to death saves specifically should use "death_save".
      return !effect.checkAbility
    }
    if (context.kind !== "save") return false
    return abilityNamesMatch(effect.checkAbility, context.ability)
  }

  if (category === "skill") {
    if (context.kind !== "skill" || !context.skillName) return false
    if (!effect.checkSkills?.length) return true
    return effect.checkSkills.includes(context.skillName)
  }

  return false
}

export function isFeatureRollModifierBlocked(
  effect: FeatureEffect,
  limitationCtx: LimitationEvaluationContext = {},
): boolean {
  return !modifierLimitationsMet(effect, limitationCtx)
}

export function collectFeatureRollModes(
  features: Feature[],
  context: RollContext,
  limitationCtx: LimitationEvaluationContext = {},
): { mode: D20RollMode; sources: string[] } {
  const modes: D20RollMode[] = []
  const sources: string[] = []

  const active = collectActiveFeatureEffects(
    features,
    {
      ...limitationCtx,
      rollContext: context,
      rollTags: context.rollTags,
    },
    (effect) => {
      const rollMode = resolveCheckRollMode(effect)
      return rollMode === "advantage" || rollMode === "disadvantage"
    },
  )

  for (const { featureName, effect } of active) {
    const rollMode = resolveCheckRollMode(effect)
    if (rollMode !== "advantage" && rollMode !== "disadvantage") continue
    if (!featureEffectMatchesRollContext(effect, context)) continue
    modes.push(rollMode)
    sources.push(featureName)
  }

  return { mode: combineRollModes(modes), sources }
}

/** Lowest deathSaveCritThreshold across active features (e.g. Champion's Survivor: 18), or 20 if none. */
export function collectDeathSaveCritThreshold(
  features: Feature[],
  limitationCtx: LimitationEvaluationContext = {},
): number {
  const active = collectActiveFeatureEffects(
    features,
    limitationCtx,
    (effect) => effect.deathSaveCritThreshold != null,
  )
  let threshold = 20
  for (const { effect } of active) {
    if (effect.deathSaveCritThreshold != null) {
      threshold = Math.min(threshold, effect.deathSaveCritThreshold)
    }
  }
  return threshold
}

export function featureAlreadyGrantsCheckRoll(
  feature: Feature,
  category: FeatureEffect["checkCategory"],
  ability?: string | null,
): boolean {
  for (const instance of feature.linkedModifiers ?? []) {
    for (const effect of instance.activation?.effects ?? []) {
      const rollMode = resolveCheckRollMode(effect)
      if (rollMode !== "advantage" && rollMode !== "disadvantage") continue
      if (effect.checkCategory !== category) continue
      if (ability && !abilityNamesMatch(effect.checkAbility, ability.toLowerCase())) continue
      return true
    }
  }
  return false
}

export { ABILITY_FULL_NAMES }
