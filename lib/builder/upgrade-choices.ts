import { isBombFormulaAbility } from "@/lib/builder/aggregate-bomb-formulas"
import { isDiscoveryAbility } from "@/lib/builder/aggregate-discoveries"
import { isChoiceOptionEligible } from "@/lib/builder/choice-option-eligibility"
import type { ChoicePrerequisiteContext } from "@/lib/builder/choice-prerequisite"
import { customAbilityMatchesClass } from "@/lib/builder/class-ability-match"
import type { CustomAbility } from "@/lib/types"

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

export function upgradeAbilitiesForClass(
  customAbilities: CustomAbility[],
  classNames: string[],
  options?: { subclassName?: string | null; classIds?: string[] },
): CustomAbility[] {
  const targets = { classNames, classIds: options?.classIds }
  return customAbilities.filter((ability) => {
    if (ability.ability_role !== "upgrade" && ability.ability_role !== "weapon_mastery") return false
    if (isBombFormulaAbility(ability)) return false
    if (isDiscoveryAbility(ability)) return false
    return customAbilityMatchesClass(ability, targets, { subclassName: options?.subclassName })
  })
}

export function isUpgradeEligible(
  upgrade: CustomAbility,
  classLevel: number,
  context?: Pick<ChoicePrerequisiteContext, "classNames" | "weapon">,
): boolean {
  return isChoiceOptionEligible(
    {
      name: upgrade.name,
      description: upgrade.description,
      prerequisite: upgrade.prerequisites,
      level_requirement: upgrade.level_requirement,
    },
    {
      classLevel,
      selectedAbilityNames: [],
      classNames: context?.classNames,
      weapon: context?.weapon,
    },
  )
}

export function aggregateUpgradeOptions(params: {
  customAbilities: CustomAbility[]
  classNames: string[]
  classLevel: number
  selectedUpgradeNames: string[]
  subclassName?: string | null
  classIds?: string[]
}): { name: string; description: string; prerequisite?: string | null; repeatable?: boolean | null }[] {
  const upgrades = upgradeAbilitiesForClass(params.customAbilities, params.classNames, {
    subclassName: params.subclassName,
    classIds: params.classIds,
  })
  const selected = params.selectedUpgradeNames
  const options: {
    name: string
    description: string
    prerequisite?: string | null
    repeatable?: boolean | null
  }[] = []

  for (const upgrade of upgrades) {
    if (!isUpgradeEligible(upgrade, params.classLevel, { classNames: params.classNames })) continue
    const countInSelection = selected.filter((name) => normalizeName(name) === normalizeName(upgrade.name)).length
    if (!upgrade.repeatable && countInSelection > 0) continue
    options.push({
      name: upgrade.name,
      description: upgrade.description ?? "",
      prerequisite: upgrade.prerequisites,
      repeatable: upgrade.repeatable ?? false,
    })
  }

  return options.sort((a, b) => a.name.localeCompare(b.name))
}

export function aggregateWeaponMasteryOptionsForWeapon(params: {
  customAbilities: CustomAbility[]
  classNames: string[]
  classLevel: number
  weapon: NonNullable<ChoicePrerequisiteContext["weapon"]>
  subclassName?: string | null
}): { name: string; description: string; prerequisite?: string | null }[] {
  return upgradeAbilitiesForClass(params.customAbilities, params.classNames, {
    subclassName: params.subclassName,
  })
    .filter((upgrade) => upgrade.ability_role === "weapon_mastery")
    .filter((upgrade) =>
      isWeaponMasteryEligibleForWeapon(upgrade, params.classLevel, params.weapon, params.classNames),
    )
    .map((upgrade) => ({
      name: upgrade.name,
      description: upgrade.description ?? "",
      prerequisite: upgrade.prerequisites,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function isWeaponMasteryEligibleForWeapon(
  upgrade: CustomAbility,
  classLevel: number,
  weapon: NonNullable<ChoicePrerequisiteContext["weapon"]>,
  classNames: string[] = [],
): boolean {
  return isUpgradeEligible(upgrade, classLevel, { classNames, weapon })
}

export function validateUpgradeSelectionChange(params: {
  next: string[]
  customAbilities: CustomAbility[]
  classLevel: number
}): { ok: true } | { ok: false; message: string } {
  const upgradeByName = new Map(
    params.customAbilities
      .filter((row) => row.ability_role === "upgrade" || row.ability_role === "weapon_mastery")
      .map((row) => [normalizeName(row.name), row]),
  )

  const counts = new Map<string, number>()
  for (const name of params.next) {
    const upgrade = upgradeByName.get(normalizeName(name))
    if (!upgrade) continue
    if (!isUpgradeEligible(upgrade, params.classLevel)) {
      return { ok: false, message: `${name} is not available with your current prerequisites.` }
    }
    if (upgrade.repeatable) {
      counts.set(normalizeName(name), (counts.get(normalizeName(name)) ?? 0) + 1)
      continue
    }
    const count = (counts.get(normalizeName(name)) ?? 0) + 1
    if (count > 1) {
      return { ok: false, message: `${name} cannot be selected more than once.` }
    }
    counts.set(normalizeName(name), count)
  }

  return { ok: true }
}
