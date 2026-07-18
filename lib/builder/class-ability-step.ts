import { featureChoiceKey, choiceCountMet } from "@/lib/builder/choices"
import {
  CLASS_ABILITY_FEAT_CATEGORIES,
  isClassAbilityFeatureChoice,
} from "@/lib/builder/class-ability-feature-choice"
import { slotUsesCatalogFeatPicks } from "@/lib/builder/catalog-feat-options"
import type { FeatPickSlot } from "@/lib/builder/class-feat-features"
import { resolveFeatureChoiceCount } from "@/lib/compendium/resolve-feature-choice-count"
import { isWeaponMasteryFeature } from "@/lib/compendium/weapon-mastery-choice"
import type { CustomAbility, DndClass, Feature, Subclass } from "@/lib/types"

export {
  CLASS_ABILITY_FEAT_CATEGORIES,
  isClassAbilityFeatureChoice,
  isProficiencyStyleChoice,
} from "@/lib/builder/class-ability-feature-choice"

export function isClassAbilityFeatSlot(slot: FeatPickSlot): boolean {
  if (slotUsesCatalogFeatPicks(slot.featCategories)) return true
  return slot.featCategories.some((category) => CLASS_ABILITY_FEAT_CATEGORIES.has(category))
}

export type ClassAbilityFeatureEntry = {
  classId: string
  className: string
  classLevel: number
  feature: Feature
  source: "class" | "subclass"
  subclassName?: string | null
}

/** Collect class + subclass feature pools for the Class Abilities builder step. */
export function collectClassAbilityFeatures(params: {
  classLevels: { classId: string; level: number }[]
  classes: DndClass[]
  subclasses?: Subclass[]
  subclassByClassId?: Record<string, string>
}): ClassAbilityFeatureEntry[] {
  const entries: ClassAbilityFeatureEntry[] = []
  const subclasses = params.subclasses ?? []
  const subclassByClassId = params.subclassByClassId ?? {}

  for (const levelEntry of params.classLevels) {
    const cls = params.classes.find((row) => row.id === levelEntry.classId)
    if (!cls) continue

    for (const feature of cls.features ?? []) {
      if (feature.level > levelEntry.level) continue
      if (!isClassAbilityFeatureChoice(feature)) continue
      entries.push({
        classId: levelEntry.classId,
        className: cls.name,
        classLevel: levelEntry.level,
        feature,
        source: "class",
      })
    }

    const subclassId = subclassByClassId[levelEntry.classId]
    if (!subclassId) continue
    const subclass = subclasses.find((row) => row.id === subclassId)
    if (!subclass) continue
    for (const feature of (subclass.features ?? []) as Feature[]) {
      if (feature.level > levelEntry.level) continue
      if (!isClassAbilityFeatureChoice(feature)) continue
      entries.push({
        classId: levelEntry.classId,
        className: cls.name,
        classLevel: levelEntry.level,
        feature,
        source: "subclass",
        subclassName: subclass.name,
      })
    }
  }

  return entries
}

export function hasClassAbilityStep(params: {
  classLevels: { classId: string; level: number }[]
  classes: DndClass[]
  subclasses?: Subclass[]
  subclassByClassId?: Record<string, string>
  featPickSlots?: FeatPickSlot[]
  customAbilities?: CustomAbility[]
}): boolean {
  if (
    collectClassAbilityFeatures(params).length > 0 ||
    (params.featPickSlots ?? []).some(isClassAbilityFeatSlot)
  ) {
    return true
  }
  // Discipline specializations appear after a discipline is picked — still show the step
  // when any discipline-shaped ability exists and the character has a Psion-like class.
  const hasDisciplineAbility = (params.customAbilities ?? []).some(
    (ability) =>
      ability.ability_role === "discipline" || /\bdiscipline\b/i.test(ability.name),
  )
  if (!hasDisciplineAbility) return false
  return params.classLevels.some((entry) => {
    const cls = params.classes.find((row) => row.id === entry.classId)
    return Boolean(cls && /psion/i.test(cls.name))
  })
}

export function collectClassAbilityStepBlockers(params: {
  classLevels: { classId: string; level: number }[]
  classes: DndClass[]
  subclasses?: Subclass[]
  subclassByClassId?: Record<string, string>
  featureChoicePicks: Record<string, string[]>
  featPickSlots?: FeatPickSlot[]
}): string[] {
  const blockers: string[] = []
  for (const entry of collectClassAbilityFeatures(params)) {
    const { feature, classId, className, classLevel } = entry
    if (!feature.choices) continue
    if (
      (feature.choices.options?.length ?? 0) === 0 &&
      !feature.choices.optionsSource &&
      !isWeaponMasteryFeature(feature)
    ) {
      continue
    }
    const key = featureChoiceKey(classId, feature.name, feature.level)
    const picks = params.featureChoicePicks[key] ?? []
    const required = resolveFeatureChoiceCount(feature.choices, classLevel, className, undefined, {
      featureName: feature.name,
    })
    if (!choiceCountMet(picks, required)) {
      const label =
        entry.source === "subclass" && entry.subclassName
          ? `${className} (${entry.subclassName})`
          : className
      blockers.push(
        `${label}: complete “${feature.name}” (${picks.length}/${required}).`,
      )
    }
  }

  const abilityFeatSlots = (params.featPickSlots ?? []).filter(isClassAbilityFeatSlot)
  const selected = abilityFeatSlots.filter(
    (slot) => (params.featureChoicePicks[slot.key]?.[0] ?? "").length > 0,
  ).length
  if (selected < abilityFeatSlots.length) {
    blockers.push(
      `Choose ${abilityFeatSlots.length - selected} more class abilit${
        abilityFeatSlots.length - selected === 1 ? "y" : "ies"
      } (${selected}/${abilityFeatSlots.length}).`,
    )
  }

  return blockers
}
