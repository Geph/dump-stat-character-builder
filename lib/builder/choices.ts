import type { DndClass, Species, Subclass } from "@/lib/types"

export const SUBCLASS_LEVEL = 3

export function getSubclassesForClass(subclasses: Subclass[], classId: string): Subclass[] {
  return subclasses.filter((subclass) => subclass.class_id === classId)
}

export function classNeedsSubclass(classLevel: number, subclassCount: number): boolean {
  return classLevel >= SUBCLASS_LEVEL && subclassCount > 0
}

export function choiceCountMet(selected: string[], required: number): boolean {
  return selected.length === required
}

export function featureChoiceKey(classId: string, featureName: string): string {
  return `${classId}:${featureName}`
}

export function validateClassStepChoices(
  classLevels: { classId: string; level: number }[],
  classes: DndClass[],
  subclasses: Subclass[],
  classSkillPicks: Record<string, string[]>,
  subclassByClassId: Record<string, string>,
  featureChoicePicks: Record<string, string[]>,
): boolean {
  if (classLevels.length === 0) return false

  for (const entry of classLevels) {
    const cls = classes.find((c) => c.id === entry.classId)
    if (!cls) return false

    if (entry.level >= 1 && cls.skill_choices?.options?.length) {
      const picks = classSkillPicks[entry.classId] ?? []
      if (!choiceCountMet(picks, cls.skill_choices.count)) return false
    }

    const availableSubclasses = getSubclassesForClass(subclasses, entry.classId)
    if (classNeedsSubclass(entry.level, availableSubclasses.length) && !subclassByClassId[entry.classId]) {
      return false
    }

    for (const feature of cls.features ?? []) {
      if (feature.level > entry.level || !feature.isChoice || !feature.choices) continue
      const key = featureChoiceKey(entry.classId, feature.name)
      const picks = featureChoicePicks[key] ?? []
      if (!choiceCountMet(picks, feature.choices.count)) return false
    }
  }

  return true
}

export function validateOriginStepChoices(
  speciesId: string | null,
  backgroundId: string | null,
  selectedSpecies: Species | undefined,
  speciesTraitPicks: Record<string, string[]>,
): boolean {
  if (!speciesId || !backgroundId || !selectedSpecies) return false

  for (let index = 0; index < (selectedSpecies.traits?.length ?? 0); index++) {
    const trait = selectedSpecies.traits[index]
    if (!trait.isChoice || !trait.choices) continue
    const picks = speciesTraitPicks[String(index)] ?? []
    if (!choiceCountMet(picks, trait.choices.count)) return false
  }

  return true
}

export function mergeSkillProficiencies(
  backgroundSkills: string[] | null | undefined,
  classSkillPicks: Record<string, string[]>,
  extraSkills: string[] = [],
): string[] {
  const classSkills = Object.values(classSkillPicks).flat()
  return [...new Set([...(backgroundSkills ?? []), ...classSkills, ...extraSkills])]
}
