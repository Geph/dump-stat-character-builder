import type { UsesConfig } from "@/lib/types"

export const ABILITY_SCORE_KEYS = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const

export type AbilityScoreKey = (typeof ABILITY_SCORE_KEYS)[number]

export const ABILITY_MODIFIER_KEYS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const
export type AbilityModifierKey = (typeof ABILITY_MODIFIER_KEYS)[number]

export const SKILL_NAMES = [
  "Acrobatics",
  "Animal Handling",
  "Arcana",
  "Athletics",
  "Deception",
  "History",
  "Insight",
  "Intimidation",
  "Investigation",
  "Medicine",
  "Nature",
  "Perception",
  "Performance",
  "Persuasion",
  "Religion",
  "Sleight of Hand",
  "Stealth",
  "Survival",
] as const

export const SAVING_THROW_NAMES = [
  "Strength",
  "Dexterity",
  "Constitution",
  "Intelligence",
  "Wisdom",
  "Charisma",
] as const

export const DAMAGE_TYPES = [
  "Acid",
  "Bludgeoning",
  "Cold",
  "Fire",
  "Force",
  "Lightning",
  "Necrotic",
  "Piercing",
  "Poison",
  "Psychic",
  "Radiant",
  "Slashing",
  "Thunder",
] as const

export const VISION_TYPES = [
  { value: "darkvision", label: "Darkvision" },
  { value: "blindsight", label: "Blindsight" },
  { value: "tremorsense", label: "Tremorsense" },
  { value: "truesight", label: "Truesight" },
  { value: "custom", label: "Custom" },
] as const

export const SPEED_TYPES = [
  { value: "walk", label: "Walking" },
  { value: "fly", label: "Flying" },
  { value: "swim", label: "Swimming" },
  { value: "climb", label: "Climbing" },
  { value: "burrow", label: "Burrowing" },
  { value: "custom", label: "Custom" },
] as const

export const CHARACTERISTIC_MODIFIER_TYPE_OPTIONS = [
  { value: "ability_scores", label: "Ability Scores" },
  { value: "skills", label: "Skills" },
  { value: "languages", label: "Languages" },
  { value: "armor_proficiencies", label: "Armor Proficiencies" },
  { value: "weapon_proficiencies", label: "Weapon Proficiencies" },
  { value: "tool_proficiencies", label: "Tool Proficiencies" },
  { value: "saving_throws", label: "Saving Throw Proficiencies" },
  { value: "ac", label: "Armor Class (AC)" },
  { value: "initiative", label: "Initiative" },
  { value: "vision", label: "Vision" },
  { value: "speed", label: "Speed" },
  { value: "damage_resistance", label: "Damage Resistances" },
  { value: "damage_immunity", label: "Damage Immunities" },
  { value: "spells", label: "Spells per Level" },
  { value: "uses", label: "Uses (Limited Ability)" },
] as const

export type CharacteristicModifierType =
  (typeof CHARACTERISTIC_MODIFIER_TYPE_OPTIONS)[number]["value"]

export type ListCharacteristicType =
  | "skills"
  | "languages"
  | "armor_proficiencies"
  | "weapon_proficiencies"
  | "tool_proficiencies"
  | "saving_throws"

export interface CharacteristicModifierBase {
  id: string
  label?: string
}

export interface AbilityScoresCharacteristic extends CharacteristicModifierBase {
  type: "ability_scores"
  bonuses: Partial<Record<AbilityScoreKey, number>>
}

export interface ListCharacteristic extends CharacteristicModifierBase {
  type: ListCharacteristicType
  values: string[]
}

export type AcCharacteristicMode =
  | "flat_bonus"
  | "set_fixed"
  | "ability_modifiers"
  | "add_proficiency"

export interface AcCharacteristic extends CharacteristicModifierBase {
  type: "ac"
  mode: AcCharacteristicMode
  flatBonus?: number
  fixedAc?: number
  /** Up to two ability modifiers (e.g. DEX + CON for unarmored defense) */
  abilities?: AbilityModifierKey[]
  /** Base AC when using ability_modifiers mode (default 10) */
  base?: number
  includeProficiency?: boolean
}

export type InitiativeCharacteristicMode =
  | "flat_bonus"
  | "add_proficiency"
  | "ability_modifier"

export interface InitiativeCharacteristic extends CharacteristicModifierBase {
  type: "initiative"
  mode: InitiativeCharacteristicMode
  flatBonus?: number
  ability?: AbilityModifierKey
  bonus?: number
}

export interface VisionCharacteristic extends CharacteristicModifierBase {
  type: "vision"
  visionType: (typeof VISION_TYPES)[number]["value"]
  rangeFeet: number
  customType?: string
}

