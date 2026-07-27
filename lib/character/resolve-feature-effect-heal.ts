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
}

/** Resolve a heal_self / grant_temp_hp FeatureEffect to a non-negative integer amount. */
export function resolveFeatureEffectHealAmount(
  effect: FeatureEffect,
  ctx: HealResolveContext,
): number {
  const abilityKey = effect.healAbility ?? null
  const abilityMod = abilityKey ? (ctx.abilityMods[abilityKey] ?? 0) : 0
  const mode = effect.healMode ?? (effect.healAmount != null ? "fixed" : null)

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

  return Math.max(0, Math.floor(base + (effect.healFlatBonus ?? 0)))
}
