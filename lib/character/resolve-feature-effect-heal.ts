import { resolveFixedValueAtLevel } from "@/lib/compendium/bonus-by-level"
import { formatHitDiceRollSummary, rollHitDiceHeal } from "@/lib/character/hit-dice"
import { rollDice } from "@/lib/dice/roll-die"
import type { FeatureEffect } from "@/lib/types"

const DIE_SIDES: Record<string, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
}

export type HealResolveContext = {
  characterLevel: number
  proficiencyBonus: number
  abilityMods: Partial<Record<"STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA", number>>
  /** Class level for bonusByLevel heal dice (Miraculous Healing). */
  classLevel?: number
  /** Class hit die sides when healMode is hit_dice. */
  hitDieSides?: number | null
  random?: () => number
}

export function resolveHitDiceHealCount(
  effect: Pick<FeatureEffect, "healDiceCount" | "bonusByLevel">,
  classLevel: number,
): number {
  const base = effect.healDiceCount && effect.healDiceCount > 0 ? effect.healDiceCount : 1
  const scaled = resolveFixedValueAtLevel(effect.bonusByLevel, classLevel, base)
  return Math.max(1, scaled ?? base)
}

/** Resolve a heal_self / grant_temp_hp FeatureEffect to a non-negative integer amount. */
export function resolveFeatureEffectHealAmount(
  effect: FeatureEffect,
  ctx: HealResolveContext,
): number {
  return resolveFeatureEffectHeal(effect, ctx).amount
}

export function resolveFeatureEffectHeal(
  effect: FeatureEffect,
  ctx: HealResolveContext,
): { amount: number; summary?: string } {
  const abilityKey = effect.healAbility ?? null
  const abilityMod = abilityKey ? (ctx.abilityMods[abilityKey] ?? 0) : 0
  const mode = effect.healMode ?? (effect.healAmount != null ? "fixed" : null)

  if (mode === "hit_dice") {
    const count = resolveHitDiceHealCount(effect, ctx.classLevel ?? ctx.characterLevel)
    const die = ctx.hitDieSides != null && ctx.hitDieSides > 0 ? ctx.hitDieSides : 8
    const rolled = rollHitDiceHeal({
      die,
      count,
      conMod: abilityMod,
      random: ctx.random,
    })
    const amount = Math.max(0, Math.floor(rolled.total + (effect.healFlatBonus ?? 0)))
    return {
      amount,
      summary: formatHitDiceRollSummary({
        className: "",
        die,
        count,
        conMod: abilityMod,
        rolls: rolled.rolls,
        total: amount,
      }),
    }
  }

  let base = 0
  switch (mode) {
    case "fixed":
      base = effect.healFixed ?? effect.healAmount ?? 0
      break
    case "dice":
      if (effect.healDiceCount && effect.healDieType) {
        base = rollDice(effect.healDiceCount, DIE_SIDES[effect.healDieType] ?? 0)
      }
      break
    case "character_level":
      base = ctx.characterLevel * (effect.healLevelMultiplier ?? 1)
      break
    case "proficiency":
      base = ctx.proficiencyBonus * (effect.healProficiencyMultiplier ?? 1)
      break
    case "ability_modifier":
      base = abilityMod
      break
    default:
      base = effect.healFixed ?? effect.healAmount ?? 0
      break
  }

  return { amount: Math.max(0, Math.floor(base + (effect.healFlatBonus ?? 0))) }
}
