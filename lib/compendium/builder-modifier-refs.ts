import {
  isCatalogFeatPickId,
  resolveCatalogFeatPickCharacteristics,
} from "@/lib/builder/catalog-feat-options"
import {
  linkedModifiersForFeat,
  type FeatSelectionEntry,
} from "@/lib/builder/feat-choices"
import {
  applyModifierPlayerPicks,
  speciesModsSourceKey,
  speciesTraitSourceKey,
} from "@/lib/builder/modifier-player-choices"
import { featureChoiceKey, SUBCLASS_LEVEL } from "@/lib/builder/choices"
import { normalizeCharacteristics, type CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import {
  effectiveLinkedModifiers,
  readLinkedModifiers,
  resolveLinkedModifiers,
  type LinkedModifierInstance,
} from "@/lib/compendium/linked-modifiers"
import { resolveModifierRefIds, type ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import { readModifierRefs } from "@/lib/compendium/normalize-modifier-refs"
import { migrateFeatureOptionPickers } from "@/lib/compendium/feature-option-choice-migration"
import { tagModifierSource } from "@/lib/character/tag-modifier-source"
import type {
  Background,
  CustomAbility,
  DndClass,
  Feature,
  Feat,
  Species,
  Subclass,
} from "@/lib/types"

export function characteristicsFromLinkedModifiers(
  catalog: ModifierCatalogEntry[],
  linked: LinkedModifierInstance[] | null | undefined,
  legacyRefs: string[] | null | undefined,
): CharacteristicModifier[] {
  const instances = effectiveLinkedModifiers(linked, legacyRefs, catalog)
  const resolved = instances.length
    ? resolveLinkedModifiers(instances, catalog)
    : resolveModifierRefIds(legacyRefs, catalog)
  return normalizeCharacteristics(resolved.characteristics, null)
}

function collectLinkedFromFeature(
  rawFeature: Feature,
  classId: string,
  featureChoicePicks: Record<string, string[]>,
  catalog: ModifierCatalogEntry[],
  instances: LinkedModifierInstance[],
): void {
  const feature = migrateFeatureOptionPickers(rawFeature)
  instances.push(...effectiveLinkedModifiers(feature.linkedModifiers, feature.modifierRefs, catalog))

  if (feature.isChoice && feature.choices?.options?.length) {
    const key = featureChoiceKey(classId, feature.name, feature.level)
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

function classCharacteristicsWithPlayerPicks(params: {
  classLevels: { classId: string; level: number }[]
  classes: DndClass[]
  subclasses: Subclass[]
  subclassByClassId: Record<string, string>
  featureChoicePicks: Record<string, string[]>
  modifierPlayerPicks: Record<string, string[]>
  catalog: ModifierCatalogEntry[]
}): CharacteristicModifier[] {
  const {
    classLevels,
    classes,
    subclasses,
    subclassByClassId,
    featureChoicePicks,
    modifierPlayerPicks,
    catalog,
  } = params

  const mods: CharacteristicModifier[] = []

  for (const entry of classLevels) {
    const cls = classes.find((candidate) => candidate.id === entry.classId)
    if (!cls) continue

    const processFeatures = (features: Feature[]) => {
      for (const rawFeature of features) {
        if (rawFeature.level > entry.level) continue
        const instances: LinkedModifierInstance[] = []
        collectLinkedFromFeature(rawFeature, entry.classId, featureChoicePicks, catalog, instances)
        const filtered = filterSpellsKnownByClassLevel(instances, entry.level)
        const key = featureChoiceKey(entry.classId, rawFeature.name, rawFeature.level)
        const chars = characteristicsFromLinkedModifiers(catalog, filtered, rawFeature.modifierRefs)
        mods.push(...applyModifierPlayerPicks(chars, key, modifierPlayerPicks))
      }
    }

    processFeatures(cls.features ?? [])

    const subclassId = subclassByClassId[entry.classId]
    if (subclassId && entry.level >= SUBCLASS_LEVEL) {
      const subclass = subclasses.find((candidate) => candidate.id === subclassId)
      if (subclass) processFeatures(subclass.features ?? [])
    }
  }

  return mods
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

/**
 * Resolve species characteristics, applying the player's skill/tool/language/spell picks
 * per source (species-wide and per trait) so they match the slots surfaced at Origin.
 */
function speciesCharacteristicsWithPlayerPicks(
  species: Species | undefined,
  speciesTraitPicks: Record<string, string[]>,
  modifierPlayerPicks: Record<string, string[]>,
  catalog: ModifierCatalogEntry[],
): CharacteristicModifier[] {
  if (!species) return []
  const mods: CharacteristicModifier[] = []

  const speciesRow = species as unknown as Record<string, unknown>
  const speciesWide = characteristicsFromLinkedModifiers(
    catalog,
    readLinkedModifiers(speciesRow, catalog),
    readModifierRefs(speciesRow),
  )
  mods.push(
    ...tagModifierSource(
      applyModifierPlayerPicks(speciesWide, speciesModsSourceKey(species.id), modifierPlayerPicks),
      {
        sourceType: "species",
        source: species.name,
        label: species.name,
        sourceId: species.id,
      },
    ),
  )

  species.traits?.forEach((trait, index) => {
    const sourceKey = speciesTraitSourceKey(species.id, index)
    const instances: LinkedModifierInstance[] = [
      ...effectiveLinkedModifiers(trait.linkedModifiers, trait.modifierRefs, catalog),
    ]
    if (trait.isChoice && trait.choices?.options?.length) {
      const picked = speciesTraitPicks[String(index)] ?? []
      for (const optionName of picked) {
        const option = trait.choices.options.find((entry) => entry.name === optionName)
        if (!option) continue
        instances.push(
          ...effectiveLinkedModifiers(option.linkedModifiers, option.modifierRefs, catalog),
        )
      }
    }
    const chars = instances.length
      ? characteristicsFromLinkedModifiers(catalog, instances, trait.modifierRefs)
      : []
    mods.push(
      ...tagModifierSource(applyModifierPlayerPicks(chars, sourceKey, modifierPlayerPicks), {
        sourceType: "species",
        source: trait.name,
        label: trait.name,
        sourceId: species.id,
      }),
    )
  })

  return mods
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

  const speciesResolved = speciesCharacteristicsWithPlayerPicks(
    species,
    speciesTraitPicks,
    modifierPlayerPicks,
    catalog,
  )

  const classResolved = classCharacteristicsWithPlayerPicks({
    classLevels,
    classes,
    subclasses,
    subclassByClassId,
    featureChoicePicks,
    modifierPlayerPicks,
    catalog,
  })

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
    if (isCatalogFeatPickId(featId)) {
      return tagModifierSource(
        applyModifierPlayerPicks(
          resolveCatalogFeatPickCharacteristics(featId, customAbilities, catalog),
          choicePickKey,
          modifierPlayerPicks,
        ),
        { sourceType: "feat", source: "Feat choice", label: "Feat choice" },
      )
    }
    const feat = feats.find((entry) => entry.id === featId)
    if (!feat) return []
    const instances = linkedModifiersForFeat(feat, choicePickKey, featChoicePicks, catalog)
    const refs = feat.modifierRefs ?? readModifierRefs(feat as unknown as Record<string, unknown>)
    const mods = characteristicsFromLinkedModifiers(catalog, instances, refs)
    return tagModifierSource(applyModifierPlayerPicks(mods, choicePickKey, modifierPlayerPicks), {
      sourceType: "feat",
      source: feat.name,
      label: feat.name,
      sourceId: feat.id,
    })
  })

  const customAbilityMods = customAbilities.flatMap((ability) => {
    const row = ability as unknown as Record<string, unknown>
    const linked = readLinkedModifiers(row, catalog)
    const refs = ability.modifierRefs ?? readModifierRefs(row)
    return tagModifierSource(
      characteristicsFromLinkedModifiers(catalog, linked, refs),
      {
        sourceType: "feature",
        source: ability.name,
        label: ability.name,
        sourceId: ability.id,
      },
    )
  })

  return [
    ...speciesResolved,
    ...tagModifierSource(normalizeCharacteristics(classResolved, null), {
      sourceType: "class",
      source: "Class features",
      label: "Class features",
    }),
    ...tagModifierSource(normalizeCharacteristics(backgroundResolved, null), {
      sourceType: "background",
      source: background?.name ?? "Background",
      label: background?.name ?? "Background",
      sourceId: background?.id,
    }),
    ...featMods,
    ...customAbilityMods,
  ]
}
