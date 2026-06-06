import { featureChoiceKey, SUBCLASS_LEVEL } from "@/lib/builder/choices"
import { normalizeCharacteristics, type CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import { resolveModifierRefIds, type ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import { readModifierRefs } from "@/lib/compendium/normalize-modifier-refs"
import type { CustomAbility, DndClass, Feature, Feat, Species, Subclass } from "@/lib/types"

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

function collectFromFeature(
  feature: Feature,
  classId: string,
  featureChoicePicks: Record<string, string[]>,
  ids: string[],
): void {
  if (feature.modifierRefs?.length) ids.push(...feature.modifierRefs)

  if (
    feature.isChoice &&
    feature.choices?.options?.length
  ) {
    const key = featureChoiceKey(classId, feature.name)
    const picked = featureChoicePicks[key] ?? []
    for (const optionName of picked) {
      const option = feature.choices.options.find((entry) => entry.name === optionName)
      if (option?.modifierRefs?.length) ids.push(...option.modifierRefs)
    }
  }
}

export function classAndSubclassFeatureModifierRefIds(params: {
  classLevels: { classId: string; level: number }[]
  classes: DndClass[]
  subclasses: Subclass[]
  subclassByClassId: Record<string, string>
  featureChoicePicks: Record<string, string[]>
}): string[] {
  const { classLevels, classes, subclasses, subclassByClassId, featureChoicePicks } = params
  const ids: string[] = []

  for (const entry of classLevels) {
    const cls = classes.find((c) => c.id === entry.classId)
    if (!cls) continue

    for (const feature of cls.features ?? []) {
      if (feature.level > entry.level) continue
      collectFromFeature(feature, entry.classId, featureChoicePicks, ids)
    }

    const subclassId = subclassByClassId[entry.classId]
    if (subclassId && entry.level >= SUBCLASS_LEVEL) {
      const subclass = subclasses.find((s) => s.id === subclassId)
      if (subclass) {
        for (const feature of subclass.features ?? []) {
          if (feature.level > entry.level) continue
          collectFromFeature(feature, entry.classId, featureChoicePicks, ids)
        }
      }
    }
  }

  return ids
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
  classLevels: { classId: string; level: number }[]
  classes: DndClass[]
  subclasses: Subclass[]
  subclassByClassId: Record<string, string>
  featureChoicePicks: Record<string, string[]>
  customAbilities?: CustomAbility[]
}): CharacteristicModifier[] {
  const {
    catalog,
    species,
    speciesTraitPicks,
    feats,
    selectedFeatIds,
    classLevels,
    classes,
    subclasses,
    subclassByClassId,
    featureChoicePicks,
    customAbilities = [],
  } = params

  const speciesRefs = [
    ...(species?.modifierRefs ?? []),
    ...speciesTraitModifierRefIds(species, speciesTraitPicks),
  ]

  const classFeatureRefs = classAndSubclassFeatureModifierRefIds({
    classLevels,
    classes,
    subclasses,
    subclassByClassId,
    featureChoicePicks,
  })

  const featMods = selectedFeatIds
    .filter(Boolean)
    .flatMap((featId) => {
      const feat = feats.find((entry) => entry.id === featId)
      if (!feat) return []
      const refs = feat.modifierRefs ?? readModifierRefs(feat as unknown as Record<string, unknown>)
      return characteristicsFromModifierRefs(catalog, refs, feat.benefits)
    })

  const customAbilityMods = customAbilities.flatMap((ability) => {
    const refs = ability.modifierRefs ?? readModifierRefs(ability as unknown as Record<string, unknown>)
    return characteristicsFromModifierRefs(catalog, refs, ability.characteristics, ability.uses)
  })

  return [
    ...characteristicsFromModifierRefs(catalog, speciesRefs, species?.characteristics),
    ...characteristicsFromModifierRefs(catalog, classFeatureRefs, null),
    ...featMods,
    ...customAbilityMods,
  ]
}
