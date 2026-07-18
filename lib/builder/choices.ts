import {
  getClassSkillPickRequirement,
  getMulticlassToolPickRequirement,
} from "@/lib/builder/multiclass-proficiencies"
import { resolvePrimaryClassId } from "@/lib/builder/primary-class"
import { isClassAbilityFeatureChoice } from "@/lib/builder/class-ability-feature-choice"
import {
  classNeedsSubclass,
  resolveSubclassUnlockLevel,
} from "@/lib/builder/subclass-unlock"
import { resolveFeatureChoiceCount } from "@/lib/compendium/resolve-feature-choice-count"
import { legacyBackgroundOriginFeatPickComplete } from "@/lib/compendium/background-origin-feat"
import { DND_SKILLS } from "@/lib/compendium/constants"
import type { Background, DndClass, Species, Subclass } from "@/lib/types"

export {
  classNeedsSubclass,
  DEFAULT_SUBCLASS_LEVEL,
  resolveSubclassUnlockLabel,
  resolveSubclassUnlockLevel,
  SUBCLASS_LEVEL,
} from "@/lib/builder/subclass-unlock"

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

export function getSubclassesForClass(subclasses: Subclass[], classId: string): Subclass[] {
  const seenIds = new Set<string>()
  const seenNames = new Set<string>()
  return subclasses.filter((subclass) => {
    if (subclass.class_id !== classId) return false
    const id = subclass.id?.trim()
    const nameKey = subclass.name.trim().toLowerCase()
    if (!id && !nameKey) return false
    // Drop exact id repeats and same-name rows (e.g. re-seeded duplicates with new ids).
    if (id && seenIds.has(id)) return false
    if (nameKey && seenNames.has(nameKey)) return false
    if (id) seenIds.add(id)
    if (nameKey) seenNames.add(nameKey)
    return true
  })
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
    const unlockLevel = resolveSubclassUnlockLevel(cls)
    if (
      classNeedsSubclass(entry.level, availableSubclasses.length, unlockLevel) &&
      !subclassByClassId[entry.classId]
    ) {
      blockers.push(`${cls.name}: select a subclass (level ${unlockLevel}+).`)
    }

    for (const feature of cls.features ?? []) {
      if (feature.level > entry.level || !feature.isChoice || !feature.choices) continue
      // Custom ability pools (talents, knacks, metamagic-style lists) validate on Class Abilities.
      if (isClassAbilityFeatureChoice(feature)) continue
      const hasStaticOptions = (feature.choices.options?.length ?? 0) > 0
      const hasOptionsSource = Boolean(feature.choices.optionsSource)
      if (!hasStaticOptions && !hasOptionsSource) continue
      const key = featureChoiceKey(entry.classId, feature.name, feature.level)
      const picks = featureChoicePicks[key] ?? []
      const required = resolveFeatureChoiceCount(feature.choices, entry.level, cls.name, undefined, {
        featureName: feature.name,
      })
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
  selectedBackground?: Background,
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

  if (!legacyBackgroundOriginFeatPickComplete(selectedBackground, featureChoicePicks)) {
    blockers.push("Select an Origin feat from your background.")
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
  selectedBackground?: Background,
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
      selectedBackground,
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

/** Skills the character is proficient in during the builder (picks + modifier grants). */
export function proficientSkillsInBuilder(params: {
  backgroundSkills?: string[] | null
  classSkillPicks: Record<string, string[]>
  featureChoicePicks?: Record<string, string[]>
  speciesTraitPicks?: Record<string, string[]>
  modifierGrantedSkills?: string[]
}): string[] {
  const fromFeatures = Object.values(params.featureChoicePicks ?? {}).flat()
  const fromSpecies = Object.values(params.speciesTraitPicks ?? {}).flat()
  return mergeSkillProficiencies(params.backgroundSkills, params.classSkillPicks, [
    ...fromFeatures,
    ...fromSpecies,
    ...(params.modifierGrantedSkills ?? []),
  ]).filter(isDndSkill)
}
