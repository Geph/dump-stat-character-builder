import type { Equipment } from "@/lib/types"
import { propertiesToStringArray } from "@/lib/compendium/equipment-properties"

export type AbilityMods = {
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
}

function getPropertyRecord(equipment: Equipment): Record<string, unknown> {
  if (equipment.properties && typeof equipment.properties === "object" && !Array.isArray(equipment.properties)) {
    return equipment.properties as Record<string, unknown>
  }
  return {}
}

export function isShieldItem(equipment: Equipment): boolean {
  if (equipment.subcategory === "Shield") return true
  return equipment.name.toLowerCase().includes("shield")
}

export function isArmorItem(equipment: Equipment): boolean {
  return equipment.category === "Armor" && !isShieldItem(equipment)
}

export function isWeaponItem(equipment: Equipment): boolean {
  return equipment.category === "Weapon"
}

export function getArmorAcText(equipment: Equipment): string | null {
  if (equipment.armor_class != null) return String(equipment.armor_class)
  const ac = getPropertyRecord(equipment).ac
  return typeof ac === "string" ? ac : null
}

export function getWeaponDamageText(equipment: Equipment): string | null {
  if (equipment.damage) return equipment.damage
  const damage = getPropertyRecord(equipment).damage
  return typeof damage === "string" ? damage : null
}

export function hasWeaponProperty(equipment: Equipment, property: string): boolean {
  const needle = property.toLowerCase()
  return propertiesToStringArray(equipment.properties).some((tag) => tag.toLowerCase().includes(needle))
}

export function parseArmorAc(acText: string, dexMod: number): number {
  const text = acText.trim()

  if (/^\+\d+$/.test(text)) {
    return 10 + dexMod
  }

  if (/^\d+$/.test(text)) {
    return parseInt(text, 10)
  }

  const basePlusDex = text.match(/^(\d+)\s*\+\s*dex/i)
  if (basePlusDex) {
    const base = parseInt(basePlusDex[1], 10)
    const maxDexMatch = text.match(/max\s*(\d+)/i)
    const dexContribution = maxDexMatch
      ? Math.min(dexMod, parseInt(maxDexMatch[1], 10))
      : dexMod
    return base + dexContribution
  }

  const leadingNumber = text.match(/^(\d+)/)
  if (leadingNumber) {
    return parseInt(leadingNumber[1], 10) + dexMod
  }

  return 10 + dexMod
}

export function getShieldBonus(shield: Equipment | null): number {
  if (!shield) return 0
  const acText = getArmorAcText(shield)
  if (acText?.startsWith("+")) {
    return parseInt(acText.replace("+", ""), 10) || 2
  }
  return 2
}

export function calculateArmorClass(
  dexMod: number,
  armor: Equipment | null,
  shield: Equipment | null,
): number {
  let ac: number
  if (armor) {
    const acText = getArmorAcText(armor)
    ac = acText ? parseArmorAc(acText, dexMod) : 10 + dexMod
  } else {
    ac = 10 + dexMod
  }
  return ac + getShieldBonus(shield)
}

export function getWeaponAbilityMod(weapon: Equipment, abilityMods: AbilityMods): number {
  return getWeaponAttackAbility(weapon, abilityMods).mod
}

/**
 * Which ability the weapon's attack/damage uses, with the resolved modifier and a
 * human-readable label (used for roll breakdown tooltips). Ranged weapons use Dexterity,
 * Finesse weapons use the higher of Strength/Dexterity, and everything else uses Strength.
 */
export function getWeaponAttackAbility(
  weapon: Equipment,
  abilityMods: AbilityMods,
): { ability: "strength" | "dexterity"; mod: number; label: string } {
  const isRanged = weapon.subcategory?.toLowerCase().includes("ranged") ?? false
  if (isRanged) {
    return { ability: "dexterity", mod: abilityMods.dexterity, label: "Dexterity" }
  }
  if (hasWeaponProperty(weapon, "finesse")) {
    return abilityMods.dexterity > abilityMods.strength
      ? { ability: "dexterity", mod: abilityMods.dexterity, label: "Dexterity (Finesse)" }
      : { ability: "strength", mod: abilityMods.strength, label: "Strength (Finesse)" }
  }
  return { ability: "strength", mod: abilityMods.strength, label: "Strength" }
}

