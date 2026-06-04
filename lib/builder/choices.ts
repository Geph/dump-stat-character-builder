import { DND_SKILLS } from "@/lib/compendium/constants"
import type { DndClass, Species, Subclass } from "@/lib/types"

const DND_SKILL_SET = new Set<string>(DND_SKILLS)

export function isDndSkill(name: string): boolean {
  return DND_SKILL_SET.has(name)
}

export type SkillPickSource = {
  id: string
  skills: string[]
}

export function getTakenSkills(
  sources: SkillPickSource[],
  excludeSourceId?: string,
): Set<string> {
  const taken = new Set<string>()
  for (const source of sources) {
    if (source.id === excludeSourceId) continue
    for (const skill of source.skills) {
      if (isDndSkill(skill)) taken.add(skill)
    }
  }
  return taken
}

export function buildSkillPickSources(params: {
  backgroundSkills?: string[] | null
  classSkillPicks: Record<string, string[]>
  featureChoicePicks: Record<string, string[]>
  speciesTraitPicks: Record<string, string[]>
}): SkillPickSource[] {
  const sources: SkillPickSource[] = []

  if (params.backgroundSkills?.length) {
    sources.push({ id: "background", skills: params.backgroundSkills })
  }

  for (const [classId, picks] of Object.entries(params.classSkillPicks)) {
    sources.push({ id: `class:${classId}`, skills: picks })
  }

  for (const [key, picks] of Object.entries(params.featureChoicePicks)) {
    sources.push({ id: `feature:${key}`, skills: picks })
  }

  for (const [key, picks] of Object.entries(params.speciesTraitPicks)) {
    sources.push({ id: `species:${key}`, skills: picks })
  }

  return sources
}

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
