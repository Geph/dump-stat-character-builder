import type { DndClass } from "@/lib/types"

export type ClassLevelEntry = { classId: string; level: number }

const ABILITY_LABEL_TO_KEY: Record<string, string> = {
  Strength: "strength",
  Dexterity: "dexterity",
  Constitution: "constitution",
  Intelligence: "intelligence",
  Wisdom: "wisdom",
  Charisma: "charisma",
}

export const MULTICLASS_ABILITY_MINIMUM = 13

export function resolvePrimaryClassId(
  primaryClassId: string | null,
  classAddOrder: string[],
  classLevels: ClassLevelEntry[],
): string | null {
  const activeIds = new Set(classLevels.map((entry) => entry.classId))
  if (primaryClassId && activeIds.has(primaryClassId)) return primaryClassId
  return classAddOrder.find((classId) => activeIds.has(classId)) ?? classLevels[0]?.classId ?? null
}

export function registerClassAdded(
  classId: string,
  primaryClassId: string | null,
  classAddOrder: string[],
): { primaryClassId: string; classAddOrder: string[] } {
  const order = classAddOrder.includes(classId) ? classAddOrder : [...classAddOrder, classId]
  return {
    primaryClassId: primaryClassId ?? classId,
    classAddOrder: order,
  }
}

export function resolvePrimaryAfterRemoval(
  removedClassId: string,
  primaryClassId: string | null,
  classAddOrder: string[],
  remainingClassIds: Set<string>,
): string | null {
  if (removedClassId !== primaryClassId) return primaryClassId

  const primaryIndex = classAddOrder.indexOf(removedClassId)
  if (primaryIndex === -1) {
    return [...remainingClassIds][0] ?? null
  }

  const addedAfterPrimary = classAddOrder
    .slice(primaryIndex + 1)
    .filter((classId) => remainingClassIds.has(classId))

  return addedAfterPrimary.length > 0
    ? addedAfterPrimary[addedAfterPrimary.length - 1]!
    : null
}

export function primaryAbilityScoreKeys(dndClass: DndClass): string[] {
  return (dndClass.primary_ability ?? [])
    .map((label) => ABILITY_LABEL_TO_KEY[label])
    .filter(Boolean)
}

export function classMeetsMulticlassAbilityMinimum(
  dndClass: DndClass,
  abilityScores: Record<string, number>,
): boolean {
  const keys = primaryAbilityScoreKeys(dndClass)
  if (keys.length === 0) return true
  return keys.some((key) => (abilityScores[key] ?? 0) >= MULTICLASS_ABILITY_MINIMUM)
}

export type MulticlassAbilityIssue = {
  classId: string
  className: string
  role: "primary" | "additional"
  abilityLabels: string[]
  requiredScore: number
}

export function getMulticlassAbilityIssues(params: {
  classLevels: ClassLevelEntry[]
  classes: DndClass[]
  primaryClassId: string | null
  classAddOrder: string[]
  abilityScores: Record<string, number>
}): MulticlassAbilityIssue[] {
  const { classLevels, classes, primaryClassId, classAddOrder, abilityScores } = params
  if (classLevels.length <= 1) return []

  const resolvedPrimaryId = resolvePrimaryClassId(primaryClassId, classAddOrder, classLevels)
  const primaryClass = resolvedPrimaryId
    ? classes.find((entry) => entry.id === resolvedPrimaryId)
    : undefined
  if (!primaryClass) return []

  const issues: MulticlassAbilityIssue[] = []

  if (!classMeetsMulticlassAbilityMinimum(primaryClass, abilityScores)) {
    issues.push({
      classId: primaryClass.id,
      className: primaryClass.name,
      role: "primary",
      abilityLabels: primaryClass.primary_ability ?? [],
      requiredScore: MULTICLASS_ABILITY_MINIMUM,
    })
  }

  for (const entry of classLevels) {
    if (entry.classId === resolvedPrimaryId) continue
    const dndClass = classes.find((candidate) => candidate.id === entry.classId)
    if (!dndClass) continue
    if (classMeetsMulticlassAbilityMinimum(dndClass, abilityScores)) continue
    issues.push({
      classId: dndClass.id,
      className: dndClass.name,
      role: "additional",
      abilityLabels: dndClass.primary_ability ?? [],
      requiredScore: MULTICLASS_ABILITY_MINIMUM,
    })
  }

  return issues
}

export function multiclassAbilityRequirementsMet(params: {
  classLevels: ClassLevelEntry[]
  classes: DndClass[]
  primaryClassId: string | null
  classAddOrder: string[]
  abilityScores: Record<string, number>
}): boolean {
  return getMulticlassAbilityIssues(params).length === 0
}

export function formatMulticlassAbilityIssue(issue: MulticlassAbilityIssue): string {
  const abilities = issue.abilityLabels.length
    ? issue.abilityLabels.join(" or ")
    : "primary ability"
  return `${issue.className} needs ${abilities} ${issue.requiredScore}+ (SRD multiclass prerequisite).`
}
