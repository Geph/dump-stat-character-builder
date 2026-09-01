import equipmentSeed from "@/lib/srd/seed-data/equipment.json"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import { describeWeaponMastery } from "@/lib/compendium/weapon-mastery"
import { WEAPON_MASTERY_CATALOG_ID } from "@/lib/compendium/weapon-mastery-catalog"
import { getWeaponMastery, isWeaponProficient } from "@/lib/compendium/combat-stats"
import type { Equipment } from "@/lib/types"
import type { Feature, FeatureChoice } from "@/lib/types"

type FeatureChoiceOption = FeatureChoice["options"][number]

const FEATURE_OPTION_PICKER_CATALOG_ID = "cat_char_feature_option_picker"
const WEAPON_MASTERY_PICKER_CATALOG_IDS = new Set([
  FEATURE_OPTION_PICKER_CATALOG_ID,
  WEAPON_MASTERY_CATALOG_ID,
])

export type WeaponMasteryPool = "melee" | "all" | "rogue"

/** Classes whose Weapon Mastery column scales (Barbarian-like: 2 → 3 → 4). */
const BARBARIAN_LIKE_WEAPON_MASTERY: { level: number; count: number }[] = [
  { level: 1, count: 2 },
  { level: 4, count: 3 },
  { level: 10, count: 4 },
]

const WEAPON_MASTERY_COUNT_BY_CLASS: Record<string, { level: number; count: number }[]> = {
  Barbarian: BARBARIAN_LIKE_WEAPON_MASTERY,
  Fighter: [
    { level: 1, count: 3 },
    { level: 4, count: 4 },
    { level: 10, count: 5 },
    { level: 16, count: 6 },
  ],
  // Mage Hand Press — Weapon Mastery column on the class table
  Craftsman: BARBARIAN_LIKE_WEAPON_MASTERY,
  Gunslinger: BARBARIAN_LIKE_WEAPON_MASTERY,
  Vagabond: BARBARIAN_LIKE_WEAPON_MASTERY,
  Warden: BARBARIAN_LIKE_WEAPON_MASTERY,
  "Warden (Mage Hand Press)": BARBARIAN_LIKE_WEAPON_MASTERY,
}

/** Fixed two masteries for the whole career (no Weapon Mastery column / no scaling prose). */
const FIXED_TWO_WEAPON_MASTERY_CLASSES = new Set([
  "Paladin",
  "Ranger",
  "Rogue",
  "Captain",
  "Investigator",
  "Martyr",
  "Dancer",
])

const FIXED_WEAPON_MASTERY_COUNT = [{ level: 1, count: 2 }]

/** Safe default for unknown classes: stay at description count (usually two), never Fighter's ladder. */
export const DEFAULT_WEAPON_MASTERY_CHOICE_COUNT_BY_LEVEL: { level: number; count: number }[] =
  FIXED_WEAPON_MASTERY_COUNT

function classNameBase(name: string): string {
  return name.replace(/\s*\(.*\)\s*$/, "").trim() || name
}

export function weaponMasteryChoiceCountByLevel(className: string): { level: number; count: number }[] {
  const trimmed = className.trim()
  const base = classNameBase(trimmed)
  if (WEAPON_MASTERY_COUNT_BY_CLASS[trimmed]) return WEAPON_MASTERY_COUNT_BY_CLASS[trimmed]
  if (WEAPON_MASTERY_COUNT_BY_CLASS[base]) return WEAPON_MASTERY_COUNT_BY_CLASS[base]
  if (FIXED_TWO_WEAPON_MASTERY_CLASSES.has(trimmed) || FIXED_TWO_WEAPON_MASTERY_CLASSES.has(base)) {
    return FIXED_WEAPON_MASTERY_COUNT
  }
  return DEFAULT_WEAPON_MASTERY_CHOICE_COUNT_BY_LEVEL
}

function hasCuratedWeaponMasteryTable(className: string): boolean {
  const trimmed = className.trim()
  const base = classNameBase(trimmed)
  return (
    trimmed in WEAPON_MASTERY_COUNT_BY_CLASS ||
    base in WEAPON_MASTERY_COUNT_BY_CLASS ||
    FIXED_TWO_WEAPON_MASTERY_CLASSES.has(trimmed) ||
    FIXED_TWO_WEAPON_MASTERY_CLASSES.has(base)
  )
}

