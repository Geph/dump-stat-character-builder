import { isBombFormulaAbility } from "@/lib/builder/aggregate-bomb-formulas"
import {
  customAbilityMatchesClass,
  type ClassAbilityMatchTarget,
} from "@/lib/builder/class-ability-match"
import type { CustomAbility, FeatureChoice } from "@/lib/types"

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * MHP imports often tag Discoveries as `upgrade`. Keep them out of Inventor-style upgrade
 * pickers by requiring an Alchemist source (or an explicit discovery role).
 */
export function isDiscoveryAbility(ability: {
  name: string
  ability_role?: string | null
  source?: string | null
  source_name?: string | null
  parent_class_name?: string | null
}): boolean {
  const role = ability.ability_role?.trim() ?? ""
  if (role === "discovery") return true
  if (role === "bomb_formula" || role === "alchemist_bomb") return false
  if (isBombFormulaAbility(ability)) return false
  if (role !== "upgrade" && role !== "") return false
  const source = `${ability.source_name ?? ""} ${ability.source ?? ""} ${ability.parent_class_name ?? ""}`
  return /\balchemist\b/i.test(source)
}

export function inferredAlchemistAbilityRole(ability: {
  name: string
  ability_role?: string | null
  source?: string | null
  source_name?: string | null
  parent_class_name?: string | null
}): "bomb_formula" | "discovery" | "alchemist_bomb" | null {
  const role = ability.ability_role?.trim() ?? ""
  if (role === "alchemist_bomb") return "alchemist_bomb"
  if (/^bombs?$/i.test(ability.name.trim())) return "alchemist_bomb"
  if (isBombFormulaAbility(ability)) return "bomb_formula"
  if (isDiscoveryAbility(ability)) return "discovery"
  return null
}

export function discoveryAbilitiesForClass(
  customAbilities: CustomAbility[],
  classNames: string[],
  options?: { classIds?: string[] },
): CustomAbility[] {
  const targets: ClassAbilityMatchTarget = { classNames, classIds: options?.classIds }
  return customAbilities.filter((ability) => {
    if (!isDiscoveryAbility(ability)) return false
    return customAbilityMatchesClass(ability, targets, { includeUnassigned: true })
  })
}

export function isDiscoveryEligible(
  discovery: CustomAbility,
  classLevel: number,
  selectedDiscoveryNames: string[],
): boolean {
  const minLevel = discovery.level_requirement
  if (minLevel != null && classLevel < minLevel) return false
  if (discovery.repeatable) return true
  return !selectedDiscoveryNames.some(
    (name) => normalizeName(name) === normalizeName(discovery.name),
  )
}

export function aggregateDiscoveryOptions(params: {
  customAbilities: CustomAbility[]
  classNames: string[]
  classLevel: number
  selectedDiscoveryNames: string[]
  classIds?: string[]
}): FeatureChoice["options"] {
  const discoveries = discoveryAbilitiesForClass(params.customAbilities, params.classNames, {
    classIds: params.classIds,
  })
  return discoveries
    .filter((row) => isDiscoveryEligible(row, params.classLevel, params.selectedDiscoveryNames))
    .map((ability) => ({
      name: ability.name,
      description: ability.description ?? "",
      prerequisite: ability.prerequisites,
      repeatable: ability.repeatable ?? false,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
