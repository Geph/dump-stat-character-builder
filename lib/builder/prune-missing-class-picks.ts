import { isDndSkill } from "@/lib/builder/choices"
import { resolvePrimaryClassId } from "@/lib/builder/primary-class"

export type ClassLevelEntry = { classId: string; level: number }

function recordWithoutKeys<T>(
  record: Record<string, T>,
  shouldDrop: (key: string) => boolean,
): Record<string, T> {
  const next: Record<string, T> = {}
  for (const [key, value] of Object.entries(record)) {
    if (!shouldDrop(key)) next[key] = value
  }
  return next
}

function featureChoiceBelongsToClass(key: string, classId: string): boolean {
  return key === classId || key.startsWith(`${classId}:`)
}

/** Skills that came from a removed class's class/subclass pick lists. */
export function skillsFromRemovedClassPicks(params: {
  removedClassIds: Iterable<string>
  classSkillPicks: Record<string, string[]>
  featureChoicePicks: Record<string, string[]>
}): string[] {
  const removed = new Set<string>()
  for (const classId of params.removedClassIds) {
    for (const skill of params.classSkillPicks[classId] ?? []) {
      if (isDndSkill(skill)) removed.add(skill)
    }
    for (const [key, picks] of Object.entries(params.featureChoicePicks)) {
      if (!featureChoiceBelongsToClass(key, classId)) continue
      for (const pick of picks) {
        if (isDndSkill(pick)) removed.add(pick)
      }
    }
  }
  return [...removed]
}

export function subtractSkillNames(skills: string[] | null | undefined, remove: Iterable<string>): string[] {
  const drop = new Set(
    [...remove].map((name) => name.trim().toLowerCase()).filter(Boolean),
  )
  return (skills ?? []).filter((skill) => !drop.has(skill.trim().toLowerCase()))
}

/**
 * Drop class/subclass skill (and related) picks when those classes are gone from the
 * compendium. Call only after the class catalog has loaded.
 */
export function pruneMissingClassSelections(params: {
  knownClassIds: Iterable<string>
  classLevels: ClassLevelEntry[]
  classAddOrder?: string[]
  primaryClassId?: string | null
  subclassByClassId: Record<string, string>
  classSkillPicks: Record<string, string[]>
  classToolPicks?: Record<string, string[]>
  featureChoicePicks: Record<string, string[]>
  spellPicksByClassId?: Record<string, string[]>
  extraSkillProficiencies?: string[]
}): {
  classLevels: ClassLevelEntry[]
  classAddOrder: string[]
  primaryClassId: string | null
  subclassByClassId: Record<string, string>
  classSkillPicks: Record<string, string[]>
  classToolPicks: Record<string, string[]>
  featureChoicePicks: Record<string, string[]>
  spellPicksByClassId: Record<string, string[]>
  extraSkillProficiencies: string[]
  removedClassIds: string[]
  removedSkills: string[]
  changed: boolean
} {
  const known = new Set([...params.knownClassIds].filter(Boolean))
  const removedClassIds = [
    ...new Set(
      [
        ...params.classLevels.map((entry) => entry.classId),
        ...Object.keys(params.classSkillPicks),
        ...Object.keys(params.subclassByClassId),
        ...Object.keys(params.classToolPicks ?? {}),
        ...Object.keys(params.spellPicksByClassId ?? {}),
        ...(params.primaryClassId ? [params.primaryClassId] : []),
        ...(params.classAddOrder ?? []),
      ].filter((classId) => classId && !known.has(classId)),
    ),
  ]
  const removedSet = new Set(removedClassIds)
  const dropClass = (classId: string) => removedSet.has(classId)
  const dropFeatureKey = (key: string) => removedClassIds.some((classId) => featureChoiceBelongsToClass(key, classId))

  const classLevels = params.classLevels.filter((entry) => !dropClass(entry.classId))
  const classAddOrder = (params.classAddOrder ?? []).filter((classId) => !dropClass(classId))
  const classSkillPicks = recordWithoutKeys(params.classSkillPicks, dropClass)
  const classToolPicks = recordWithoutKeys(params.classToolPicks ?? {}, dropClass)
  const spellPicksByClassId = recordWithoutKeys(params.spellPicksByClassId ?? {}, dropClass)
  const subclassByClassId = recordWithoutKeys(params.subclassByClassId, dropClass)
  const featureChoicePicks = recordWithoutKeys(params.featureChoicePicks, dropFeatureKey)
  const removedSkills = skillsFromRemovedClassPicks({
    removedClassIds,
    classSkillPicks: params.classSkillPicks,
    featureChoicePicks: params.featureChoicePicks,
  })
  const extraSkillProficiencies = subtractSkillNames(params.extraSkillProficiencies, removedSkills)
  const primaryClassId = resolvePrimaryClassId(
    params.primaryClassId && !dropClass(params.primaryClassId) ? params.primaryClassId : null,
    classAddOrder,
    classLevels,
  )

  return {
    classLevels,
    classAddOrder,
    primaryClassId,
    subclassByClassId,
    classSkillPicks,
    classToolPicks,
    featureChoicePicks,
    spellPicksByClassId,
    extraSkillProficiencies,
    removedClassIds,
    removedSkills,
    changed: removedClassIds.length > 0,
  }
}