/** True when a stamped ladder matches the old mistaken Fighter fallback. */
function looksLikeFighterWeaponMasteryLadder(
  table: { level: number; count: number }[] | null | undefined,
): boolean {
  if (!table?.length) return false
  const fighter = WEAPON_MASTERY_COUNT_BY_CLASS.Fighter
  if (table.length !== fighter.length) return false
  return table.every((row, i) => row.level === fighter[i]?.level && row.count === fighter[i]?.count)
}

/**
 * Ladder used for builder/sheet counts. Prefer curated class tables; ignore a mistaken
 * Fighter fallback left on fixed-2 classes from older imports.
 */
export function effectiveWeaponMasteryChoiceCountByLevel(
  className: string,
  incoming?: { level: number; count: number }[] | null,
): { level: number; count: number }[] {
  const curated = weaponMasteryChoiceCountByLevel(className)
  if (hasCuratedWeaponMasteryTable(className)) return curated
  if (!incoming?.length || looksLikeFighterWeaponMasteryLadder(incoming)) return curated
  return incoming
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
    const props = (Array.isArray(weapon.properties) ? weapon.properties : weapon.properties?.properties ?? []).join(" ").toLowerCase()
    if (sub.includes("simple")) return true
    return sub.includes("martial") && (props.includes("light") || props.includes("finesse"))
  }
  return true
}

/**
 * Mastery picks are limited to weapons the class is proficient with (SRD 5.2.1 Weapon
 * Mastery: "…weapons of your choice with which you have proficiency"). Honors property
 * qualifiers such as Rogue / Dancer "Martial weapons that have the Finesse or Light property".
 */
function weaponAllowedByProficiencies(
  weapon: SeedWeapon | Equipment,
  proficiencies: string[] | null | undefined,
): boolean {
  if (!proficiencies?.length) return true
  return isWeaponProficient(weapon as Equipment, proficiencies)
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

/** Head of a stored option description (`Sap — If you hit…`). */
export function masteryNameFromOptionDescription(description?: string | null): string | null {
  if (!description?.trim()) return null
  const [head] = description.split("—")
  const trimmed = head.trim()
  if (!trimmed || trimmed.includes(".") || trimmed.length > 40) return null
  return trimmed
}

export function formatWeaponMasteryChoiceLabel(
  weaponName: string,
  mastery?: string | null,
): string {
  const trimmed = mastery?.trim()
  return trimmed ? `${weaponName} (${trimmed})` : weaponName
}

/** Dropdown / chip label: `Longsword (Sap)`. Falls back to seed or catalog mastery. */
export function weaponMasteryLabelForOption(
  option: Pick<FeatureChoiceOption, "name" | "description">,
  equipmentCatalog: Equipment[] = [],
): string {
  const fromDescription = masteryNameFromOptionDescription(option.description)
  if (fromDescription) return formatWeaponMasteryChoiceLabel(option.name, fromDescription)
  const weapon = weaponByNameLookup(equipmentCatalog).get(option.name.trim().toLowerCase())
  const mastery = weapon
    ? weaponMasteryProperty(weapon) ?? getWeaponMastery(weapon as Equipment)
    : null
  return formatWeaponMasteryChoiceLabel(option.name, mastery)
}

function weaponMasteryOptionsFromList(
  weapons: Array<SeedWeapon | Equipment>,
  pool: WeaponMasteryPool,
  masteryCatalogEntries?: ModifierCatalogEntry[] | null,
  proficiencies?: string[] | null,
): FeatureChoiceOption[] {
  return weapons
    .filter(
      (item) =>
        (item.category === "Weapon" || !item.category) &&
        weaponMatchesPool(item, pool) &&
        weaponAllowedByProficiencies(item, proficiencies),
    )
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
  weaponProficiencies?: string[] | null,
): FeatureChoiceOption[] {
  const pool = WEAPON_MASTERY_POOL_BY_CLASS[className] ?? "all"
  const seedWeapons = equipmentSeed as SeedWeapon[]
  const fromSeed = weaponMasteryOptionsFromList(
    seedWeapons,
    pool,
    masteryCatalogEntries,
    weaponProficiencies,
  )
  if (!equipmentCatalog.length) return fromSeed

  const fromCatalog = weaponMasteryOptionsFromList(
    equipmentCatalog,
    pool,
    masteryCatalogEntries,
    weaponProficiencies,
  )
  const byName = new Map<string, FeatureChoiceOption>()
  for (const option of [...fromSeed, ...fromCatalog]) {
    if (!byName.has(option.name)) byName.set(option.name, option)
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))
}

