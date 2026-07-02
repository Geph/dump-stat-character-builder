import {
  getClassSkillPickRequirement,
  getMulticlassToolPickRequirement,
} from "@/lib/builder/multiclass-proficiencies"
import { resolvePrimaryClassId } from "@/lib/builder/primary-class"
import { resolveFeatureChoiceCount } from "@/lib/compendium/resolve-feature-choice-count"
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

export function featureChoiceKey(classId: string, featureName: string, level?: number): string {
  return level == null ? `${classId}:${featureName}` : `${classId}:L${level}:${featureName}`
}

export function collectClassStepBlockers(
  classLevels: { classId: string; level: number }[],
  classes: DndClass[],
  subclasses: Subclass[],
  classSkillPicks: Record<string, string[]>,
  subclassByClassId: Record<string, string>,
  featureChoicePicks: Record<string, string[]>,
  primaryClassId: string | null = null,
  classAddOrder: string[] = [],
  classToolPicks: Record<string, string[]> = {},
): string[] {
  const blockers: string[] = []
  if (classLevels.length === 0) {
    blockers.push("Select at least one class.")
    return blockers
  }

  const resolvedPrimaryId = resolvePrimaryClassId(primaryClassId, classAddOrder, classLevels)

  for (const entry of classLevels) {
    const cls = classes.find((c) => c.id === entry.classId)
    if (!cls) {
      blockers.push("A selected class could not be loaded — try reloading the page.")
      continue
    }

    if (entry.level >= 1) {
      const isPrimary = entry.classId === resolvedPrimaryId
      const skillReq = getClassSkillPickRequirement(cls, isPrimary)
      if (skillReq) {
        const picks = classSkillPicks[entry.classId] ?? []
        if (!choiceCountMet(picks, skillReq.count)) {
          blockers.push(
            `${cls.name}: choose ${skillReq.count} skill${skillReq.count === 1 ? "" : "s"} for ${skillReq.label} (${picks.length}/${skillReq.count}).`,
          )
        }
      }

      const toolReq = getMulticlassToolPickRequirement(cls, isPrimary)
      if (toolReq) {
        const picks = classToolPicks[entry.classId] ?? []
        if (!choiceCountMet(picks, toolReq.count)) {
          blockers.push(
            `${cls.name}: choose ${toolReq.count} tool${toolReq.count === 1 ? "" : "s"} (${picks.length}/${toolReq.count}).`,
          )
        }
      }
    }

    const availableSubclasses = getSubclassesForClass(subclasses, entry.classId)
    if (classNeedsSubclass(entry.level, availableSubclasses.length) && !subclassByClassId[entry.classId]) {
      blockers.push(`${cls.name}: select a subclass (level ${entry.level}+).`)
    }

    for (const feature of cls.features ?? []) {
      if (feature.level > entry.level || !feature.isChoice || !feature.choices) continue
      if ((feature.choices.options?.length ?? 0) === 0) continue
      const key = featureChoiceKey(entry.classId, feature.name, feature.level)
      const picks = featureChoicePicks[key] ?? []
      const required = resolveFeatureChoiceCount(feature.choices, entry.level, cls.name)
      if (!choiceCountMet(picks, required)) {
        blockers.push(
          `${cls.name}: complete “${feature.name}” (${picks.length}/${required}).`,
        )
      }
    }
  }

  return blockers
}

export function validateClassStepChoices(
  classLevels: { classId: string; level: number }[],
  classes: DndClass[],
  subclasses: Subclass[],
  classSkillPicks: Record<string, string[]>,
  subclassByClassId: Record<string, string>,
  featureChoicePicks: Record<string, string[]>,
  primaryClassId: string | null = null,
  classAddOrder: string[] = [],
  classToolPicks: Record<string, string[]> = {},
): boolean {
  return collectClassStepBlockers(
    classLevels,
    classes,
    subclasses,
    classSkillPicks,
    subclassByClassId,
    featureChoicePicks,
    primaryClassId,
    classAddOrder,
    classToolPicks,
  ).length === 0
}

export function collectOriginStepBlockers(
  speciesId: string | null,
  backgroundId: string | null,
  selectedSpecies: Species | undefined,
  speciesTraitPicks: Record<string, string[]>,
  speciesFeatPickKeys: string[] = [],
  featureChoicePicks: Record<string, string[]> = {},
  backgroundFeatPickKeys: string[] = [],
): string[] {
  const blockers: string[] = []
  if (!speciesId) blockers.push("Select a species.")
  if (!backgroundId) blockers.push("Select a background.")
  if (!selectedSpecies) return blockers

  for (let index = 0; index < (selectedSpecies.traits?.length ?? 0); index++) {
    const trait = selectedSpecies.traits[index]
    if (!trait.isChoice || !trait.choices) continue
    const picks = speciesTraitPicks[String(index)] ?? []
    if (!choiceCountMet(picks, trait.choices.count)) {
      blockers.push(
        `${selectedSpecies.name}: complete “${trait.name}” (${picks.length}/${trait.choices.count}).`,
      )
    }
  }

  for (const key of speciesFeatPickKeys) {
    if (!(featureChoicePicks[key]?.[0] ?? "")) {
      blockers.push("Select a species-granted feat.")
      break
    }
  }

  for (const key of backgroundFeatPickKeys) {
    if (!(featureChoicePicks[key]?.[0] ?? "")) {
      blockers.push("Select a background-granted feat.")
      break
    }
  }

  return blockers
}

export function validateOriginStepChoices(
  speciesId: string | null,
  backgroundId: string | null,
  selectedSpecies: Species | undefined,
  speciesTraitPicks: Record<string, string[]>,
  speciesFeatPickKeys: string[] = [],
  featureChoicePicks: Record<string, string[]> = {},
  backgroundFeatPickKeys: string[] = [],
): boolean {
  return (
    collectOriginStepBlockers(
      speciesId,
      backgroundId,
      selectedSpecies,
      speciesTraitPicks,
      speciesFeatPickKeys,
      featureChoicePicks,
      backgroundFeatPickKeys,
    ).length === 0
  )
}

export function mergeSkillProficiencies(
  backgroundSkills: string[] | null | undefined,
  classSkillPicks: Record<string, string[]>,
  extraSkills: string[] = [],
): string[] {
  const classSkills = Object.values(classSkillPicks).flat()
  return [...new Set([...(backgroundSkills ?? []), ...classSkills, ...extraSkills])]
}
