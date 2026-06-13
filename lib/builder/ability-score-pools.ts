import { featureChoiceKey, SUBCLASS_LEVEL } from "@/lib/builder/choices"
import {
  ASI_POINTS_PER_PICK,
  isValidAsiAllocation,
  type AsiAllocationsByFeatId,
} from "@/lib/builder/asi-allocation"
import {
  ABILITY_SCORE_KEYS,
  normalizeCharacteristics,
  type AbilityScoreKey,
  type CharacteristicModifier,
} from "@/lib/compendium/characteristic-modifiers"
import {
  effectiveLinkedModifiers,
  resolveLinkedModifierInstance,
  type LinkedModifierInstance,
} from "@/lib/compendium/linked-modifiers"
import { catalogEntryById, type ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import { readModifierRefs } from "@/lib/compendium/normalize-modifier-refs"
import type { DndClass, Feat, Feature, Species, Subclass } from "@/lib/types"

export type AbilityScorePoolGrant = {
  allocationKey: string
  label: string
  points: number
}

function grantsFromCharacteristics(
  mods: CharacteristicModifier[] | null | undefined,
  allocationKeyPrefix: string,
  label: string,
): AbilityScorePoolGrant[] {
  const grants: AbilityScorePoolGrant[] = []
  for (const mod of normalizeCharacteristics(mods, null)) {
    if (mod.type !== "ability_scores" || mod.mode !== "asi_pool") continue
    grants.push({
      allocationKey: `${allocationKeyPrefix}::${mod.id}`,
      label: mod.label?.trim() || label,
      points: mod.points ?? ASI_POINTS_PER_PICK,
    })
  }
  return grants
}

function grantsFromLinkedModifiers(
  linked: LinkedModifierInstance[] | null | undefined,
  legacyRefs: string[] | null | undefined,
  catalog: ModifierCatalogEntry[],
  allocationKeyPrefix: string,
  label: string,
): AbilityScorePoolGrant[] {
  const instances = effectiveLinkedModifiers(linked, legacyRefs, catalog)
  if (!instances.length) return []
  const grants: AbilityScorePoolGrant[] = []
  for (const instance of instances) {
    const entry = catalogEntryById(catalog, instance.catalogRefId)
    const { characteristics } = resolveLinkedModifierInstance(instance, catalog)
    for (const mod of characteristics) {
      if (mod.type !== "ability_scores" || mod.mode !== "asi_pool") continue
      grants.push({
        allocationKey: `${allocationKeyPrefix}::ref::${instance.catalogRefId}::${mod.id}`,
        label: mod.label?.trim() || entry?.name || label,
        points: mod.points ?? ASI_POINTS_PER_PICK,
      })
    }
  }
  return grants
}

function collectFromFeature(
  feature: Feature,
  classId: string,
  featureChoicePicks: Record<string, string[]>,
  catalog: ModifierCatalogEntry[],
  grants: AbilityScorePoolGrant[],
): void {
  const featureKey = featureChoiceKey(classId, feature.name)
  grants.push(
    ...grantsFromLinkedModifiers(
      feature.linkedModifiers,
      feature.modifierRefs,
      catalog,
      `class_feature:${featureKey}`,
      feature.name,
    ),
  )

  if (!feature.isChoice || !feature.choices?.options?.length) return
  const picked = featureChoicePicks[featureKey] ?? []
  for (const optionName of picked) {
    const option = feature.choices.options.find((entry) => entry.name === optionName)
    if (!option) continue
    grants.push(
      ...grantsFromLinkedModifiers(
        option.linkedModifiers,
        option.modifierRefs,
        catalog,
        `class_feature_choice:${featureKey}:${optionName}`,
        `${feature.name}: ${optionName}`,
      ),
    )
  }
}

export function collectAbilityScorePoolGrants(params: {
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
}): AbilityScorePoolGrant[] {
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
  } = params

  const grants: AbilityScorePoolGrant[] = []

  grants.push(
    ...grantsFromCharacteristics(species?.characteristics, "species", species?.name ?? "Species"),
  )
  grants.push(
    ...grantsFromLinkedModifiers(
      species?.linkedModifiers,
      species?.modifierRefs,
      catalog,
      "species_refs",
      species?.name ?? "Species",
    ),
  )

  species?.traits?.forEach((trait, index) => {
    grants.push(
      ...grantsFromLinkedModifiers(
        trait.linkedModifiers,
        trait.modifierRefs,
        catalog,
        `species_trait:${index}`,
        trait.name,
      ),
    )
    if (!trait.isChoice || !trait.choices?.options?.length) return
    const picked = speciesTraitPicks[String(index)] ?? []
    for (const optionName of picked) {
      const option = trait.choices.options.find((entry) => entry.name === optionName)
      if (!option) continue
      grants.push(
        ...grantsFromLinkedModifiers(
          option.linkedModifiers,
          option.modifierRefs,
          catalog,
          `species_trait_choice:${index}:${optionName}`,
          `${trait.name}: ${optionName}`,
        ),
      )
    }
  })

  for (const entry of classLevels) {
    const cls = classes.find((c) => c.id === entry.classId)
    if (!cls) continue

    for (const feature of cls.features ?? []) {
      if (feature.level > entry.level) continue
      collectFromFeature(feature, entry.classId, featureChoicePicks, catalog, grants)
    }

    const subclassId = subclassByClassId[entry.classId]
    if (subclassId && entry.level >= SUBCLASS_LEVEL) {
      const subclass = subclasses.find((s) => s.id === subclassId)
      if (subclass) {
        for (const feature of subclass.features ?? []) {
          if (feature.level > entry.level) continue
          collectFromFeature(feature, entry.classId, featureChoicePicks, catalog, grants)
        }
      }
    }
  }

  selectedFeatIds.filter(Boolean).forEach((featId, slotIndex) => {
    const feat = feats.find((entry) => entry.id === featId)
    if (!feat) return
    const refs = feat.modifierRefs ?? readModifierRefs(feat as unknown as Record<string, unknown>)
    grants.push(
      ...grantsFromLinkedModifiers(feat.linkedModifiers, refs, catalog, `feat:${featId}`, feat.name),
      ...grantsFromCharacteristics(feat.benefits, `feat:${featId}`, feat.name),
    )
    void slotIndex
  })

  return grants
}

export function allAbilityScorePoolAllocationsValid(
  grants: AbilityScorePoolGrant[],
  allocations: AsiAllocationsByFeatId,
): boolean {
  if (!grants.length) return true
  return grants.every((grant) =>
    isValidAsiAllocation(allocations[grant.allocationKey] ?? {}, grant.points),
  )
}

export function aggregateAbilityScorePoolBonuses(
  grants: AbilityScorePoolGrant[],
  allocations: AsiAllocationsByFeatId,
): Partial<Record<AbilityScoreKey, number>> {
  const totals: Partial<Record<AbilityScoreKey, number>> = {}
  for (const grant of grants) {
    const allocation = allocations[grant.allocationKey] ?? {}
    for (const key of ABILITY_SCORE_KEYS) {
      const bonus = allocation[key] ?? 0
      if (bonus > 0) totals[key] = (totals[key] ?? 0) + bonus
    }
  }
  return totals
}
