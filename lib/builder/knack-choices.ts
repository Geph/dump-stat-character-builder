import type { CustomAbility } from "@/lib/types"
import {
  isChoicePrerequisiteMet,
  parseMinimumLevelFromPrerequisite,
  prerequisiteMentionsAbility,
  type ChoicePrerequisiteContext,
} from "@/lib/builder/choice-prerequisite"

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

function classNameMatches(abilityClass: string, classKey: string): boolean {
  const left = normalizeName(abilityClass)
  const right = classKey
  if (!left || !right) return false
  if (left === right) return true
  // "Barbarian" matches "Alternate Barbarian" and vice versa.
  if (left.includes(right) || right.includes(left)) return true
  return false
}

export function knackAbilitiesForClass(
  customAbilities: CustomAbility[],
  classNames: string[],
  options?: { subclassName?: string | null },
): CustomAbility[] {
  const classKeys = new Set(classNames.map(normalizeName))
  const subclassKey = options?.subclassName?.trim()
    ? normalizeName(options.subclassName)
    : null
  return customAbilities.filter((ability) => {
    const isKnackRole = ability.ability_role === "knack"
    const eligible = ability.eligible_classes ?? []
    const eligibleHit =
      eligible.length > 0 &&
      [...classKeys].some((classKey) =>
        eligible.some((name) => classNameMatches(name, classKey)),
      )
    // Exploit / shared libraries often omit ability_role and use eligible_classes only.
    if (!isKnackRole && !eligibleHit) return false
    if (isKnackRole && !eligibleHit) {
      // Fall through to attachment / source matching for single-class knacks.
    } else if (eligibleHit) {
      return true
    }

    if (ability.attached_to_type === "class" && ability.attached_to_id) {
      const attachKey = normalizeName(ability.attached_to_id)
      return [...classKeys].some((classKey) => classNameMatches(attachKey, classKey))
    }
    if (ability.attached_to_type === "subclass" && ability.attached_to_id) {
      if (!subclassKey) return false
      const attachKey = normalizeName(ability.attached_to_id)
      return attachKey.includes(subclassKey) || subclassKey.includes(attachKey)
    }
    if (ability.source?.trim()) {
      const sourceKey = normalizeName(ability.source)
      if ([...classKeys].some((classKey) => classNameMatches(sourceKey, classKey))) return true
      if (subclassKey && (sourceKey.includes(subclassKey) || subclassKey.includes(sourceKey))) {
        return true
      }
    }
    return classNames.length === 0
  })
}

export type KnackEligibilityContext = ChoicePrerequisiteContext

export function isKnackEligible(
  knack: CustomAbility,
  classLevelOrContext: number | KnackEligibilityContext,
  selectedKnackNames?: string[],
): boolean {
  const context: KnackEligibilityContext =
    typeof classLevelOrContext === "number"
      ? {
          classLevel: classLevelOrContext,
          selectedAbilityNames: selectedKnackNames ?? [],
        }
      : {
          ...classLevelOrContext,
          selectedAbilityNames:
            classLevelOrContext.selectedAbilityNames ?? selectedKnackNames ?? [],
        }

  return isChoicePrerequisiteMet(knack.prerequisites, context, {
    levelRequirement: knack.level_requirement ?? parseMinimumLevelFromPrerequisite(knack.prerequisites),
  })
}

export function aggregateKnackOptions(params: {
  customAbilities: CustomAbility[]
  classNames: string[]
  classLevel: number
  selectedKnackNames: string[]
  knownSpellNames?: string[]
  subclassName?: string | null
}): { name: string; description: string; prerequisite?: string | null; repeatable?: boolean | null }[] {
  const knacks = knackAbilitiesForClass(params.customAbilities, params.classNames, {
    subclassName: params.subclassName,
  })
  const selected = params.selectedKnackNames
  const context: KnackEligibilityContext = {
    classLevel: params.classLevel,
    selectedAbilityNames: selected,
    knownSpellNames: params.knownSpellNames,
    subclassName: params.subclassName,
  }
  const options: { name: string; description: string; prerequisite?: string | null; repeatable?: boolean | null }[] =
    []

  for (const knack of knacks) {
    if (!isKnackEligible(knack, context)) continue
    const countInSelection = selected.filter((name) => normalizeName(name) === normalizeName(knack.name)).length
    if (!knack.repeatable && countInSelection > 0) continue
    options.push({
      name: knack.name,
      description: knack.description ?? "",
      prerequisite: knack.prerequisites,
      repeatable: knack.repeatable ?? false,
    })
  }

  return options.sort((a, b) => a.name.localeCompare(b.name))
}

export function validateKnackSelectionChange(params: {
  previous: string[]
  next: string[]
  customAbilities: CustomAbility[]
  classLevel: number
  knownSpellNames?: string[]
  subclassName?: string | null
}): { ok: true } | { ok: false; message: string } {
  const knackByName = new Map(
    params.customAbilities
      .filter((row) => row.ability_role === "knack")
      .map((row) => [normalizeName(row.name), row]),
  )

  const removed = params.previous.filter((name) => !params.next.includes(name))
  for (const removedName of removed) {
    for (const keptName of params.next) {
      const kept = knackByName.get(normalizeName(keptName))
      if (!kept?.prerequisites) continue
      if (prerequisiteMentionsAbility(kept.prerequisites, removedName)) {
        return {
          ok: false,
          message: `Cannot replace ${removedName} — ${keptName} requires it as a prerequisite.`,
        }
      }
    }
  }

  const repeatableCounts = new Map<string, number>()
  for (const name of params.next) {
    const knack = knackByName.get(normalizeName(name))
    if (knack?.repeatable) {
      repeatableCounts.set(normalizeName(name), (repeatableCounts.get(normalizeName(name)) ?? 0) + 1)
      continue
    }
    const count = (repeatableCounts.get(normalizeName(name)) ?? 0) + 1
    if (count > 1) {
      return { ok: false, message: `${name} cannot be selected more than once.` }
    }
    repeatableCounts.set(normalizeName(name), count)
  }

  for (const name of params.next) {
    const knack = knackByName.get(normalizeName(name))
    if (!knack) continue
    const others = params.next.filter((entry) => entry !== name)
    if (
      !isKnackEligible(knack, {
        classLevel: params.classLevel,
        selectedAbilityNames: others,
        knownSpellNames: params.knownSpellNames,
        subclassName: params.subclassName,
      })
    ) {
      return { ok: false, message: `${name} prerequisites are not met.` }
    }
  }

  return { ok: true }
}
