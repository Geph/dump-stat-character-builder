import { isDisciplinePackageAbility } from "@/lib/builder/aggregate-psionic-talents"
import type { CustomAbility } from "@/lib/types"

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function namesMatch(a: string, b: string): boolean {
  const left = normalizeName(a)
  const right = normalizeName(b)
  if (!left || !right) return false
  return left === right || left.includes(right) || right.includes(left)
}

/**
 * Roles that represent a player-chosen pool entry. These must be unlocked via
 * feature/feat picks or grant_custom_ability before their modifiers apply.
 */
export function isPickGatedAbilityRole(role: string | null | undefined): boolean {
  return (
    role === "discipline" ||
    role === "knack" ||
    role === "upgrade" ||
    role === "class_talent" ||
    role === "bomb_formula" ||
    role === "discovery"
  )
}

/** Catalog packages are never granted as a whole — only their nested options. */
export function isCatalogPackageAbility(ability: CustomAbility): boolean {
  return ability.ability_role === "talent_pool"
}

export function isPickGatedCustomAbility(ability: CustomAbility): boolean {
  if (isCatalogPackageAbility(ability)) return false
  if (isPickGatedAbilityRole(ability.ability_role)) return true
  return isDisciplinePackageAbility(ability)
}

export function abilityNameIsSelected(
  abilityName: string,
  selectedNames: Iterable<string>,
): boolean {
  for (const selected of selectedNames) {
    if (namesMatch(abilityName, selected)) return true
  }
  return false
}

/** Flatten pick maps + fixed grants into the set of unlocked custom-ability names. */
export function collectSelectedCustomAbilityNames(params: {
  featureChoicePicks?: Record<string, string[]>
  featChoicePicks?: Record<string, string[]>
  grantedCustomAbilityNames?: string[]
}): string[] {
  const names: string[] = []
  const seen = new Set<string>()
  const push = (raw: string) => {
    const name = raw.trim()
    if (!name) return
    const key = normalizeName(name)
    if (seen.has(key)) return
    seen.add(key)
    names.push(name)
  }

  for (const picks of Object.values(params.featureChoicePicks ?? {})) {
    for (const pick of picks) push(pick)
  }
  for (const picks of Object.values(params.featChoicePicks ?? {})) {
    for (const pick of picks) push(pick)
  }
  for (const grant of params.grantedCustomAbilityNames ?? []) push(grant)

  return names
}

/**
 * Keep always-on abilities; keep pick-gated ones only when selected/granted.
 * Catalog packages (talent_pool) are excluded from modifier application.
 */
export function filterUnlockedCustomAbilities(
  abilities: CustomAbility[],
  selectedNames: readonly string[],
): CustomAbility[] {
  return abilities.filter((ability) => {
    if (isCatalogPackageAbility(ability)) return false
    if (!isPickGatedCustomAbility(ability)) return true
    return abilityNameIsSelected(ability.name, selectedNames)
  })
}
