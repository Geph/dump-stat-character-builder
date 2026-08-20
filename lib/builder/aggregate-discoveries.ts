import {
  customAbilityMatchesClass,
  type ClassAbilityMatchTarget,
} from "@/lib/builder/class-ability-match"
import type { CustomAbility, FeatureChoice } from "@/lib/types"

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

export function discoveryAbilitiesForClass(
  customAbilities: CustomAbility[],
  classNames: string[],
  options?: { classIds?: string[] },
): CustomAbility[] {
  const targets: ClassAbilityMatchTarget = { classNames, classIds: options?.classIds }
  return customAbilities.filter((ability) => {
    if (ability.ability_role !== "discovery") return false
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
