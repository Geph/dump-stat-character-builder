import { normalizeCharacteristics, type CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import { resolveModifierRefIds, type ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import type { Species, Feat, Trait } from "@/lib/types"

export function characteristicsFromModifierRefs(
  catalog: ModifierCatalogEntry[],
  refIds: string[] | null | undefined,
  legacy: CharacteristicModifier[] | null | undefined,
  uses?: unknown,
): CharacteristicModifier[] {
  const resolved = resolveModifierRefIds(refIds, catalog)
  return [
    ...normalizeCharacteristics(resolved.characteristics, null),
    ...normalizeCharacteristics(legacy ?? null, uses ?? null),
  ]
}

export function speciesTraitModifierRefIds(
  species: Species | undefined,
  speciesTraitPicks: Record<string, string[]>,
): string[] {
  if (!species?.traits?.length) return []

  const ids: string[] = []
  species.traits.forEach((trait, index) => {
    if (trait.modifierRefs?.length) ids.push(...trait.modifierRefs)
    if (trait.isChoice && trait.choices?.options?.length) {
      const picked = speciesTraitPicks[String(index)] ?? []
      for (const optionName of picked) {
        const option = trait.choices.options.find((entry) => entry.name === optionName)
        if (option?.modifierRefs?.length) ids.push(...option.modifierRefs)
      }
    }
  })
  return ids
}

export function collectBuilderModifierRefIds(params: {
  catalog: ModifierCatalogEntry[]
  species?: Species
  speciesTraitPicks: Record<string, string[]>
  feats: Feat[]
  selectedFeatIds: string[]
}): CharacteristicModifier[] {
  const { catalog, species, speciesTraitPicks, feats, selectedFeatIds } = params

  const speciesRefs = [
    ...(species?.modifierRefs ?? []),
    ...speciesTraitModifierRefIds(species, speciesTraitPicks),
  ]

  const featRefs = selectedFeatIds
    .filter(Boolean)
    .flatMap((featId) => {
      const feat = feats.find((entry) => entry.id === featId)
      if (!feat) return []
      return characteristicsFromModifierRefs(catalog, feat.modifier_refs, feat.benefits)
    })

  return [
    ...characteristicsFromModifierRefs(catalog, speciesRefs, species?.characteristics),
    ...featRefs,
  ]
}
