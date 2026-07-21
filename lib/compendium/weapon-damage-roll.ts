import { getWeaponAttackAbility, getWeaponDamageText } from "@/lib/compendium/combat-stats"
import { hasWeaponProperty } from "@/lib/compendium/combat-stats"
import { replaceDamageDiceSides } from "@/lib/compendium/weapon-damage-die-override"
import type { Equipment } from "@/lib/types"

export type DamageRollMode = "normal" | "advantage" | "disadvantage"

export type WeaponDamageDiceOption = {
  id: string
  label: string
  dice: string
}

function bumpVersatileDie(dice: string): string | null {
  const match = dice.trim().match(/^(\d+)d(\d+)$/i)
  if (!match) return null
  const count = parseInt(match[1], 10)
  const sides = parseInt(match[2], 10)
  const nextSides = ({ 4: 6, 6: 8, 8: 10, 10: 12 } as Record<number, number>)[sides]
  return nextSides ? `${count}d${nextSides}` : null
}

export function parseWeaponDamageDice(damageText: string | null): {
  oneHanded: string | null
  twoHanded: string | null
} {
  if (!damageText?.trim()) return { oneHanded: null, twoHanded: null }
  const trimmed = damageText.trim()
  const paren = trimmed.match(/^([\dd+\s]+?)\s*\(\s*([\dd]+)\s*\)/i)
  if (paren) {
    return { oneHanded: paren[1].trim(), twoHanded: paren[2].trim() }
  }
  const slash = trimmed.match(/^([\dd]+)\s*\/\s*([\dd]+)/i)
  if (slash) {
    return { oneHanded: slash[1].trim(), twoHanded: slash[2].trim() }
  }
  const primary = trimmed.match(/^[\dd]+/i)?.[0] ?? trimmed
  return { oneHanded: primary, twoHanded: null }
}

export function weaponDamageDiceOptions(
  weapon: Equipment,
  options?: { overrideDieSides?: number | null },
): WeaponDamageDiceOption[] {
  const damageText = getWeaponDamageText(weapon)
  const { oneHanded, twoHanded } = parseWeaponDamageDice(damageText)
  if (!oneHanded) return []

  const applyOverride = (dice: string) =>
    options?.overrideDieSides != null ? replaceDamageDiceSides(dice, options.overrideDieSides) : dice

  const one = applyOverride(oneHanded)
  const optionsList: WeaponDamageDiceOption[] = [
    { id: "one-handed", label: "One-handed", dice: one },
  ]

  const versatileRaw =
    twoHanded ??
    (hasWeaponProperty(weapon, "versatile") ? bumpVersatileDie(oneHanded) : null)
  const versatile = versatileRaw ? applyOverride(versatileRaw) : null
  if (versatile && versatile !== one) {
    optionsList.push({ id: "two-handed", label: "Two-handed", dice: versatile })
  }
  return optionsList
}

export function buildWeaponDamageExpression(params: {
  weapon: Equipment
  abilityMods: import("@/lib/compendium/combat-stats").AbilityMods
  dice: string
  includeAbilityModifier: boolean
  flatDamageBonus?: number
  overrides?: import("@/lib/compendium/characteristic-modifiers").WeaponAbilityOverrideCharacteristic[] | null
}): string {
  const {
    weapon,
    abilityMods,
    dice,
    includeAbilityModifier,
    flatDamageBonus = 0,
    overrides,
  } = params
  const { mod: abilityMod } = getWeaponAttackAbility(weapon, abilityMods, {
    overrides,
    forRoll: "damage",
  })
  const appliedMod = includeAbilityModifier ? abilityMod : abilityMod < 0 ? abilityMod : 0
  const totalMod = appliedMod + flatDamageBonus
  const modSuffix =
    totalMod === 0 ? "" : totalMod > 0 ? ` + ${totalMod}` : ` - ${Math.abs(totalMod)}`
  const damageType = weapon.damage_type?.trim()
  return `${dice}${modSuffix}${damageType ? ` ${damageType}` : ""}`.trim()
}
