import type { CharacterClassDetail } from "@/lib/character/character-classes"
import {
  normalizeCharacteristics,
  type AbilityScoreKey,
  type SkillCheckAlternateAbilityCharacteristic,
} from "@/lib/compendium/characteristic-modifiers"
import { effectiveLinkedModifiers, resolveLinkedModifiers } from "@/lib/compendium/linked-modifiers"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import type { LimitationEvaluationContext } from "@/lib/compendium/modifier-limitations"
import { modifierLimitationsMet } from "@/lib/compendium/modifier-limitations"
import type { Feature } from "@/lib/types"

/** A feature that lets certain skill checks be made with an alternate ability. */
export type AlternateAbilityCheckEntry = {
  id: string
  featureName: string
  sourceLabel: string
  ability: AbilityScoreKey
  skills: string[]
  conditionLabel?: string
}

function characteristicsForFeature(
  feature: Feature,
  catalog: ModifierCatalogEntry[],
  limitationCtx: LimitationEvaluationContext,
): SkillCheckAlternateAbilityCharacteristic[] {
  const instances = effectiveLinkedModifiers(
    feature.linkedModifiers,
    feature.modifierRefs,
    catalog,
  )
  if (!instances.length) return []
  const { characteristics } = resolveLinkedModifiers(instances, catalog)
  return normalizeCharacteristics(characteristics, null).filter(
    (mod): mod is SkillCheckAlternateAbilityCharacteristic =>
      mod.type === "skill_check_alternate_ability" && modifierLimitationsMet(mod, limitationCtx),
  )
}

function pushFeatureEntries(
  out: AlternateAbilityCheckEntry[],
  features: Feature[] | undefined,
  levelCap: number,
  sourceLabel: string,
  idPrefix: string,
  catalog: ModifierCatalogEntry[],
  limitationCtx: LimitationEvaluationContext,
): void {
  for (const feature of features ?? []) {
    if ((feature.level ?? 1) > levelCap) continue
    for (const mod of characteristicsForFeature(feature, catalog, limitationCtx)) {
      out.push({
        id: `${idPrefix}:${feature.level ?? 1}:${feature.name}:${mod.id}`,
        featureName: feature.name,
        sourceLabel,
        ability: mod.ability,
        skills: mod.skills ?? [],
        conditionLabel: mod.conditionLabel,
      })
    }
  }
}

/** Scan class/subclass features for alternate-ability skill-check grants (e.g. Primal Knowledge). */
export function collectAlternateAbilityChecks(params: {
  classDetails: CharacterClassDetail[]
  catalog: ModifierCatalogEntry[]
  limitationContext?: LimitationEvaluationContext
}): AlternateAbilityCheckEntry[] {
  const { classDetails, catalog, limitationContext = {} } = params
  const entries: AlternateAbilityCheckEntry[] = []

  for (const detail of classDetails) {
    pushFeatureEntries(
      entries,
      detail.class?.features as Feature[] | undefined,
      detail.row.level,
      detail.class?.name ?? "Class",
      detail.row.class_id,
      catalog,
      limitationContext,
    )
    if (detail.subclass) {
      pushFeatureEntries(
        entries,
        detail.subclass.features as Feature[] | undefined,
        detail.row.level,
        detail.subclass.name,
        `sub-${detail.subclass.id}`,
        catalog,
        limitationContext,
      )
    }
  }

  return entries
}