function weaponByNameLookup(equipmentCatalog: Equipment[]): Map<string, SeedWeapon | Equipment> {
  const byName = new Map<string, SeedWeapon | Equipment>()
  for (const weapon of equipmentSeed as SeedWeapon[]) {
    byName.set(weapon.name.trim().toLowerCase(), weapon)
  }
  for (const weapon of equipmentCatalog) {
    if (weapon.category && weapon.category !== "Weapon") continue
    byName.set(weapon.name.trim().toLowerCase(), weapon)
  }
  return byName
}

/**
 * Drop stored mastery options the class is not proficient with. Unknown (homebrew) weapon
 * names are kept — proficiency can only be judged for weapons present in the catalog.
 */
export function filterWeaponMasteryOptionsByProficiency(
  options: FeatureChoiceOption[],
  weaponProficiencies: string[] | null | undefined,
  equipmentCatalog: Equipment[] = [],
): FeatureChoiceOption[] {
  if (!weaponProficiencies?.length || !options.length) return options
  const byName = weaponByNameLookup(equipmentCatalog)
  return options.filter((option) => {
    const weapon = byName.get(option.name.trim().toLowerCase())
    if (!weapon) return true
    return weaponAllowedByProficiencies(weapon, weaponProficiencies)
  })
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
  weaponProficiencies?: string[] | null,
): FeatureChoice {
  const fromDescription = parseWeaponMasteryCountFromDescription(feature.description ?? "")
  const fallbackCount =
    className === "Fighter" ? 3 : className === "Barbarian" ? 2 : 2

  return {
    category: "Weapon Mastery",
    count: fromDescription ?? fallbackCount,
    swappableOnRest: true,
    choiceCountByLevel: weaponMasteryChoiceCountByLevel(className),
    options: weaponMasteryOptionsForClass(className, [], masteryCatalogEntries, weaponProficiencies),
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

/**
 * Re-scope a class row's stored Weapon Mastery options to its weapon proficiencies.
 * Runs at load time so existing rows (SRD seed and imported homebrew alike) stop
 * offering weapons the class can't use — e.g. Dancer, whose Martial proficiency is
 * limited to Finesse or Light weapons.
 */
export function applyWeaponMasteryProficiencies<
  T extends { name?: unknown; weapon_proficiencies?: unknown; features?: unknown },
>(row: T): T {
  const proficiencies = Array.isArray(row.weapon_proficiencies)
    ? (row.weapon_proficiencies as string[]).filter(
        (entry): entry is string => typeof entry === "string" && Boolean(entry.trim()),
      )
    : []
  if (!proficiencies.length || !Array.isArray(row.features)) return row

  let changed = false
  const features = (row.features as Feature[]).map((feature) => {
    if (!isWeaponMasteryFeature(feature) || !feature.choices?.options?.length) return feature
    const options = filterWeaponMasteryOptionsByProficiency(feature.choices.options, proficiencies)
    if (options.length === feature.choices.options.length) return feature
    changed = true
    return { ...feature, choices: { ...feature.choices, options } }
  })

  if (!changed) return row
  return { ...row, features } as T
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
  weaponProficiencies?: string[] | null,
): Feature {
  if (!/^weapon mastery$/i.test(feature.name?.trim() ?? "")) return feature

  const incoming = feature.choices
  const built = buildWeaponMasteryFeatureChoice(
    feature,
    className,
    masteryCatalogEntries,
    weaponProficiencies,
  )
  const choices: FeatureChoice = {
    ...built,
    category: incoming?.category?.trim() ? incoming.category : built.category,
    count: incoming?.count && incoming.count > 0 ? incoming.count : built.count,
    swappableOnRest: incoming?.swappableOnRest ?? built.swappableOnRest,
    choiceCountByLevel: effectiveWeaponMasteryChoiceCountByLevel(
      className,
      incoming?.choiceCountByLevel,
    ),
    resourceKey: incoming?.resourceKey ?? built.resourceKey,
    options: incoming?.options?.length
      ? filterWeaponMasteryOptionsByProficiency(incoming.options, weaponProficiencies)
      : built.options,
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
