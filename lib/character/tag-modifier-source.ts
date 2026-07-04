import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import type { StatContributionSource } from "@/lib/character/stat-contributions"

export type SourcedCharacteristicModifier = CharacteristicModifier & {
  _contributionSource?: StatContributionSource
}

export function tagModifierSource(
  mods: CharacteristicModifier[],
  source: StatContributionSource,
): SourcedCharacteristicModifier[] {
  return mods.map((mod) => ({ ...mod, _contributionSource: source }))
}

export function readModifierSource(mod: CharacteristicModifier): StatContributionSource | undefined {
  return (mod as SourcedCharacteristicModifier)._contributionSource
}
