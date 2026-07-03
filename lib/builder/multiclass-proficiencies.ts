import { DND_SKILLS } from "@/lib/compendium/constants"
import { mergeProficiencyLists } from "@/lib/compendium/background-proficiencies"
import {
  multiclassGrantForClass,
  type MulticlassProficiencyGrant,
} from "@/lib/srd/class-multiclass-proficiencies"
import type { DndClass } from "@/lib/types"
import type { ClassLevelEntry } from "@/lib/builder/primary-class"

export type ClassSkillPickRequirement = {
  count: number
  options: string[]
  label: string
  isMulticlass: boolean
}

export function isPrimaryClassEntry(
  classId: string,
  primaryClassId: string | null,
): boolean {
  return !!primaryClassId && classId === primaryClassId
}

export function getClassSkillPickRequirement(
  cls: DndClass,
  isPrimary: boolean,
): ClassSkillPickRequirement | null {
  if (isPrimary) {
    if (!cls.skill_choices?.options?.length || (cls.skill_choices.count ?? 0) <= 0) {
      return null
    }
    return {
      count: cls.skill_choices.count,
      options: cls.skill_choices.options,
      label: "Level 1 skill proficiencies",
      isMulticlass: false,
    }
  }

  const grant = multiclassGrantForClass(cls.name)
  const skillChoice = grant.skillChoice
  if (!skillChoice || skillChoice.count <= 0) return null

  if (skillChoice.anySkill) {
    return {
      count: skillChoice.count,
      options: [...DND_SKILLS],
      label: "Multiclass skill proficiency",
      isMulticlass: true,
    }
  }

  if (skillChoice.fromClassList && cls.skill_choices?.options?.length) {
    return {
      count: skillChoice.count,
      options: cls.skill_choices.options,
      label: "Multiclass skill proficiency",
      isMulticlass: true,
    }
  }

  return null
}

export function getMulticlassToolPickRequirement(
  cls: DndClass,
  isPrimary: boolean,
): { count: number; options: string[]; label: string } | null {
  if (isPrimary) return null
  const toolChoice = multiclassGrantForClass(cls.name).toolChoice
  if (!toolChoice || toolChoice.count <= 0) return null
  return {
    count: toolChoice.count,
    options: toolChoice.options,
    label: "Multiclass tool proficiency",
  }
}

export function fixedMulticlassTools(cls: DndClass, isPrimary: boolean): string[] {
  if (isPrimary) return []
  return [...(multiclassGrantForClass(cls.name).tools ?? [])]
}

export function aggregateClassWeaponProficiencies(params: {
  classLevels: ClassLevelEntry[]
  classes: DndClass[]
  primaryClassId: string | null
}): string[] {
  const { classLevels, classes, primaryClassId } = params
  const lists: string[][] = []

  for (const entry of classLevels) {
    const cls = classes.find((candidate) => candidate.id === entry.classId)
    if (!cls) continue
    if (isPrimaryClassEntry(entry.classId, primaryClassId)) {
      lists.push(cls.weapon_proficiencies ?? [])
    } else {
      lists.push(multiclassGrantForClass(cls.name).weapons ?? [])
    }
  }

  return mergeProficiencyLists(...lists)
}

export function aggregateClassArmorProficiencies(params: {
  classLevels: ClassLevelEntry[]
  classes: DndClass[]
  primaryClassId: string | null
}): string[] {
  const { classLevels, classes, primaryClassId } = params
  const lists: string[][] = []

  for (const entry of classLevels) {
    const cls = classes.find((candidate) => candidate.id === entry.classId)
    if (!cls) continue
    if (isPrimaryClassEntry(entry.classId, primaryClassId)) {
      lists.push(cls.armor_proficiencies ?? [])
    } else {
      lists.push(multiclassGrantForClass(cls.name).armor ?? [])
    }
  }

  return mergeProficiencyLists(...lists)
}

export function aggregateClassToolProficiencies(params: {
  classLevels: ClassLevelEntry[]
  classes: DndClass[]
  primaryClassId: string | null
  classToolPicks: Record<string, string[]>
}): string[] {
  const { classLevels, classes, primaryClassId, classToolPicks } = params
  const lists: string[][] = []

  for (const entry of classLevels) {
    const cls = classes.find((candidate) => candidate.id === entry.classId)
    if (!cls) continue
    if (isPrimaryClassEntry(entry.classId, primaryClassId)) {
      // Primary class tool proficiencies come from class data if we add them later.
      lists.push(classToolPicks[entry.classId] ?? [])
    } else {
      lists.push(fixedMulticlassTools(cls, false))
      lists.push(classToolPicks[entry.classId] ?? [])
    }
  }

  return mergeProficiencyLists(...lists)
}

export function describeMulticlassProficiencyGrant(grant: MulticlassProficiencyGrant): string[] {
  const parts: string[] = []
  if (grant.weapons?.length) parts.push(...grant.weapons)
  if (grant.armor?.length) parts.push(...grant.armor.map((entry) => `${entry} training`))
  if (grant.tools?.length) parts.push(...grant.tools)
  if (grant.skillChoice) {
    parts.push(
      grant.skillChoice.anySkill
        ? `${grant.skillChoice.count} skill of your choice`
        : `${grant.skillChoice.count} skill from class list`,
    )
  }
  if (grant.toolChoice) {
    parts.push(
      grant.toolChoice.options.length === 1
        ? `${grant.toolChoice.count} ${grant.toolChoice.options[0]}`
        : `${grant.toolChoice.count} musical instrument`,
    )
  }
  return parts
}

export function multiclassProficiencySummary(cls: DndClass): string {
  const imported = cls.multiclass_proficiencies_gained
  if (imported?.length) {
    return `When multiclassing: ${imported.join(", ")}.`
  }
  const grant = multiclassGrantForClass(cls.name)
  const parts = describeMulticlassProficiencyGrant(grant)
  if (parts.length === 0) {
    return "No additional starting proficiencies when multiclassing into this class."
  }
  return `When multiclassing: ${parts.join(", ")}.`
}
