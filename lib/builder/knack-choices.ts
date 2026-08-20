import type { CustomAbility } from "@/lib/types"
import {
  classLabelMatches,
  customAbilityMatchesClass,
} from "@/lib/builder/class-ability-match"
import {
  isChoicePrerequisiteMet,
  parseMinimumLevelFromPrerequisite,
  prerequisiteMentionsAbility,
  type ChoicePrerequisiteContext,
} from "@/lib/builder/choice-prerequisite"

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

export function knackAbilitiesForClass(
  customAbilities: CustomAbility[],
  classNames: string[],
  options?: { subclassName?: string | null; classIds?: string[] },
): CustomAbility[] {
  const targets = { classNames, classIds: options?.classIds }
  const subclassKey = options?.subclassName?.trim()
    ? normalizeName(options.subclassName)
    : null
  return customAbilities.filter((ability) => {
    const isKnackRole = ability.ability_role === "knack"
    const eligible = ability.eligible_classes ?? []
    const eligibleHit =
      eligible.length > 0 && eligible.some((name) => classLabelMatches(name, targets))
    // Exploit / shared libraries often omit ability_role and use eligible_classes only.
    if (!isKnackRole && !eligibleHit) return false
    if (eligibleHit) return true
    return customAbilityMatchesClass(ability, targets, { subclassName: subclassKey })
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
  classIds?: string[]
}): { name: string; description: string; prerequisite?: string | null; repeatable?: boolean | null }[] {
  const knacks = knackAbilitiesForClass(params.customAbilities, params.classNames, {
    subclassName: params.subclassName,
    classIds: params.classIds,
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
