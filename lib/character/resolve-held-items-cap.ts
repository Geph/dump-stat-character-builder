import type { AggregatedCharacteristics } from "@/lib/compendium/characteristic-modifiers"
import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"

/** Held craftable-item cap (INT mod by default + aggregated flat bonuses). */
export function resolveHeldItemsCap(
  aggregated: Pick<AggregatedCharacteristics, "heldItemsCapAbility" | "heldItemsCapBonus">,
  abilityMods: Record<AbilityScoreKey, number>,
): number {
  const ability = aggregated.heldItemsCapAbility ?? "intelligence"
  return Math.max(0, (abilityMods[ability] ?? 0) + aggregated.heldItemsCapBonus)
}
