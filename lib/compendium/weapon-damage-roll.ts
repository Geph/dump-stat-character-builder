import {
  getWeaponAttackAbility,
  getWeaponDamageDiceNotation,
  getWeaponDamageText,
  hasWeaponProperty,
  isUnarmedStrikeWeapon,
  weaponOmitsAbilityModifierFromDamage,
  type AbilityMods,
} from "@/lib/compendium/combat-stats"
import type { PowerRiderCharacteristic } from "@/lib/compendium/characteristic-modifiers"
import { replaceDamageDiceSides } from "@/lib/compendium/weapon-damage-die-override"
import type { Equipment } from "@/lib/types"

export type DamageRollMode = "normal" | "advantage" | "disadvantage"

export type WeaponDamageDiceOption = {
  id: string
  label: string
  dice: string
}

/** Optional flat bonuses / extra dice on the weapon DMG menu (Fierce Start, Finisher, etc.). */
export type WeaponDamageBonusOption = {
  id: string
  label: string
  /** Flat modifier added to the damage total. */
  bonus: number
  /** Extra dice appended to the expression (e.g. Finisher 2d8). */
  bonusDice?: string | null
  /** Damage type for appended dice when different from the weapon. */
  bonusDiceType?: string | null
  /** Hover / title hint (e.g. first-round timing). */
  title?: string
  /** When false, leave unchecked until the player opts in. Defaults to true. */
  defaultSelected?: boolean
}

/** Persistent weapon spell buffs managed from the damage ··· menu (Magic Weapon, …). */
export type WeaponSpellBuffMenuOption = {
  id: string
  label: string
  checked: boolean
  title?: string
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

function riderMentions(rider: PowerRiderCharacteristic, pattern: RegExp): boolean {
  return (
    pattern.test(rider.id) ||
    pattern.test(rider.label ?? "") ||
    pattern.test(rider.alertSummary ?? "")
  )
}

function isFirearmWeapon(weapon: Equipment): boolean {
  if (hasWeaponProperty(weapon, "firearm")) return true
  return /firearm/i.test(weapon.subcategory ?? "")
}

/** Double leading NdM (critical / Grand Finale). */
export function doubleWeaponDamageDice(dice: string): string | null {
  const match = dice.trim().match(/^(\d+)d(\d+)(.*)$/i)
  if (!match) return null
  const count = parseInt(match[1], 10)
  const sides = parseInt(match[2], 10)
  if (!Number.isFinite(count) || !Number.isFinite(sides) || count < 1) return null
  return `${count * 2}d${sides}${match[3] ?? ""}`
}

/** Average of NdM (used to pick the highest damage option by default). */
export function expectedWeaponDamageDiceValue(dice: string): number {
  const match = dice.trim().match(/^(\d+)d(\d+)/i)
  if (!match) {
    const flat = parseInt(dice.trim(), 10)
    return Number.isFinite(flat) ? flat : 0
  }
  const count = parseInt(match[1], 10)
  const sides = parseInt(match[2], 10)
  return (count * (sides + 1)) / 2
}

export function preferredWeaponDamageDiceId(
  options: readonly WeaponDamageDiceOption[],
): string | undefined {
  if (!options.length) return undefined
  let best = options[0]!
  let bestValue = expectedWeaponDamageDiceValue(best.dice)
  for (const option of options.slice(1)) {
    const value = expectedWeaponDamageDiceValue(option.dice)
    if (value > bestValue) {
      best = option
      bestValue = value
    }
  }
  return best.id
}

/** Optional play-time replacements (Deadly D4s / Dervish Firearms / Grand Finale) — never rewrite the printed die. */
export function optionalWeaponDamageReplacements(
  weapon: Equipment,
  riders: readonly PowerRiderCharacteristic[] | null | undefined,
): WeaponDamageDiceOption[] {
  if (!riders?.length) return []
  const deadly = riders.some((rider) => riderMentions(rider, /deadly[_ ]?d4s/i))
  const firearms = riders.some((rider) => riderMentions(rider, /dervish firearms/i))
  const grandFinale = riders.some((rider) => riderMentions(rider, /grand[_ ]?finale/i))
  if (!deadly && !firearms && !grandFinale) return []

  const notation = getWeaponDamageDiceNotation(weapon)
  const options: WeaponDamageDiceOption[] = []
  if (deadly && (notation === "1d4" || notation === "1d6" || isUnarmedStrikeWeapon(weapon))) {
    options.push({ id: "deadly-d4s", label: "Deadly D4s", dice: "2d4" })
  }
  if (firearms && notation === "2d4" && isFirearmWeapon(weapon)) {
    options.push({ id: "dervish-firearms", label: "Dervish Firearms", dice: "3d4" })
  }

  if (grandFinale) {
    // Crit = double the best available die for this weapon (Deadly / Dervish / printed).
    const source =
      options.find((option) => option.id === "dervish-firearms") ??
      options.find((option) => option.id === "deadly-d4s") ??
      (notation ? { id: "base", label: "weapon", dice: notation } : null)
    const doubled = source ? doubleWeaponDamageDice(source.dice) : null
    if (doubled && doubled !== source!.dice) {
      options.push({
        id: "grand-finale",
        label: "Grand Finale",
        dice: doubled,
      })
    }
  }

  return options
}

function finisherDiceForLevel(level: number): string {
  if (level >= 17) return "3d8"
  if (level >= 11) return "2d8"
  return "1d8"
}

/**
 * Optional flat damage bonuses (Fierce Start +CHA) and Finisher dice.
 * Shown alongside Deadly D4s whenever the rider is present (player opts in).
 */
export function optionalWeaponDamageBonuses(
  _weapon: Equipment,
  riders: readonly PowerRiderCharacteristic[] | null | undefined,
  abilityMods: AbilityMods | null | undefined,
  opts?: {
    investigatorLevel?: number | null
    activeSheetToggleIds?: readonly string[] | null
  },
): WeaponDamageBonusOption[] {
  if (!riders?.length) return []
  const options: WeaponDamageBonusOption[] = []

  const fierce = riders.some((rider) => riderMentions(rider, /fierce[_ ]?start/i))
  if (fierce && abilityMods) {
    const bonus = abilityMods.charisma
    const signed = bonus >= 0 ? `+${bonus}` : `${bonus}`
    options.push({
      id: "fierce-start",
      label: `Fierce Start (${signed} CHA)`,
      bonus,
      title:
        "First round of combat: add your Charisma modifier to this weapon or Unarmed Strike damage roll.",
    })
  }

  const improved = riders.some((rider) => riderMentions(rider, /improved[_ ]?finisher/i))
  const finisher = improved || riders.some((rider) => riderMentions(rider, /\bfinisher\b/i))
  if (finisher) {
    const level = Math.max(1, opts?.investigatorLevel ?? 2)
    const dice = finisherDiceForLevel(level)
    const bloodied = (opts?.activeSheetToggleIds ?? []).includes("below_half_hp")
    options.push({
      id: "finisher",
      label: improved ? `Finisher (${dice})` : `Finisher (${dice}, Bloodied)`,
      bonus: 0,
      bonusDice: dice,
      title: improved
        ? "Once per turn on a hit: add Finisher damage dice."
        : "Once per turn vs a Bloodied target: add Finisher damage dice.",
      defaultSelected: improved || bloodied,
    })
  }

  return options
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
