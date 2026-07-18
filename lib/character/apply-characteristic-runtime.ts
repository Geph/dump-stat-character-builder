import type {
  AbilityScoreKey,
  AbilityScoreOverrideCharacteristic,
  HealingReceivedModifierCharacteristic,
} from "@/lib/compendium/characteristic-modifiers"

/** Apply ability-score overrides (e.g. Physical Surge) onto already-summed scores. */
export function applyAbilityScoreOverrides(
  scores: Record<AbilityScoreKey, number>,
  overrides: AbilityScoreOverrideCharacteristic[],
  opts?: { chosenTargetsByOverrideId?: Record<string, AbilityScoreKey[]> },
): Record<AbilityScoreKey, number> {
  if (!overrides.length) return scores
  const next = { ...scores }
  for (const override of overrides) {
    const sourceScore = next[override.sourceAbility]
    if (sourceScore == null) continue
    let targets = override.targets ?? []
    if (override.chooseOneTarget) {
      const picked = opts?.chosenTargetsByOverrideId?.[override.id]?.filter((key) =>
        targets.includes(key),
      )
      targets = picked?.length ? picked : targets.slice(0, 1)
    }
    for (const target of targets) {
      next[target] = sourceScore
    }
  }
  return next
}

export type HealingReceivedContext = {
  /** Magical healing (spells, potions when includePotions applies, etc.). */
  magical?: boolean
  /** Potion / item-based healing. */
  fromPotion?: boolean
}

/** Multiply healing the character receives (Magical Anathema). */
export function applyHealingReceivedModifiers(
  amount: number,
  modifiers: HealingReceivedModifierCharacteristic[],
  context: HealingReceivedContext = {},
): number {
  if (!Number.isFinite(amount) || amount <= 0 || !modifiers.length) return amount
  let multiplier = 1
  for (const mod of modifiers) {
    if (mod.magicalOnly && !context.magical && !(mod.includePotions && context.fromPotion)) {
      continue
    }
    if (typeof mod.multiplier === "number" && Number.isFinite(mod.multiplier)) {
      multiplier *= mod.multiplier
    }
  }
  return Math.floor(amount * multiplier)
}
