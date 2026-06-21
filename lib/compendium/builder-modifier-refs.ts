import {
  linkedModifiersForFeat,
  type FeatSelectionEntry,
} from "@/lib/builder/feat-choices"
import { applyModifierPlayerPicks } from "@/lib/builder/modifier-player-choices"
import { featureChoiceKey, SUBCLASS_LEVEL } from "@/lib/builder/choices"
import { normalizeCharacteristics, type CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import {
  effectiveLinkedModifiers,
  resolveLinkedModifiers,
  type LinkedModifierInstance,
} from "@/lib/compendium/linked-modifiers"
import { resolveModifierRefIds, type ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import { readModifierRefs } from "@/lib/compendium/normalize-modifier-refs"
import type {
  Background,
  CustomAbility,
  DndClass,
  Feature,
  Feat,
  Species,
  Subclass,
  UsesConfig,
} from "@/lib/types"

export function characteristicsFromLinkedModifiers(
  catalog: ModifierCatalogEntry[],
  linked: LinkedModifierInstance[] | null | undefined,
  legacyRefs: string[] | null | undefined,
  legacy: CharacteristicModifier[] | null | undefined,
  uses?: UsesConfig | null,
): CharacteristicModifier[] {
  const instances = effectiveLinkedModifiers(linked, legacyRefs, catalog)
  const resolved = instances.length
    ? resolveLinkedModifiers(instances, catalog)
    : resolveModifierRefIds(legacyRefs, catalog)
  return [
    ...normalizeCharacteristics(resolved.characteristics, null),
    ...normalizeCharacteristics(legacy ?? null, uses ?? null),
  ]
}

/** @deprecated Use characteristicsFromLinkedModifiers */
export function characteristicsFromModifierRefs(
  catalog: ModifierCatalogEntry[],
  refIds: string[] | null | undefined,
  legacy: CharacteristicModifier[] | null | undefined,
  uses?: UsesConfig | null,
): CharacteristicModifier[] {
  return characteristicsFromLinkedModifiers(catalog, null, refIds, legacy, uses)
}

function collectLinkedFromFeature(
  feature: Feature,
  classId: string,
  featureChoicePicks: Record<string, string[]>,
  catalog: ModifierCatalogEntry[],
  instances: LinkedModifierInstance[],
): void {
  instances.push(...effectiveLinkedModifiers(feature.linkedModifiers, feature.modifierRefs, catalog))

  if (feature.isChoice && feature.choices?.options?.length) {
    const key = featureChoiceKey(classId, feature.name)
    const picked = featureChoicePicks[key] ?? []
    for (const optionName of picked) {
      const option = feature.choices.options.find((entry) => entry.name === optionName)
      if (!option) continue
      instances.push(...effectiveLinkedModifiers(option.linkedModifiers, option.modifierRefs, catalog))
    }
  }
}

function collectLinkedFromFeatures(
  features: Feature[],
  classId: string,
  maxLevel: number,
  featureChoicePicks: Record<string, string[]>,
  catalog: ModifierCatalogEntry[],
  instances: LinkedModifierInstance[],
): void {
  for (const feature of features) {
    if (feature.level > maxLevel) continue
    collectLinkedFromFeature(feature, classId, featureChoicePicks, catalog, instances)
  }
}

export function classAndSubclassLinkedModifiers(params: {
  classLevels: { classId: string; level: number }[]
  classes: DndClass[]
  subclasses: Subclass[]
  subclassByClassId: Record<string, string>
  featureChoicePicks: Record<string, string[]>
  catalog: ModifierCatalogEntry[]
}): LinkedModifierInstance[] {
  const { classLevels, classes, subclasses, subclassByClassId, featureChoicePicks, catalog } = params
  const instances: LinkedModifierInstance[] = []

  for (const entry of classLevels) {
    const cls = classes.find((c) => c.id === entry.classId)
    if (!cls) continue

    const batch: LinkedModifierInstance[] = []
    collectLinkedFromFeatures(cls.features ?? [], entry.classId, entry.level, featureChoicePicks, catalog, batch)

    const subclassId = subclassByClassId[entry.classId]
    if (subclassId && entry.level >= SUBCLASS_LEVEL) {
      const subclass = subclasses.find((s) => s.id === subclassId)
      if (subclass) {
        collectLinkedFromFeatures(
          subclass.features ?? [],
          entry.classId,
          entry.level,
          featureChoicePicks,
          catalog,
          batch,
        )
      }
    }

    instances.push(...filterSpellsKnownByClassLevel(batch, entry.level))
  }

  return instances
}

function filterSpellsKnownByClassLevel(
  instances: LinkedModifierInstance[],
  maxClassLevel: number,
): LinkedModifierInstance[] {
  return instances.map((instance) => {
    const characteristics = instance.characteristics
    if (!characteristics?.length) return instance

    let changed = false
    const nextCharacteristics = characteristics.map((char) => {
      if (char.type !== "spells_known") return char
      const spells = (char.spells ?? []).filter(
        (entry) => !entry.unlocksAtClassLevel || entry.unlocksAtClassLevel <= maxClassLevel,
      )
      if (spells.length === (char.spells ?? []).length) return char
      changed = true
      return { ...char, spells }
    })

    if (!changed) return instance
    return { ...instance, characteristics: nextCharacteristics }
  })
}

/** @deprecated Use classAndSubclassLinkedModifiers */
export function classAndSubclassFeatureModifierRefIds(params: {
  classLevels: { classId: string; level: number }[]
  classes: DndClass[]
  subclasses: Subclass[]
  subclassByClassId: Record<string, string>
  featureChoicePicks: Record<string, string[]>
}): string[] {
  const instances = classAndSubclassLinkedModifiers({ ...params, catalog: [] })
  return instances.map((instance) => instance.catalogRefId)
}

export function speciesTraitLinkedModifiers(
  species: Species | undefined,
  speciesTraitPicks: Record<string, string[]>,
  catalog: ModifierCatalogEntry[],
): LinkedModifierInstance[] {
  if (!species?.traits?.length) return []

  const instances: LinkedModifierInstance[] = []
  species.traits.forEach((trait, index) => {
    instances.push(...effectiveLinkedModifiers(trait.linkedModifiers, trait.modifierRefs, catalog))
    if (trait.isChoice && trait.choices?.options?.length) {
      const picked = speciesTraitPicks[String(index)] ?? []
      for (const optionName of picked) {
        const option = trait.choices.options.find((entry) => entry.name === optionName)
        if (!option) continue
        instances.push(...effectiveLinkedModifiers(option.linkedModifiers, option.modifierRefs, catalog))
      }
    }
  })
  return instances
}

/** @deprecated Use speciesTraitLinkedModifiers */
export function speciesTraitModifierRefIds(
  species: Species | undefined,
  speciesTraitPicks: Record<string, string[]>,
): string[] {
  return speciesTraitLinkedModifiers(species, speciesTraitPicks, []).map((instance) => instance.catalogRefId)
}

export function collectBuilderModifierRefIds(params: {
  catalog: ModifierCatalogEntry[]
  species?: Species
  speciesTraitPicks: Record<string, string[]>
  background?: Background | null
  feats: Feat[]
  selectedFeatIds: string[]
  /** Origin feat from background (not a milestone slot pick). */
  grantedFeatIds?: string[]
  featSelectionEntries?: FeatSelectionEntry[]
  featChoicePicks?: Record<string, string[]>
  modifierPlayerPicks?: Record<string, string[]>
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
    background,
    feats,
    selectedFeatIds,
    grantedFeatIds = [],
    featSelectionEntries = [],
    featChoicePicks = {},
    modifierPlayerPicks = {},
    classLevels,
    classes,
    subclasses,
    subclassByClassId,
    featureChoicePicks,
    customAbilities = [],
  } = params

  const speciesInstances = [
    ...effectiveLinkedModifiers(species?.linkedModifiers, species?.modifierRefs, catalog),
    ...speciesTraitLinkedModifiers(species, speciesTraitPicks, catalog),
  ]
  const speciesResolved = speciesInstances.length
    ? resolveLinkedModifiers(speciesInstances, catalog).characteristics
    : []

  const classInstances = classAndSubclassLinkedModifiers({
    classLevels,
    classes,
    subclasses,
    subclassByClassId,
    featureChoicePicks,
    catalog,
  })
  const classResolved = classInstances.length
    ? resolveLinkedModifiers(classInstances, catalog).characteristics
    : []

  const backgroundInstances = background?.feature
    ? effectiveLinkedModifiers(
        background.feature.linkedModifiers,
        background.feature.modifierRefs,
        catalog,
      )
    : []
  const backgroundResolved = backgroundInstances.length
    ? resolveLinkedModifiers(backgroundInstances, catalog).characteristics
    : []

  const featEntries =
    featSelectionEntries.length > 0
      ? featSelectionEntries
      : [...new Set([...selectedFeatIds, ...grantedFeatIds].filter(Boolean))].map((featId) => ({
          featId,
          choicePickKey: grantedFeatIds.includes(featId)
            ? `feat:granted:${featId}`
            : `feat:${featId}`,
        }))

  const featMods = featEntries.flatMap(({ featId, choicePickKey }) => {
    const feat = feats.find((entry) => entry.id === featId)
    if (!feat) return []
    const instances = linkedModifiersForFeat(feat, choicePickKey, featChoicePicks, catalog)
    const refs = feat.modifierRefs ?? readModifierRefs(feat as unknown as Record<string, unknown>)
    const mods = characteristicsFromLinkedModifiers(catalog, instances, refs, feat.benefits)
    return applyModifierPlayerPicks(mods, choicePickKey, modifierPlayerPicks)
  })

  const customAbilityMods = customAbilities.flatMap((ability) => {
    const refs = ability.modifierRefs ?? readModifierRefs(ability as unknown as Record<string, unknown>)
    return characteristicsFromLinkedModifiers(
      catalog,
      readLinkedModifiersFromAbility(ability),
      refs,
      ability.characteristics,
      ability.uses,
    )
  })

  return [
    ...normalizeCharacteristics(speciesResolved, null),
    ...normalizeCharacteristics(species?.characteristics ?? null, null),
    ...normalizeCharacteristics(classResolved, null),
    ...normalizeCharacteristics(backgroundResolved, null),
    ...featMods,
    ...customAbilityMods,
  ]
}

function readLinkedModifiersFromAbility(ability: CustomAbility): LinkedModifierInstance[] | null {
  const raw = ability as unknown as Record<string, unknown>
  if (!Array.isArray(raw.linkedModifiers) && !Array.isArray(raw.linked_modifiers)) return null
  return (raw.linkedModifiers ?? raw.linked_modifiers) as LinkedModifierInstance[]
}
