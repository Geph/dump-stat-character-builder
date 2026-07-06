import { normalizeBackgroundAbilityBonuses } from "@/lib/compendium/background-utils"
import {
  ABILITY_MODIFIER_KEYS,
  ABILITY_SCORE_KEYS,
  abilityModifierKeyToScoreKey,
  type AbilityModifierKey,
  type AbilityScoreKey,
} from "@/lib/compendium/characteristic-modifiers"
import type { Background } from "@/lib/types"

export { ABILITY_MODIFIER_KEYS as BACKGROUND_ABILITY_FILTER_OPTIONS }

export function getBackgroundFilterableAbilities(
  background: Pick<Background, "ability_bonuses">,
): AbilityScoreKey[] {
  if (background.ability_bonuses === null) {
    return [...ABILITY_SCORE_KEYS]
  }

  const normalized = normalizeBackgroundAbilityBonuses(background.ability_bonuses)
  return (Object.keys(normalized) as AbilityScoreKey[]).filter((key) =>
    (ABILITY_SCORE_KEYS as readonly string[]).includes(key),
  )
}

export function backgroundMatchesAbilityFilter(
  background: Pick<Background, "ability_bonuses">,
  selected: readonly AbilityModifierKey[],
): boolean {
  if (selected.length === 0) return true

  const selectedKeys = new Set(selected.map(abilityModifierKeyToScoreKey))
  return getBackgroundFilterableAbilities(background).some((ability) => selectedKeys.has(ability))
}
