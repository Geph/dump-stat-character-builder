import type { CustomAbility, FeatureChoice } from "@/lib/types"

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

export function discoveryAbilitiesForClass(
  customAbilities: CustomAbility[],
  classNames: string[],
): CustomAbility[] {
  const classKeys = new Set(classNames.map(normalizeName))
  return customAbilities.filter((ability) => {
    if (ability.ability_role !== "discovery") return false
    if (ability.attached_to_type === "class" && ability.attached_to_id) {
      const attachKey = normalizeName(ability.attached_to_id)
      return [...classKeys].some(
        (classKey) => attachKey.includes(classKey) || classKey.includes(attachKey),
      )
    }
    if (ability.source?.trim()) {
      return [...classKeys].some((classKey) => normalizeName(ability.source).includes(classKey))
    }
    return classNames.length === 0
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
}): FeatureChoice["options"] {
  const discoveries = discoveryAbilitiesForClass(params.customAbilities, params.classNames)
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