export interface SpeedCharacteristic extends CharacteristicModifierBase {
  type: "speed"
  speedType: (typeof SPEED_TYPES)[number]["value"]
  mode: "set" | "add"
  value: number
  customType?: string
}

export interface DamageCharacteristic extends CharacteristicModifierBase {
  type: "damage_resistance" | "damage_immunity"
  damageTypes: string[]
}

export interface SpellGrantCharacteristic extends CharacteristicModifierBase {
  type: "spells"
  grants: { level: number; count: number; spellIds?: string[] }[]
}

export interface UsesCharacteristic extends CharacteristicModifierBase {
  type: "uses"
  uses: UsesConfig
}

export type CharacteristicModifier =
  | AbilityScoresCharacteristic
  | ListCharacteristic
  | AcCharacteristic
  | InitiativeCharacteristic
  | VisionCharacteristic
  | SpeedCharacteristic
  | DamageCharacteristic
  | SpellGrantCharacteristic
  | UsesCharacteristic

export function createModifierId(): string {
  return `mod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function createCharacteristicModifier(
  type: CharacteristicModifierType,
): CharacteristicModifier {
  const id = createModifierId()
  switch (type) {
    case "ability_scores":
      return { id, type, bonuses: {} }
    case "skills":
    case "languages":
    case "armor_proficiencies":
    case "weapon_proficiencies":
    case "tool_proficiencies":
    case "saving_throws":
      return { id, type, values: [] }
    case "ac":
      return { id, type, mode: "flat_bonus", flatBonus: 1 }
    case "initiative":
      return { id, type, mode: "flat_bonus", flatBonus: 1 }
    case "vision":
      return { id, type, visionType: "darkvision", rangeFeet: 60 }
    case "speed":
      return { id, type, speedType: "walk", mode: "add", value: 5 }
    case "damage_resistance":
    case "damage_immunity":
      return { id, type, damageTypes: [] }
    case "spells":
      return { id, type, grants: [{ level: 0, count: 1 }] }
    case "uses":
      return { id, type, uses: { type: "unlimited" } }
  }
}

export function normalizeCharacteristics(
  raw: unknown,
  legacyUses: UsesConfig | null | undefined,
): CharacteristicModifier[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.filter(isCharacteristicModifier)
  }

  if (legacyUses) {
    return [{ id: createModifierId(), type: "uses", uses: legacyUses }]
  }

  return []
}

function isCharacteristicModifier(value: unknown): value is CharacteristicModifier {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    "id" in value &&
    typeof (value as CharacteristicModifier).type === "string"
  )
}

export function extractUsesConfig(mods: CharacteristicModifier[]): UsesConfig | null {
  const usesMod = mods.find((mod): mod is UsesCharacteristic => mod.type === "uses")
  return usesMod?.uses ?? null
}

export function resolveUsesConfig(
  characteristics: CharacteristicModifier[] | null | undefined,
  legacyUses: UsesConfig | null | undefined,
): UsesConfig | null {
  return extractUsesConfig(normalizeCharacteristics(characteristics, legacyUses))
}

export type AggregatedCharacteristics = {
  abilityBonuses: Partial<Record<AbilityScoreKey, number>>
  skills: string[]
  languages: string[]
  armorProficiencies: string[]
  weaponProficiencies: string[]
  toolProficiencies: string[]
  savingThrows: string[]
  acFlatBonus: number
  acFixed: number | null
  acAbilityMods: AbilityModifierKey[]
  acBase: number
  acIncludeProficiency: boolean
  initiativeFlatBonus: number
  initiativeIncludeProficiency: boolean
  initiativeAbility: AbilityModifierKey | null
  initiativeAbilityBonus: number
  vision: { type: string; rangeFeet: number }[]
  speed: Record<string, number>
  resistances: string[]
  immunities: string[]
  spellsByLevel: { level: number; count: number }[]
}

const emptyAggregated = (): AggregatedCharacteristics => ({
  abilityBonuses: {},
  skills: [],
  languages: [],
  armorProficiencies: [],
  weaponProficiencies: [],
  toolProficiencies: [],
  savingThrows: [],
  acFlatBonus: 0,
  acFixed: null,
  acAbilityMods: [],
  acBase: 10,
  acIncludeProficiency: false,
  initiativeFlatBonus: 0,
  initiativeIncludeProficiency: false,
  initiativeAbility: null,
  initiativeAbilityBonus: 0,
  vision: [],
  speed: {},
  resistances: [],
  immunities: [],
  spellsByLevel: [],
})

function pushUnique(list: string[], values: string[]) {
  for (const value of values) {
    if (value && !list.includes(value)) list.push(value)
  }
}

export function aggregateCharacteristics(
  mods: CharacteristicModifier[],
): AggregatedCharacteristics {
  const result = emptyAggregated()

  for (const mod of mods) {
    switch (mod.type) {
      case "ability_scores":
        for (const [key, bonus] of Object.entries(mod.bonuses)) {
          const ability = key as AbilityScoreKey
          result.abilityBonuses[ability] = (result.abilityBonuses[ability] ?? 0) + (bonus ?? 0)
        }
        break
      case "skills":
      case "languages":
      case "armor_proficiencies":
      case "weapon_proficiencies":
      case "tool_proficiencies":
        pushUnique(
          mod.type === "skills"
            ? result.skills
            : mod.type === "languages"
              ? result.languages
              : mod.type === "armor_proficiencies"
                ? result.armorProficiencies
                : mod.type === "weapon_proficiencies"
                  ? result.weaponProficiencies
                  : result.toolProficiencies,
          mod.values,
        )
        break
      case "saving_throws":
        pushUnique(result.savingThrows, mod.values)
        break
      case "ac":
        if (mod.mode === "flat_bonus") {
          result.acFlatBonus += mod.flatBonus ?? 0
        } else if (mod.mode === "set_fixed") {
          result.acFixed = Math.max(result.acFixed ?? 0, mod.fixedAc ?? 0)
        } else if (mod.mode === "ability_modifiers") {
          result.acBase = mod.base ?? 10
          result.acAbilityMods = (mod.abilities ?? []).slice(0, 2)
        } else if (mod.mode === "add_proficiency") {
          result.acIncludeProficiency = true
        }
        break
      case "initiative":
        if (mod.mode === "flat_bonus") {
          result.initiativeFlatBonus += mod.flatBonus ?? 0
        } else if (mod.mode === "add_proficiency") {
          result.initiativeIncludeProficiency = true
        } else if (mod.mode === "ability_modifier") {
          result.initiativeAbility = mod.ability ?? "DEX"
          result.initiativeAbilityBonus = mod.bonus ?? 0
        }
        break
      case "vision":
        result.vision.push({
          type: mod.visionType === "custom" ? mod.customType || "Custom" : mod.visionType,
          rangeFeet: mod.rangeFeet,
        })
        break
      case "speed": {
        const key =
          mod.speedType === "custom" ? mod.customType?.toLowerCase() || "custom" : mod.speedType
        const current = result.speed[key] ?? 0
        result.speed[key] = mod.mode === "set" ? mod.value : current + mod.value
        break
      }
      case "damage_resistance":
        pushUnique(result.resistances, mod.damageTypes)
        break
      case "damage_immunity":
        pushUnique(result.immunities, mod.damageTypes)
        break
      case "spells":
        for (const grant of mod.grants) {
          const existing = result.spellsByLevel.find((entry) => entry.level === grant.level)
          if (existing) {
            existing.count += grant.count
          } else {
            result.spellsByLevel.push({ level: grant.level, count: grant.count })
          }
        }
        break
      case "uses":
        break
    }
  }

  return result
}

export function abilityModifierKeyToScoreKey(key: AbilityModifierKey): AbilityScoreKey {
  const map: Record<AbilityModifierKey, AbilityScoreKey> = {
    STR: "strength",
    DEX: "dexterity",
    CON: "constitution",
    INT: "intelligence",
    WIS: "wisdom",
    CHA: "charisma",
  }
  return map[key]
}

export function applyAcCharacteristics(
  baseAc: number,
  aggregated: AggregatedCharacteristics,
  abilityMods: Record<AbilityScoreKey, number>,
  proficiencyBonus: number,
): number {
  if (aggregated.acFixed != null && aggregated.acFixed > 0) {
    let ac = aggregated.acFixed
    if (aggregated.acIncludeProficiency) ac += proficiencyBonus
    return ac + aggregated.acFlatBonus
  }

  if (aggregated.acAbilityMods.length > 0) {
    let ac = aggregated.acBase
    for (const key of aggregated.acAbilityMods) {
      ac += abilityMods[abilityModifierKeyToScoreKey(key)]
    }
    if (aggregated.acIncludeProficiency) ac += proficiencyBonus
    return ac + aggregated.acFlatBonus
  }

  let ac = baseAc + aggregated.acFlatBonus
  if (aggregated.acIncludeProficiency) ac += proficiencyBonus
  return ac
}

export function computeInitiative(
  dexMod: number,
  aggregated: AggregatedCharacteristics,
  abilityMods: Record<AbilityScoreKey, number>,
  proficiencyBonus: number,
): number {
  let init = dexMod
  if (aggregated.initiativeAbility) {
    init =
      abilityMods[abilityModifierKeyToScoreKey(aggregated.initiativeAbility)] +
      aggregated.initiativeAbilityBonus
  }
  init += aggregated.initiativeFlatBonus
  if (aggregated.initiativeIncludeProficiency) init += proficiencyBonus
  return init
}
