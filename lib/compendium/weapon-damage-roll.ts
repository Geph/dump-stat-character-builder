import {
  getWeaponAttackAbility,
  getWeaponDamageText,
  hasWeaponProperty,
  weaponOmitsAbilityModifierFromDamage,
} from "@/lib/compendium/combat-stats"
import { replaceDamageDiceSides } from "@/lib/compendium/weapon-damage-die-override"
import type { Equipment } from "@/lib/types"

export type DamageRollMode = "normal" | "advantage" | "disadvantage"

export type WeaponDamageDiceOption = {
  id: string
  label: string
  dice: string
}

/** Replace the leading die (or flat 1) and keep signed modifiers + damage type. */
export function swapDamageDice(expression: string, dice: string): string {
  const withoutType = expression.replace(/\s+[a-z][a-z\s]*$/i, "").trim()
  const typePart = expression.match(/\s+([a-z][a-z\s]*)$/i)?.[1] ?? ""
  const dicePrefix = withoutType.match(/^(\d+d\d+|\d+)/i)?.[0] ?? ""
  const modPart = dicePrefix ? withoutType.slice(dicePrefix.length).trim() : withoutType
  return `${dice}${modPart ? ` ${modPart}` : ""}${typePart ? ` ${typePart}` : ""}`.trim()
}

const DIE_STEP_SIDES: Record<number, number> = { 4: 6, 6: 8, 8: 10, 10: 12 }

/** d4 → d6 → d8 → d10 → d12 (cap). Returns null when the expression has no die to step. */
export function stepWeaponDamageDice(dice: string): string | null {
  const match = dice.trim().match(/^(\d+)d(\d+)/i)
  if (!match) return null
  const count = parseInt(match[1], 10)
  const sides = parseInt(match[2], 10)
  const nextSides = DIE_STEP_SIDES[sides]
  if (!nextSides) return `${count}d${sides}`
  return `${count}d${nextSides}${dice.trim().slice(match[0].length)}`
}

function bumpVersatileDie(dice: string): string | null {
  return stepWeaponDamageDice(dice)
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
  options?: { overrideDieSides?: number | null; stepDice?: boolean },
): WeaponDamageDiceOption[] {
  const damageText = getWeaponDamageText(weapon)
  const { oneHanded, twoHanded } = parseWeaponDamageDice(damageText)
  if (!oneHanded) return []

  const applyOverride = (dice: string) => {
    const overridden =
      options?.overrideDieSides != null ? replaceDamageDiceSides(dice, options.overrideDieSides) : dice
    if (!options?.stepDice) return overridden
    return stepWeaponDamageDice(overridden) ?? overridden
  }

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
  grantAbilityModifierWhenMissing?: boolean
  bonusDiceWhenModifierIncluded?: string | null
  bonusDiceUsesWeaponDamageType?: boolean
  overrides?: import("@/lib/compendium/characteristic-modifiers").WeaponAbilityOverrideCharacteristic[] | null
}): string {
  const {
    weapon,
    abilityMods,
    dice,
    includeAbilityModifier,
    flatDamageBonus = 0,
    grantAbilityModifierWhenMissing = false,
    bonusDiceWhenModifierIncluded = null,
    bonusDiceUsesWeaponDamageType = false,
    overrides,
  } = params
  const { mod: abilityMod } = getWeaponAttackAbility(weapon, abilityMods, {
    overrides,
    forRoll: "damage",
  })
  const appliedMod = shouldApplyAbilityModifierToWeaponDamage({
    weapon,
    includeAbilityModifier,
    grantAbilityModifierWhenMissing,
    abilityMod,
  })
    ? abilityMod
    : 0
  const totalMod = appliedMod + flatDamageBonus
  const modSuffix =
    totalMod === 0 ? "" : totalMod > 0 ? ` + ${totalMod}` : ` - ${Math.abs(totalMod)}`
  const damageType =
    weapon.damage_type?.trim() ||
    getWeaponDamageText(weapon)?.replace(/^[\d+d\s/()-]+/i, "").trim() ||
    ""
  const withMod = `${dice}${modSuffix}${damageType ? ` ${damageType}` : ""}`.trim()
  const normallyIncludesAbility =
    !weaponOmitsAbilityModifierFromDamage(weapon) && includeAbilityModifier !== false
  if (normallyIncludesAbility && bonusDiceWhenModifierIncluded) {
    const extraType = bonusDiceUsesWeaponDamageType ? damageType : null
    return appendBonusDamageDice(withMod, bonusDiceWhenModifierIncluded, extraType)
  }
  return withMod
}

export function shouldApplyAbilityModifierToWeaponDamage(params: {
  weapon: Equipment
  includeAbilityModifier?: boolean
  grantAbilityModifierWhenMissing: boolean
  abilityMod: number
}): boolean {
  const { weapon, includeAbilityModifier, grantAbilityModifierWhenMissing, abilityMod } = params
  if (grantAbilityModifierWhenMissing) return true
  if (weaponOmitsAbilityModifierFromDamage(weapon)) return false
  if (includeAbilityModifier === false) return abilityMod < 0
  return true
}

/** Append extra dice before the damage type when the type matches (`2d6 + 4 + 1d8 Piercing`). */
export function appendBonusDamageDice(
  display: string,
  dice: string,
  extraType?: string | null,
): string {
  const typePart = display.match(/\s+([A-Za-z][A-Za-z\s]*)$/)?.[1] ?? ""
  const withoutType = typePart ? display.slice(0, display.length - typePart.length).trim() : display
  const extra = extraType?.trim()
  if (extra && typePart && extra.toLowerCase() === typePart.toLowerCase()) {
    return `${withoutType} + ${dice} ${typePart}`.trim()
  }
  if (extra) return `${display} + ${dice} ${extra}`.trim()
  return `${withoutType} + ${dice}${typePart ? ` ${typePart}` : ""}`.trim()
}
