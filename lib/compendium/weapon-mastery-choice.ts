import equipmentSeed from "@/lib/srd/seed-data/equipment.json"
import { describeWeaponMastery } from "@/lib/compendium/weapon-mastery"
import type { Feature, FeatureChoice } from "@/lib/types"

type FeatureChoiceOption = FeatureChoice["options"][number]

const FEATURE_OPTION_PICKER_CATALOG_ID = "cat_char_feature_option_picker"

export type WeaponMasteryPool = "melee" | "all" | "rogue"

const WEAPON_MASTERY_POOL_BY_CLASS: Record<string, WeaponMasteryPool> = {
  Barbarian: "melee",
  Fighter: "all",
  Paladin: "all",
  Ranger: "all",
  Rogue: "rogue",
}

const WORD_TO_COUNT: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
}

type SeedWeapon = {
  name: string
  category?: string
  subcategory?: string | null
  properties?: { mastery?: string; properties?: string[] } | null
}

function weaponMasteryProperty(weapon: SeedWeapon): string | null {
  const mastery = weapon.properties?.mastery?.trim()
  return mastery || null
}

function weaponMatchesPool(weapon: SeedWeapon, pool: WeaponMasteryPool): boolean {
  if (!weaponMasteryProperty(weapon)) return false
  const sub = (weapon.subcategory ?? "").toLowerCase()
  if (pool === "melee") {
    return sub.includes("melee") && (sub.includes("simple") || sub.includes("martial"))
  }
  if (pool === "rogue") {
    const props = (weapon.properties?.properties ?? []).join(" ").toLowerCase()
    if (sub.includes("simple")) return true
    return sub.includes("martial") && (props.includes("light") || props.includes("finesse"))
  }
  return true
}

function optionDescription(weapon: SeedWeapon): string {
  const mastery = weaponMasteryProperty(weapon)
  if (!mastery) return weapon.subcategory ?? ""
  const rules = describeWeaponMastery(mastery)
  return rules ? `${mastery} — ${rules}` : mastery
}

export function weaponMasteryOptionsForClass(className: string): FeatureChoiceOption[] {
  const pool = WEAPON_MASTERY_POOL_BY_CLASS[className] ?? "all"
  const weapons = (equipmentSeed as SeedWeapon[]).filter(
    (item) => item.category === "Weapon" && weaponMatchesPool(item, pool),
  )
  return weapons
    .map((weapon) => ({
      name: weapon.name,
      description: optionDescription(weapon),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function parseWeaponMasteryCountFromDescription(description: string): number | null {
  const match = description.match(
    /\b(one|two|three|four|five|six|seven|eight|\d+)\s+kinds?\s+of\b/i,
  )
  if (!match) return null
  const token = match[1].toLowerCase()
  if (WORD_TO_COUNT[token]) return WORD_TO_COUNT[token]
  const parsed = parseInt(token, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function buildWeaponMasteryFeatureChoice(feature: Feature, className: string): FeatureChoice {
  const fromDescription = parseWeaponMasteryCountFromDescription(feature.description ?? "")
  const fallbackCount =
    className === "Fighter" ? 3 : className === "Barbarian" ? 2 : 2

  return {
    category: "Weapon Mastery",
    count: fromDescription ?? fallbackCount,
    swappableOnRest: true,
    resourceKey: "weapon_mastery",
    options: weaponMasteryOptionsForClass(className),
  }
}

function isLegacyWeaponMasteryPicker(char: unknown): boolean {
  if (!char || typeof char !== "object") return false
  const legacy = char as { type?: string; resourceKey?: string | null }
  return legacy.type === "feature_option_picker" && legacy.resourceKey === "weapon_mastery"
}

/** Convert Weapon Mastery from legacy picker linked modifiers into a real FeatureChoice. */
export function enrichWeaponMasteryFeature(feature: Feature, className: string): Feature {
  if (!/^weapon mastery$/i.test(feature.name?.trim() ?? "")) return feature

  const incoming = feature.choices
  const built = buildWeaponMasteryFeatureChoice(feature, className)
  const choices: FeatureChoice = {
    ...built,
    category: incoming?.category?.trim() ? incoming.category : built.category,
    count: incoming?.count && incoming.count > 0 ? incoming.count : built.count,
    swappableOnRest: incoming?.swappableOnRest ?? built.swappableOnRest,
    resourceKey: incoming?.resourceKey ?? built.resourceKey,
    options: incoming?.options?.length ? incoming.options : built.options,
  }

  const linkedModifiers = (feature.linkedModifiers ?? []).filter((instance) => {
    if (instance.catalogRefId === FEATURE_OPTION_PICKER_CATALOG_ID) return false
    const characteristics = instance.characteristics ?? []
    return !characteristics.some((char) => isLegacyWeaponMasteryPicker(char))
  })

  return {
    ...feature,
    isChoice: true,
    choices,
    linkedModifiers: linkedModifiers.length > 0 ? linkedModifiers : undefined,
  }
}
