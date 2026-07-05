import equipmentSeed from "@/lib/srd/seed-data/equipment.json"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import { describeWeaponMastery } from "@/lib/compendium/weapon-mastery"
import { WEAPON_MASTERY_CATALOG_ID } from "@/lib/compendium/weapon-mastery-catalog"
import { getWeaponMastery } from "@/lib/compendium/combat-stats"
import type { Equipment } from "@/lib/types"
import type { Feature, FeatureChoice } from "@/lib/types"

type FeatureChoiceOption = FeatureChoice["options"][number]

const FEATURE_OPTION_PICKER_CATALOG_ID = "cat_char_feature_option_picker"
const WEAPON_MASTERY_PICKER_CATALOG_IDS = new Set([
  FEATURE_OPTION_PICKER_CATALOG_ID,
  WEAPON_MASTERY_CATALOG_ID,
])

export type WeaponMasteryPool = "melee" | "all" | "rogue"

const WEAPON_MASTERY_COUNT_BY_CLASS: Record<string, { level: number; count: number }[]> = {
  Barbarian: [
    { level: 1, count: 2 },
    { level: 4, count: 3 },
    { level: 10, count: 4 },
  ],
  Fighter: [
    { level: 1, count: 3 },
    { level: 4, count: 4 },
    { level: 10, count: 5 },
    { level: 16, count: 6 },
  ],
}

/** Book-agnostic default when no per-class table is defined (matches Fighter progression). */
export const DEFAULT_WEAPON_MASTERY_CHOICE_COUNT_BY_LEVEL: { level: number; count: number }[] =
  WEAPON_MASTERY_COUNT_BY_CLASS.Fighter

const FIXED_WEAPON_MASTERY_COUNT = [{ level: 1, count: 2 }]

export function weaponMasteryChoiceCountByLevel(className: string): { level: number; count: number }[] {
  if (WEAPON_MASTERY_COUNT_BY_CLASS[className]) {
    return WEAPON_MASTERY_COUNT_BY_CLASS[className]
  }
  if (className === "Paladin" || className === "Ranger" || className === "Rogue") {
    return FIXED_WEAPON_MASTERY_COUNT
  }
  return DEFAULT_WEAPON_MASTERY_CHOICE_COUNT_BY_LEVEL
}

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
  mastery?: string | null
}

function weaponMasteryProperty(weapon: SeedWeapon | Equipment): string | null {
  const fromProps = weapon.properties && typeof weapon.properties === "object"
    ? (weapon.properties as { mastery?: string }).mastery?.trim()
    : null
  const direct = "mastery" in weapon ? weapon.mastery?.trim() : null
  return direct || fromProps || null
}

