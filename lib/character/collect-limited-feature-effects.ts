import type { RollContext } from "@/lib/character/roll-context"
import {
  featureEffectMatchesRollContext,
  isFeatureRollModifierBlocked,
} from "@/lib/character/collect-feature-roll-modes"
import type { BonusByLevelEntry } from "@/lib/compendium/bonus-by-level"
import { normalizeBonusByLevel, resolveFixedValueAtLevel } from "@/lib/compendium/bonus-by-level"
import {
  abilityModifierKeyToScoreKey,
  type AbilityScoreKey,
} from "@/lib/compendium/characteristic-modifiers"
import { resolveCheckRollMode } from "@/lib/compendium/class-feature-metadata"
import type { LimitationEvaluationContext } from "@/lib/compendium/modifier-limitations"
import { modifierLimitationsMet } from "@/lib/compendium/modifier-limitations"
import type { RollBonusConfig } from "@/lib/compendium/roll-bonus-config"
import { rollDice } from "@/lib/dice/roll-die"
import type { Feature, FeatureEffect } from "@/lib/types"

export type ActiveFeatureEffect = {
  featureName: string
  effect: FeatureEffect
}

export type FeatureEffectCollectContext = LimitationEvaluationContext & {
  characterLevel?: number
  currentHp?: number
  maxHp?: number
  proficiencyBonus?: number
  abilityMods?: Record<AbilityScoreKey, number>
  /** Optional scope tags for save/attack context (e.g. "spell", "Frightened"). */
  rollTags?: string[]
  rollContext?: RollContext
  skillProficient?: boolean
  /** Current die size (sides) per class-resource key — e.g. { superiority_dice: 8 }. */
  classResourceDieSides?: Record<string, number>
}

function effectMatchesConditionScope(effect: FeatureEffect, ctx: FeatureEffectCollectContext): boolean {
  const scope = effect.checkConditionTypes ?? []
  if (!scope.length) return true
  const tags = ctx.rollTags ?? []
  if (tags.some((tag) => scope.some((entry) => entry.toLowerCase() === tag.toLowerCase()))) {
    return true
  }
  // When no explicit tags, scoped advantages still apply on matching roll context (sheet simplification).
  return !ctx.rollTags?.length
}

export function collectActiveFeatureEffects(
  features: Feature[],
  ctx: FeatureEffectCollectContext,
  predicate?: (effect: FeatureEffect) => boolean,
): ActiveFeatureEffect[] {
  const out: ActiveFeatureEffect[] = []
  for (const feature of features) {
    for (const instance of feature.linkedModifiers ?? []) {
      for (const effect of instance.activation?.effects ?? []) {
        if (predicate && !predicate(effect)) continue
        if (isFeatureRollModifierBlocked(effect, ctx)) continue
        if (!effectMatchesConditionScope(effect, ctx)) continue
        out.push({ featureName: feature.name ?? "Feature", effect })
      }
    }
  }
  return out
}

export function collectActiveCharacteristics<T extends { limitations?: import("@/lib/compendium/modifier-limitations").ModifierLimitation[] }>(
  mods: T[],
  ctx: LimitationEvaluationContext,
): T[] {
  return mods.filter((mod) => modifierLimitationsMet(mod, ctx))
}

function dieTypeToSides(dieType: RollBonusConfig["dieType"]): number | null {
  if (!dieType) return null
  const match = dieType.match(/^d(\d+)$/i)
  if (!match) return null
  const sides = parseInt(match[1], 10)
  return Number.isFinite(sides) ? sides : null
}

/** Resolve the rollable die size for a "die" mode RollBonusConfig, given class-resource sizes on hand. */
function resolveRollBonusDieSides(
  config: RollBonusConfig,
  classResourceDieSides: Record<string, number> | undefined,
): number | null {
  if (config.dieScaling === "class_resource") {
    if (!config.classResourceKey) return null
    return classResourceDieSides?.[config.classResourceKey] ?? null
  }
  return dieTypeToSides(config.dieType)
}

