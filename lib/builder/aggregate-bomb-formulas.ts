import type { CustomAbility, FeatureChoice } from "@/lib/types"

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

export function bombFormulaAbilitiesForClass(
  customAbilities: CustomAbility[],
  classNames: string[],
): CustomAbility[] {
  const classKeys = new Set(classNames.map(normalizeName))
  return customAbilities.filter((ability) => {
    if (ability.ability_role !== "bomb_formula") return false
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

export function aggregateBombFormulaOptions(params: {
  customAbilities: CustomAbility[]
  classNames: string[]
}): FeatureChoice["options"] {
  return bombFormulaAbilitiesForClass(params.customAbilities, params.classNames)
    .map((ability) => ({
      name: ability.name,
      description: ability.description ?? "",
      prerequisite: ability.prerequisites,
      repeatable: ability.repeatable ?? false,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
