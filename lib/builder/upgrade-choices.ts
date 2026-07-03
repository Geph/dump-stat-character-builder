import type { CustomAbility } from "@/lib/types"

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

export function upgradeAbilitiesForClass(
  customAbilities: CustomAbility[],
  classNames: string[],
): CustomAbility[] {
  const classKeys = new Set(classNames.map(normalizeName))
  return customAbilities.filter((ability) => {
    if (ability.ability_role !== "upgrade") return false
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

export function isUpgradeEligible(upgrade: CustomAbility, classLevel: number): boolean {
  const minLevel = upgrade.level_requirement ?? null
  if (minLevel != null && classLevel < minLevel) return false
  return true
}

export function aggregateUpgradeOptions(params: {
  customAbilities: CustomAbility[]
  classNames: string[]
  classLevel: number
  selectedUpgradeNames: string[]
}): { name: string; description: string; prerequisite?: string | null; repeatable?: boolean | null }[] {
  const upgrades = upgradeAbilitiesForClass(params.customAbilities, params.classNames)
  const selected = params.selectedUpgradeNames
  const options: {
    name: string
    description: string
    prerequisite?: string | null
    repeatable?: boolean | null
  }[] = []

  for (const upgrade of upgrades) {
    if (!isUpgradeEligible(upgrade, params.classLevel)) continue
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

export function validateUpgradeSelectionChange(params: {
  next: string[]
  customAbilities: CustomAbility[]
  classLevel: number
}): { ok: true } | { ok: false; message: string } {
  const upgradeByName = new Map(
    params.customAbilities
      .filter((row) => row.ability_role === "upgrade")
      .map((row) => [normalizeName(row.name), row]),
  )

  const counts = new Map<string, number>()
  for (const name of params.next) {
    const upgrade = upgradeByName.get(normalizeName(name))
    if (!upgrade) continue
    if (!isUpgradeEligible(upgrade, params.classLevel)) {
      return { ok: false, message: `${name} is not available at your current level.` }
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