export function computeRollBonusAmount(
  config: RollBonusConfig | null | undefined,
  params: {
    proficiencyBonus: number
    abilityMods: Record<AbilityScoreKey, number>
    characterLevel: number
    /** Current die size (sides) per class-resource key, for "die" + "class_resource" bonuses. */
    classResourceDieSides?: Record<string, number>
    /** Current Class Cap / pool size per resource_key (Masterwork Bonus, etc.). */
    classResourceCounts?: Record<string, number>
  },
): number {
  if (!config) return 0
  let amount = 0
  switch (config.mode) {
    case "fixed":
      amount = config.fixed ?? 0
      break
    case "proficiency":
      amount = Math.floor(params.proficiencyBonus * (config.multiplier ?? 1))
      break
    case "ability_modifier": {
      const key = config.ability ? abilityModifierKeyToScoreKey(config.ability) : "strength"
      amount = params.abilityMods[key] ?? 0
      break
    }
    case "multiplier": {
      const base =
        config.ability != null
          ? params.abilityMods[abilityModifierKeyToScoreKey(config.ability)] ?? 0
          : params.proficiencyBonus
      amount = Math.floor(base * (config.multiplier ?? 1))
      break
    }
    case "character_level":
      amount = params.characterLevel
      break
    case "class_resource_count": {
      const key = config.classResourceKey?.trim()
      amount = key ? params.classResourceCounts?.[key] ?? 0 : 0
      break
    }
    case "die": {
      const sides = resolveRollBonusDieSides(config, params.classResourceDieSides)
      amount = sides != null ? rollDice(config.dieCount ?? 1, sides) : 0
      break
    }
    default:
      amount = 0
  }
  if (config.resultFloor?.mode === "fixed" && config.resultFloor.fixed != null) {
    amount = Math.max(amount, config.resultFloor.fixed)
  }
  if (config.resultFloor?.mode === "ability" && config.resultFloor.ability) {
    const key = abilityModifierKeyToScoreKey(config.resultFloor.ability)
    amount = Math.max(amount, params.abilityMods[key] ?? 0)
  }
  return amount
}

export function resolveBonusByLevelAtCharacterLevel(
  rows: BonusByLevelEntry[] | null | undefined,
  characterLevel: number,
): number {
  return resolveFixedValueAtLevel(normalizeBonusByLevel(rows), characterLevel, 0) ?? 0
}

export function collectFeatureRollBonuses(
  features: Feature[],
  context: RollContext,
  ctx: FeatureEffectCollectContext,
): { total: number; sources: string[] } {
  const active = collectActiveFeatureEffects(
    features,
    { ...ctx, rollContext: context },
    (effect) => resolveCheckRollMode(effect) === "bonus",
  )
  let total = 0
  const sources: string[] = []
  const params = {
    proficiencyBonus: ctx.proficiencyBonus ?? 2,
    abilityMods: ctx.abilityMods ?? {
      strength: 0,
      dexterity: 0,
      constitution: 0,
      intelligence: 0,
      wisdom: 0,
      charisma: 0,
    },
    characterLevel: ctx.characterLevel ?? 1,
    classResourceDieSides: ctx.classResourceDieSides,
  }

  for (const { featureName, effect } of active) {
    const matchesContext =
      featureEffectMatchesRollContext(effect, context) ||
      (effect.checkCategory === "ability" &&
        effect.bonusConfig?.bonusAppliesWhen === "non_proficient_skill_only" &&
        context.kind === "skill")
    if (!matchesContext) continue
    const config = effect.bonusConfig ?? null
    if (config?.bonusAppliesWhen === "non_proficient_skill_only") {
      if (context.kind === "skill" && ctx.skillProficient) continue
      if (context.kind !== "skill" && context.kind !== "ability") continue
    }
    const amount = computeRollBonusAmount(config, params)
    if (amount === 0) continue
    total += amount
    sources.push(featureName)
  }
  return { total, sources }
}

export function collectFeatureDamageBonuses(
  features: Feature[],
  ctx: FeatureEffectCollectContext,
): { flatBonus: number; sources: string[] } {
  const active = collectActiveFeatureEffects(
    features,
    ctx,
    (effect) => effect.kind === "bonus_damage_by_level",
  )
  let flatBonus = 0
  const sources: string[] = []
  for (const { featureName, effect } of active) {
    const bonus = resolveBonusByLevelAtCharacterLevel(
      effect.bonusByLevel,
      ctx.characterLevel ?? 1,
    )
    if (bonus === 0) continue
    flatBonus += bonus
    sources.push(featureName)
  }
  return { flatBonus, sources }
}

export type DamageMitigationEntry = {
  featureName: string
  mitigation: "resistance" | "immunity" | "reduction"
  damageTypes: string[]
  defensiveSaveScope?: boolean
  checkAbility?: string | null
}

export function collectFeatureDamageMitigation(
  features: Feature[],
  ctx: FeatureEffectCollectContext,
): DamageMitigationEntry[] {
  return collectActiveFeatureEffects(
    features,
    ctx,
    (effect) => effect.kind === "damage_reduction",
  ).map(({ featureName, effect }) => ({
    featureName,
    mitigation: effect.mitigation ?? "reduction",
    damageTypes: effect.damageTypes ?? [],
    defensiveSaveScope: effect.defensiveSaveScope ?? false,
    checkAbility: effect.checkAbility ?? null,
  }))
}

export function hasEvasionActive(
  features: Feature[],
  ctx: FeatureEffectCollectContext,
): boolean {
  return collectActiveFeatureEffects(
    features,
    ctx,
    (effect) => effect.kind === "damage_reduction" && !!effect.defensiveSaveScope,
  ).length > 0
}
