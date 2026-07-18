import type { FeatureChoiceCountBonusCharacteristic } from "@/lib/compendium/characteristic-modifiers"
import type { FeatureChoice } from "@/lib/types"
import type { ClassResource } from "@/lib/types"
import { resolveTierCountAtLevel } from "@/lib/compendium/resolve-uses-config"
import { resolveUsesAtLevel } from "@/lib/compendium/resolve-uses-config"
import { resolveClassResourcesForClass } from "@/lib/compendium/resolve-class-resources"

function resourcesForClassName(
  className: string,
  classResources?: ClassResource[],
  classRow?: { id: string; name: string; class_resources?: ClassResource[] | null },
): ClassResource[] {
  if (classResources?.length) return classResources
  if (classRow) return resolveClassResourcesForClass(classRow)
  return resolveClassResourcesForClass({ id: "", name: className, class_resources: null })
}

function normalizeMatch(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase()
}

function bonusMatchesFeature(
  bonus: FeatureChoiceCountBonusCharacteristic,
  featureName: string | undefined,
  choiceCategory: string | null | undefined,
): boolean {
  const target = normalizeMatch(bonus.targetFeatureName)
  const category = normalizeMatch(bonus.choiceCategory)
  const feature = normalizeMatch(featureName)
  const choiceCat = normalizeMatch(choiceCategory)
  if (target && feature && (feature === target || feature.includes(target) || target.includes(feature))) {
    return true
  }
  if (category && choiceCat && (choiceCat === category || choiceCat.includes(category) || category.includes(choiceCat))) {
    return true
  }
  if (category && feature && (feature === category || feature.includes(category) || category.includes(feature))) {
    return true
  }
  return false
}

function resolveChoiceCountBonusAmount(
  bonus: FeatureChoiceCountBonusCharacteristic,
  proficiencyBonus: number,
): number {
  if (bonus.bonusFrom === "half_proficiency") return Math.max(1, Math.floor(proficiencyBonus / 2))
  if (bonus.bonusFrom === "proficiency") return Math.max(1, proficiencyBonus)
  const flat = bonus.bonus
  return typeof flat === "number" && Number.isFinite(flat) ? Math.max(0, flat) : 0
}

export type ResolveFeatureChoiceCountOptions = {
  featureName?: string
  proficiencyBonus?: number
  bonuses?: FeatureChoiceCountBonusCharacteristic[]
}

/** Resolve how many picks a FeatureChoice grants at a given class level. */
export function resolveFeatureChoiceCount(
  choices: FeatureChoice,
  classLevel: number,
  className: string,
  classResources?: ClassResource[],
  options?: ResolveFeatureChoiceCountOptions,
): number {
  const fallback = choices.count > 0 ? choices.count : 1

  let resolved = fallback
  if (choices.choiceCountByLevel?.length) {
    const tier = resolveTierCountAtLevel(choices.choiceCountByLevel, classLevel)
    resolved = tier > 0 ? tier : fallback
  } else {
    const resourceKey = choices.resourceKey?.trim()
    if (resourceKey) {
      const resource = resourcesForClassName(className, classResources).find(
        (entry) => entry.id === resourceKey,
      )
      if (resource?.uses) {
        const fromResource = resolveUsesAtLevel(resource.uses, classLevel)
        if (fromResource != null && fromResource > 0) resolved = fromResource
      }
    }
  }

  const proficiencyBonus = options?.proficiencyBonus ?? Math.floor((Math.max(classLevel, 1) - 1) / 4) + 2
  for (const bonus of options?.bonuses ?? []) {
    if (!bonusMatchesFeature(bonus, options?.featureName, choices.category)) continue
    resolved += resolveChoiceCountBonusAmount(bonus, proficiencyBonus)
  }

  return resolved
}