function weaponMatchesPool(weapon: SeedWeapon | Equipment, pool: WeaponMasteryPool): boolean {
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

function optionDescription(
  weapon: SeedWeapon | Equipment,
  masteryCatalogEntries?: ModifierCatalogEntry[] | null,
): string {
  const mastery = weaponMasteryProperty(weapon) ?? getWeaponMastery(weapon as Equipment)
  if (!mastery) return (weapon.subcategory ?? "") || ""
  const rules = describeWeaponMastery(mastery, masteryCatalogEntries)
  return rules ? `${mastery} — ${rules}` : mastery
}

function weaponMasteryOptionsFromList(
  weapons: Array<SeedWeapon | Equipment>,
  pool: WeaponMasteryPool,
  masteryCatalogEntries?: ModifierCatalogEntry[] | null,
): FeatureChoiceOption[] {
  return weapons
    .filter((item) => (item.category === "Weapon" || !item.category) && weaponMatchesPool(item, pool))
    .map((weapon) => ({
      name: weapon.name,
      description: optionDescription(weapon, masteryCatalogEntries),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function weaponMasteryOptionsForClass(
  className: string,
  equipmentCatalog: Equipment[] = [],
  masteryCatalogEntries?: ModifierCatalogEntry[] | null,
): FeatureChoiceOption[] {
  const pool = WEAPON_MASTERY_POOL_BY_CLASS[className] ?? "all"
  const seedWeapons = equipmentSeed as SeedWeapon[]
  const fromSeed = weaponMasteryOptionsFromList(seedWeapons, pool, masteryCatalogEntries)
  if (!equipmentCatalog.length) return fromSeed

  const fromCatalog = weaponMasteryOptionsFromList(equipmentCatalog, pool, masteryCatalogEntries)
  const byName = new Map<string, FeatureChoiceOption>()
  for (const option of [...fromSeed, ...fromCatalog]) {
    if (!byName.has(option.name)) byName.set(option.name, option)
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))
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

export function buildWeaponMasteryFeatureChoice(
  feature: Feature,
  className: string,
  masteryCatalogEntries?: ModifierCatalogEntry[] | null,
): FeatureChoice {
  const fromDescription = parseWeaponMasteryCountFromDescription(feature.description ?? "")
  const fallbackCount =
    className === "Fighter" ? 3 : className === "Barbarian" ? 2 : 2

  return {
    category: "Weapon Mastery",
    count: fromDescription ?? fallbackCount,
    swappableOnRest: true,
    choiceCountByLevel: weaponMasteryChoiceCountByLevel(className),
    options: weaponMasteryOptionsForClass(className, [], masteryCatalogEntries),
  }
}

function isLegacyWeaponMasteryPicker(char: unknown): boolean {
  if (!char || typeof char !== "object") return false
  const legacy = char as { type?: string; resourceKey?: string | null }
  return legacy.type === "feature_option_picker" && legacy.resourceKey === "weapon_mastery"
}

/** True when the builder should render WeaponMasteryChoices instead of generic MultiSelect. */
export function isWeaponMasteryFeature(feature: Feature): boolean {
  const name = feature.name?.trim() ?? ""
  if (/^weapon mastery$/i.test(name)) return true
  return feature.choices?.category === "Weapon Mastery"
}

export function enrichImportedWeaponMasteryFromColumn(
  features: Feature[],
  className: string,
  valuesByLevel: { level: number; count: number }[],
): Feature[] {
  if (!valuesByLevel.length) return features
  const table = [...valuesByLevel].sort((a, b) => a.level - b.level)
  return features.map((feature) => {
    if (!/^weapon mastery$/i.test(feature.name?.trim() ?? "")) return feature
    return enrichWeaponMasteryFeature(
      {
        ...feature,
        choices: {
          ...(feature.choices ?? {
            category: "Weapon Mastery",
            count: table[0]?.count ?? 2,
            options: [],
          }),
          choiceCountByLevel: table,
        },
      },
      className,
    )
  })
}

/** Convert Weapon Mastery from legacy picker linked modifiers into a real FeatureChoice. */
export function enrichWeaponMasteryFeature(
  feature: Feature,
  className: string,
  masteryCatalogEntries?: ModifierCatalogEntry[] | null,
): Feature {
  if (!/^weapon mastery$/i.test(feature.name?.trim() ?? "")) return feature

  const incoming = feature.choices
  const built = buildWeaponMasteryFeatureChoice(feature, className, masteryCatalogEntries)
  const choices: FeatureChoice = {
    ...built,
    category: incoming?.category?.trim() ? incoming.category : built.category,
    count: incoming?.count && incoming.count > 0 ? incoming.count : built.count,
    swappableOnRest: incoming?.swappableOnRest ?? built.swappableOnRest,
    choiceCountByLevel: incoming?.choiceCountByLevel?.length
      ? incoming.choiceCountByLevel
      : built.choiceCountByLevel,
    resourceKey: incoming?.resourceKey ?? built.resourceKey,
    options: incoming?.options?.length ? incoming.options : built.options,
  }

  const linkedModifiers = (feature.linkedModifiers ?? []).filter((instance) => {
    if (WEAPON_MASTERY_PICKER_CATALOG_IDS.has(instance.catalogRefId)) return false
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