function weaponNameMatchesProficiency(proficiency: string, weaponName: string): boolean {
  const prof = proficiency.trim().toLowerCase()
  const name = weaponName.trim().toLowerCase()
  if (!prof || !name) return false
  if (prof === name) return true
  if (prof.endsWith("s") && prof.slice(0, -1) === name) return true
  if (name.endsWith("s") && name.slice(0, -1) === prof) return true
  return false
}

/**
 * Whether a "martial weapons" proficiency string applies to this weapon. Honors
 * property qualifiers such as "Martial weapons that have the Light property"
 * (e.g. Monk) — the weapon must have at least one of the listed properties.
 */
function martialProficiencyAllows(weapon: Equipment, proficiency: string): boolean {
  const qualifier = proficiency.match(/(?:have|with) the (.+?)\s+propert/i)
  if (!qualifier) return true
  const properties = qualifier[1]
    .split(/\s*(?:,|\bor\b|\band\b)\s*/i)
    .map((entry) => entry.trim())
    .filter(Boolean)
  if (!properties.length) return true
  return properties.some((property) => hasWeaponProperty(weapon, property))
}

export function isWeaponProficient(
  weapon: Equipment,
  proficiencies: string[] | null | undefined,
): boolean {
  if (!proficiencies?.length) return false
  const sub = weapon.subcategory?.toLowerCase() ?? ""
  const name = weapon.name.toLowerCase()
  const normalized = proficiencies.map((p) => p.toLowerCase())

  if (normalized.some((p) => p.includes("all martial"))) {
    if (sub.includes("martial")) return true
  }
  if (sub.includes("simple")) {
    if (normalized.some((p) => p.includes("simple"))) return true
  }
  if (sub.includes("martial")) {
    if (normalized.some((p) => p.includes("martial") && martialProficiencyAllows(weapon, p))) {
      return true
    }
  }
  if (normalized.some((p) => weaponNameMatchesProficiency(p, name))) {
    return true
  }
  return false
}

export function calculateWeaponAttack(
  weapon: Equipment,
  abilityMods: AbilityMods,
  proficiencyBonus: number,
  isProficient: boolean,
): {
  attackBonus: number
  damageDisplay: string
  attackBreakdown: { label: string; value: number }[]
} | null {
  const damageText = getWeaponDamageText(weapon)
  if (!damageText) return null

  const match = damageText.trim().match(/^([\d+d\s]+)\s*(.*)$/i)
  const dice = match?.[1]?.trim() ?? damageText
  const damageType = match?.[2]?.trim() || weapon.damage_type || ""

  const { mod: abilityMod, label: abilityLabel } = getWeaponAttackAbility(weapon, abilityMods)
  const attackBonus = abilityMod + (isProficient ? proficiencyBonus : 0)
  const modSuffix =
    abilityMod === 0 ? "" : abilityMod > 0 ? ` + ${abilityMod}` : ` - ${Math.abs(abilityMod)}`
  const damageDisplay = `${dice}${modSuffix}${damageType ? ` ${damageType}` : ""}`.trim()

  const attackBreakdown = [{ label: abilityLabel, value: abilityMod }]
  if (isProficient) {
    attackBreakdown.push({ label: "Proficiency", value: proficiencyBonus })
  }

  return { attackBonus, damageDisplay, attackBreakdown }
}

export function getWeaponMastery(weapon: Equipment): string | null {
  if (weapon.mastery?.trim()) return weapon.mastery.trim()
  const mastery = getPropertyRecord(weapon).mastery
  return typeof mastery === "string" && mastery.trim() ? mastery : null
}

export function getWeaponRangeText(weapon: Equipment): string | null {
  if (weapon.range?.trim()) return weapon.range
  for (const tag of propertiesToStringArray(weapon.properties)) {
    const thrown = tag.match(/thrown\s*\(range\s*([\d/]+)\)/i)
    if (thrown) return `${thrown[1]} ft (thrown)`
    const range = tag.match(/range\s*([\d/]+)/i)
    if (range) return `${range[1]} ft`
  }
  const sub = weapon.subcategory?.toLowerCase() ?? ""
  if (sub.includes("melee")) return "Melee reach"
  if (sub.includes("ranged")) return "Ranged"
  return null
}

export function getWeaponPropertyTags(weapon: Equipment): string[] {
  return propertiesToStringArray(weapon.properties)
}
