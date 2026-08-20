import { isCustomAbilityEligible } from "@/lib/builder/choice-option-eligibility"
import {
  customAbilityMatchesClass,
  type ClassAbilityMatchTarget,
} from "@/lib/builder/class-ability-match"
import type { CustomAbility, FeatureChoice } from "@/lib/types"

function isBareBombAttackName(name: string): boolean {
  return /^bombs?$/i.test(name.trim())
}

/** MHP JSON often tags formula rows as `upgrade`; the picker still needs them. */
export function isBombFormulaAbility(ability: {
  name: string
  ability_role?: string | null
}): boolean {
  const role = ability.ability_role?.trim() ?? ""
  if (role === "bomb_formula") return true
  if (role === "alchemist_bomb" || role === "discovery") return false
  if (isBareBombAttackName(ability.name)) return false
  if (!/\bbomb\b/i.test(ability.name)) return false
  return role === "upgrade" || role === ""
}

export function bombFormulaAbilitiesForClass(
  customAbilities: CustomAbility[],
  classNames: string[],
  options?: { classIds?: string[] },
): CustomAbility[] {
  const targets: ClassAbilityMatchTarget = { classNames, classIds: options?.classIds }
  return customAbilities.filter((ability) => {
    if (!isBombFormulaAbility(ability)) return false
    return customAbilityMatchesClass(ability, targets, { includeUnassigned: true })
  })
}

function optionsFromFormulaAbility(ability: CustomAbility): FeatureChoice["options"] {
  const nested = ability.choices?.options ?? []
  if (nested.length > 0) {
    return nested.map((option) => ({
      name: option.name,
      description: option.description ?? "",
      prerequisite: option.prerequisite ?? ability.prerequisites,
      level_requirement: option.level_requirement ?? ability.level_requirement ?? null,
      repeatable: option.repeatable ?? ability.repeatable ?? false,
    }))
  }
  return [
    {
      name: ability.name,
      description: ability.description ?? "",
      prerequisite: ability.prerequisites,
      level_requirement: ability.level_requirement ?? null,
      repeatable: ability.repeatable ?? false,
    },
  ]
}

export function aggregateBombFormulaOptions(params: {
  customAbilities: CustomAbility[]
  classNames: string[]
  classLevel?: number
  classIds?: string[]
}): FeatureChoice["options"] {
  const classLevel = params.classLevel ?? 20
  const seen = new Set<string>()
  const options: FeatureChoice["options"] = []
  for (const ability of bombFormulaAbilitiesForClass(params.customAbilities, params.classNames, {
    classIds: params.classIds,
  })) {
    if (
      !isCustomAbilityEligible(ability, {
        classLevel,
        selectedAbilityNames: [],
      })
    ) {
      continue
    }
    for (const option of optionsFromFormulaAbility(ability)) {
      const key = option.name.trim().toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      options.push(option)
    }
  }
  return options.sort((a, b) => a.name.localeCompare(b.name))
}
