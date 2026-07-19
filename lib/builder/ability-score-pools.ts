import { featureChoiceKey, resolveSubclassUnlockLevel } from "@/lib/builder/choices"
import {
  ASI_POINTS_PER_PICK,
  isValidAsiAllocation,
  type AsiAllocationsByFeatId,
} from "@/lib/builder/asi-allocation"
import {
  ABILITY_SCORE_KEYS,
  type AbilityScoreKey,
} from "@/lib/compendium/characteristic-modifiers"
import {
  effectiveLinkedModifiers,
  readLinkedModifiers,
  resolveLinkedModifierInstance,
  type LinkedModifierInstance,
} from "@/lib/compendium/linked-modifiers"
import { catalogEntryById, type ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import { readModifierRefs } from "@/lib/compendium/normalize-modifier-refs"
import { linkedModifiersForFeat, type FeatSelectionEntry } from "@/lib/builder/feat-choices"
import type { DndClass, Feat, Feature, Species, Subclass } from "@/lib/types"
import { isAsiFeat, milestoneAsiPointTotal } from "@/lib/builder/asi-allocation"

export type AbilityScorePoolGrant = {
  allocationKey: string
  label: string
  /** Where this pool comes from (feat, species trait, class feature, etc.). */
  sourceLabel?: string
  points: number
  allowedAbilities?: AbilityScoreKey[]
}


function grantsFromLinkedModifiers(
  linked: LinkedModifierInstance[] | null | undefined,
  legacyRefs: string[] | null | undefined,
  catalog: ModifierCatalogEntry[],
  allocationKeyPrefix: string,
  sourceLabel: string,
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
        label: mod.label?.trim() || entry?.name || sourceLabel,
        sourceLabel,
        points: mod.points ?? ASI_POINTS_PER_PICK,
        ...(mod.allowedAbilities?.length ? { allowedAbilities: mod.allowedAbilities } : {}),
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
  const featureKey = featureChoiceKey(classId, feature.name, feature.level)
  grants.push(
    ...grantsFromLinkedModifiers(
      feature.linkedModifiers,
      feature.modifierRefs,
      catalog,
      `class_feature:${featureKey}`,
      `Feature · ${feature.name}`,
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
        `Feature · ${feature.name}: ${optionName}`,
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
  grantedFeatIds?: string[]
  featSelectionEntries?: FeatSelectionEntry[]
  featChoicePicks?: Record<string, string[]>
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
    grantedFeatIds = [],
    featSelectionEntries = [],
    featChoicePicks = {},
    classLevels,
    classes,
    subclasses,
    subclassByClassId,
    featureChoicePicks,
  } = params

  const grants: AbilityScorePoolGrant[] = []

  const speciesRow = species as unknown as unknown as Record<string, unknown> | undefined
  grants.push(
    ...grantsFromLinkedModifiers(
      speciesRow ? readLinkedModifiers(speciesRow, catalog) : [],
      species?.modifierRefs,
      catalog,
      "species_refs",
      species?.name ? `Species · ${species.name}` : "Species",
    ),
  )

  species?.traits?.forEach((trait, index) => {
    grants.push(
      ...grantsFromLinkedModifiers(
        trait.linkedModifiers,
        trait.modifierRefs,
        catalog,
        `species_trait:${index}`,
        `Species · ${trait.name}`,
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
          `Species · ${trait.name}: ${optionName}`,
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
    if (subclassId && entry.level >= resolveSubclassUnlockLevel(cls)) {
      const subclass = subclasses.find((s) => s.id === subclassId)
      if (subclass) {
        for (const feature of subclass.features ?? []) {
          if (feature.level > entry.level) continue
          collectFromFeature(feature, entry.classId, featureChoicePicks, catalog, grants)
        }
      }
    }
  }

  const featEntries =
    featSelectionEntries.length > 0
      ? featSelectionEntries
      : [...new Set([...selectedFeatIds, ...grantedFeatIds].filter(Boolean))].map((featId) => ({
          featId,
          choicePickKey: grantedFeatIds.includes(featId)
            ? `feat:granted:${featId}`
            : `feat:${featId}`,
        }))

  featEntries.forEach(({ featId, choicePickKey }) => {
    const feat = feats.find((entry) => entry.id === featId)
    if (!feat) return
    const instances = linkedModifiersForFeat(feat, choicePickKey, featChoicePicks, catalog)
    grants.push(
      ...grantsFromLinkedModifiers(
        instances,
        feat.modifierRefs ?? readModifierRefs(feat as unknown as unknown as Record<string, unknown>),
        catalog,
        choicePickKey,
        `Feat · ${feat.name}`,
      ),
    )
  })

  return grants
}

/** Sum ASI pool points from grants tied to a feat selection entry. */
export function poolGrantPointsForSelectionEntry(
  grants: AbilityScorePoolGrant[],
  choicePickKey: string,
): number {
  return grants
    .filter((grant) => grant.allocationKey.startsWith(choicePickKey))
    .reduce((sum, grant) => sum + grant.points, 0)
}

export function asiPoolPointsFromFeatSelections(
  grants: AbilityScorePoolGrant[],
  entries: FeatSelectionEntry[],
  feats: Feat[],
): number {
  let total = 0
  for (const entry of entries) {
    const feat = feats.find((candidate) => candidate.id === entry.featId)
    if (!isAsiFeat(feat)) continue
    total += poolGrantPointsForSelectionEntry(grants, entry.choicePickKey)
  }
  return total
}

/** Legacy combined milestone UI only when catalog pool grants do not cover ASI feat picks. */
export function shouldUseLegacyMilestoneAsiUi(params: {
  milestoneAsiFeatCount: number
  grants: AbilityScorePoolGrant[]
  featSelectionEntries: FeatSelectionEntry[]
  feats: Feat[]
}): boolean {
  const { milestoneAsiFeatCount, grants, featSelectionEntries, feats } = params
  if (milestoneAsiFeatCount <= 0) return false
  const required = milestoneAsiPointTotal(milestoneAsiFeatCount)
  const covered = asiPoolPointsFromFeatSelections(grants, featSelectionEntries, feats)
  return covered < required
}

export function allAbilityScorePoolAllocationsValid(
  grants: AbilityScorePoolGrant[],
  allocations: AsiAllocationsByFeatId,
): boolean {
  if (!grants.length) return true
  return grants.every((grant) =>
    isValidAsiAllocation(
      allocations[grant.allocationKey] ?? {},
      grant.points,
      grant.allowedAbilities,
    ),
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
