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

export const ATTACK_ROLL_TARGETS = [
  { value: "all", label: "All attack rolls" },
  { value: "melee", label: "Melee weapon attacks" },
  { value: "ranged", label: "Ranged weapon attacks" },
  { value: "unarmed", label: "Unarmed strikes" },
  { value: "simple_melee", label: "Simple melee weapons" },
  { value: "simple_ranged", label: "Simple ranged weapons" },
  { value: "martial_melee", label: "Martial melee weapons" },
  { value: "martial_ranged", label: "Martial ranged weapons" },
  { value: "one_handed_melee", label: "One-handed melee weapons (Dueling)" },
  { value: "custom", label: "Custom" },
] as const

export const DAMAGE_ROLL_TARGETS = [
  { value: "all", label: "All damage rolls" },
  { value: "melee", label: "Melee weapon damage" },
  { value: "ranged", label: "Ranged weapon damage" },
  { value: "unarmed", label: "Unarmed strike damage" },
  { value: "one_handed_melee", label: "One-handed melee weapons (Dueling)" },
  ...DAMAGE_TYPES.map((type) => ({ value: type.toLowerCase(), label: `${type} damage` })),
  { value: "custom", label: "Custom" },
] as const

export const UNARMED_STRIKE_DICE = ["1", "1d4", "1d6", "1d8"] as const
export type UnarmedStrikeDie = (typeof UNARMED_STRIKE_DICE)[number]

export const CHARACTERISTIC_MODIFIER_TYPE_OPTIONS = [
  { value: "ability_scores", label: "Ability Scores" },
  { value: "skills", label: "Skills (Proficiency / Expertise)" },
  { value: "languages", label: "Languages" },
  { value: "armor_proficiencies", label: "Armor Proficiencies" },
  { value: "weapon_proficiencies", label: "Weapon Proficiencies" },
  { value: "tool_proficiencies", label: "Tool Proficiencies" },
  { value: "saving_throws", label: "Saving Throw Proficiencies" },
  { value: "ac", label: "Armor Class (AC)" },
  { value: "hit_points", label: "Hit Point Maximum" },
  { value: "initiative", label: "Initiative" },
  { value: "vision", label: "Vision" },
  { value: "speed", label: "Speed" },
  { value: "attack_roll_modifiers", label: "Attack Roll Modifiers" },
  { value: "damage_roll_modifiers", label: "Damage Roll Modifiers" },
  { value: "unarmed_strike_damage", label: "Unarmed Strike Damage Die" },
  { value: "damage_resistance", label: "Damage Resistances" },
  { value: "damage_immunity", label: "Damage Immunities" },
  { value: "damage_reduction", label: "Damage Reduction" },
  { value: "spells", label: "Spells per Level (Spell Slots)" },
  { value: "spells_known", label: "Spells Known / Prepared" },
  { value: "spellcasting_ability", label: "Spellcasting Ability Modifier" },
  { value: "uses", label: "Uses (Limited Ability / Resource)" },
] as const

export type CharacteristicModifierType =
  (typeof CHARACTERISTIC_MODIFIER_TYPE_OPTIONS)[number]["value"]

export type ListCharacteristicType =
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

export interface SkillEntry {
  skill: string
  expertise: boolean
}

export interface SkillsCharacteristic extends CharacteristicModifierBase {
  type: "skills"
  entries: SkillEntry[]
  /** @deprecated legacy — migrated to entries on load */
  values?: string[]
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

export type HitPointsCharacteristicMode = "flat" | "per_level"

export interface HitPointsCharacteristic extends CharacteristicModifierBase {
  type: "hit_points"
  mode: HitPointsCharacteristicMode
  value: number
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

export interface RollModifierEntry {
  bonus: number
  target: string
  customTarget?: string
}

export interface AttackRollModifiersCharacteristic extends CharacteristicModifierBase {
  type: "attack_roll_modifiers"
  entries: RollModifierEntry[]
}

export interface DamageRollModifiersCharacteristic extends CharacteristicModifierBase {
  type: "damage_roll_modifiers"
  entries: RollModifierEntry[]
}

export interface UnarmedStrikeDamageCharacteristic extends CharacteristicModifierBase {
  type: "unarmed_strike_damage"
  die: UnarmedStrikeDie
}

export interface DamageCharacteristic extends CharacteristicModifierBase {
  type: "damage_resistance" | "damage_immunity"
  damageTypes: string[]
}

export interface DamageReductionCharacteristic extends CharacteristicModifierBase {
  type: "damage_reduction"
  amount: number
  /** Empty = all damage types (e.g. Heavy Armor Master uses B/P/S) */
  damageTypes?: string[]
}

export interface SpellSlotGrant {
  level: number
  count: number
  /** @deprecated — migrated to spells_known on aggregate */
  spellIds?: string[]
}

export interface SpellGrantCharacteristic extends CharacteristicModifierBase {
  type: "spells"
  grants: SpellSlotGrant[]
}

export interface SpellsKnownEntry {
  spellId: string
  prepared?: boolean
}

export interface SpellsKnownCharacteristic extends CharacteristicModifierBase {
  type: "spells_known"
  spells: SpellsKnownEntry[]
  castingAbility?: AbilityScoreKey
}

export interface SpellcastingAbilityCharacteristic extends CharacteristicModifierBase {
  type: "spellcasting_ability"
  ability: AbilityScoreKey
}

export interface UsesCharacteristic extends CharacteristicModifierBase {
  type: "uses"
  uses: UsesConfig
}

export type CharacteristicModifier =
  | AbilityScoresCharacteristic
  | SkillsCharacteristic
  | ListCharacteristic
  | AcCharacteristic
  | HitPointsCharacteristic
  | InitiativeCharacteristic
  | VisionCharacteristic
  | SpeedCharacteristic
  | AttackRollModifiersCharacteristic
  | DamageRollModifiersCharacteristic
  | UnarmedStrikeDamageCharacteristic
  | DamageCharacteristic
  | DamageReductionCharacteristic
  | SpellGrantCharacteristic
  | SpellsKnownCharacteristic
  | SpellcastingAbilityCharacteristic
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
      return { id, type, entries: [] }
    case "languages":
    case "armor_proficiencies":
    case "weapon_proficiencies":
    case "tool_proficiencies":
    case "saving_throws":
      return { id, type, values: [] }
    case "ac":
      return { id, type, mode: "flat_bonus", flatBonus: 1 }
    case "hit_points":
      return { id, type, mode: "flat", value: 2 }
    case "initiative":
      return { id, type, mode: "flat_bonus", flatBonus: 1 }
    case "vision":
      return { id, type, visionType: "darkvision", rangeFeet: 60 }
    case "speed":
      return { id, type, speedType: "walk", mode: "add", value: 5 }
    case "attack_roll_modifiers":
      return { id, type, entries: [{ bonus: 2, target: "ranged" }] }
    case "damage_roll_modifiers":
      return { id, type, entries: [{ bonus: 2, target: "one_handed_melee" }] }
    case "unarmed_strike_damage":
      return { id, type, die: "1d6" }
    case "damage_resistance":
    case "damage_immunity":
      return { id, type, damageTypes: [] }
    case "damage_reduction":
      return { id, type, amount: 3, damageTypes: ["Bludgeoning", "Piercing", "Slashing"] }
    case "spells":
      return { id, type, grants: [{ level: 1, count: 1 }] }
    case "spells_known":
      return { id, type, spells: [] }
    case "spellcasting_ability":
      return { id, type, ability: "intelligence" }
    case "uses":
      return { id, type, uses: { type: "unlimited" } }
  }
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

function migrateCharacteristicModifier(value: unknown): CharacteristicModifier | null {
  if (!isCharacteristicModifier(value)) return null

  if (value.type === "skills") {
    const legacy = value as SkillsCharacteristic
    if (!legacy.entries?.length && legacy.values?.length) {
      return {
        id: legacy.id,
        label: legacy.label,
        type: "skills",
        entries: legacy.values.map((skill) => ({ skill, expertise: false })),
      }
    }
    return { ...legacy, entries: legacy.entries ?? [] }
  }

  return value
}

export function normalizeCharacteristics(
  raw: unknown,
  legacyUses: UsesConfig | null | undefined,
): CharacteristicModifier[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw
      .map(migrateCharacteristicModifier)
      .filter((mod): mod is CharacteristicModifier => mod !== null)
  }

  if (legacyUses) {
    return [{ id: createModifierId(), type: "uses", uses: legacyUses }]
  }

  return []
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

export function getSkillEntries(mod: SkillsCharacteristic): SkillEntry[] {
  if (mod.entries?.length) return mod.entries
  if (mod.values?.length) {
    return mod.values.map((skill) => ({ skill, expertise: false }))
  }
  return []
}

export type AggregatedRollModifier = { bonus: number; target: string; customTarget?: string }

export type AggregatedSpellsKnown = {
  spellIds: string[]
  prepared: boolean
  castingAbility?: AbilityScoreKey
}

export type AggregatedCharacteristics = {
  abilityBonuses: Partial<Record<AbilityScoreKey, number>>
  skills: string[]
  skillExpertise: string[]
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
  hpFlatBonus: number
  hpPerLevel: number
  initiativeFlatBonus: number
  initiativeIncludeProficiency: boolean
  initiativeAbility: AbilityModifierKey | null
  initiativeAbilityBonus: number
  vision: { type: string; rangeFeet: number }[]
  speed: Record<string, number>
  attackRollModifiers: AggregatedRollModifier[]
  damageRollModifiers: AggregatedRollModifier[]
  unarmedStrikeDie: UnarmedStrikeDie | null
  resistances: string[]
  immunities: string[]
  damageReduction: { amount: number; damageTypes: string[] }[]
  spellsByLevel: { level: number; count: number }[]
  spellsKnown: AggregatedSpellsKnown[]
  spellcastingAbility: AbilityScoreKey | null
}

const UNARMED_DIE_RANK: Record<UnarmedStrikeDie, number> = {
  "1": 0,
  "1d4": 1,
  "1d6": 2,
  "1d8": 3,
}

const emptyAggregated = (): AggregatedCharacteristics => ({
  abilityBonuses: {},
  skills: [],
  skillExpertise: [],
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
  hpFlatBonus: 0,
  hpPerLevel: 0,
  initiativeFlatBonus: 0,
  initiativeIncludeProficiency: false,
  initiativeAbility: null,
  initiativeAbilityBonus: 0,
  vision: [],
  speed: {},
  attackRollModifiers: [],
  damageRollModifiers: [],
  unarmedStrikeDie: null,
  resistances: [],
  immunities: [],
  damageReduction: [],
  spellsByLevel: [],
  spellsKnown: [],
  spellcastingAbility: null,
})

function pushUnique(list: string[], values: string[]) {
  for (const value of values) {
    if (value && !list.includes(value)) list.push(value)
  }
}

function pickHigherUnarmedDie(
  current: UnarmedStrikeDie | null,
  next: UnarmedStrikeDie,
): UnarmedStrikeDie {
  if (!current) return next
  return UNARMED_DIE_RANK[next] > UNARMED_DIE_RANK[current] ? next : current
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
        for (const entry of getSkillEntries(mod)) {
          pushUnique(result.skills, [entry.skill])
          if (entry.expertise) pushUnique(result.skillExpertise, [entry.skill])
        }
        break
      case "languages":
      case "armor_proficiencies":
      case "weapon_proficiencies":
      case "tool_proficiencies":
        pushUnique(
          mod.type === "languages"
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
      case "hit_points":
        if (mod.mode === "flat") {
          result.hpFlatBonus += mod.value
        } else {
          result.hpPerLevel += mod.value
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
      case "attack_roll_modifiers":
        result.attackRollModifiers.push(...mod.entries)
        break
      case "damage_roll_modifiers":
        result.damageRollModifiers.push(...mod.entries)
        break
      case "unarmed_strike_damage":
        result.unarmedStrikeDie = pickHigherUnarmedDie(result.unarmedStrikeDie, mod.die)
        break
      case "damage_resistance":
        pushUnique(result.resistances, mod.damageTypes)
        break
      case "damage_immunity":
        pushUnique(result.immunities, mod.damageTypes)
        break
      case "damage_reduction":
        result.damageReduction.push({
          amount: mod.amount,
          damageTypes: mod.damageTypes ?? [],
        })
        break
      case "spells":
        for (const grant of mod.grants) {
          const existing = result.spellsByLevel.find((entry) => entry.level === grant.level)
          if (existing) {
            existing.count += grant.count
          } else {
            result.spellsByLevel.push({ level: grant.level, count: grant.count })
          }
          if (grant.spellIds?.length) {
            result.spellsKnown.push({
              spellIds: grant.spellIds,
              prepared: true,
            })
          }
        }
        break
      case "spells_known":
        if (mod.spells.length) {
          result.spellsKnown.push({
            spellIds: mod.spells.map((entry) => entry.spellId).filter(Boolean),
            prepared: mod.spells.some((entry) => entry.prepared !== false),
            castingAbility: mod.castingAbility,
          })
        }
        if (mod.castingAbility) {
          result.spellcastingAbility = mod.castingAbility
        }
        break
      case "spellcasting_ability":
        result.spellcastingAbility = mod.ability
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

export function applyHpCharacteristics(
  baseHp: number,
  aggregated: AggregatedCharacteristics,
  totalLevel: number,
): number {
  return Math.max(
    baseHp + aggregated.hpFlatBonus + aggregated.hpPerLevel * totalLevel,
    1,
  )
}

function resolveRollModifierTarget(entry: AggregatedRollModifier): string {
  return entry.target === "custom" ? (entry.customTarget?.toLowerCase() ?? "") : entry.target
}

function weaponMatchesAttackTarget(
  subcategory: string,
  properties: string[],
  target: string,
): boolean {
  if (!target || target === "all") return true
  const sub = subcategory.toLowerCase()
  const props = properties.join(" ").toLowerCase()

  switch (target) {
    case "melee":
      return sub.includes("melee")
    case "ranged":
      return sub.includes("ranged")
    case "simple_melee":
      return sub.includes("simple") && sub.includes("melee")
    case "simple_ranged":
      return sub.includes("simple") && sub.includes("ranged")
    case "martial_melee":
      return sub.includes("martial") && sub.includes("melee")
    case "martial_ranged":
      return sub.includes("martial") && sub.includes("ranged")
    case "one_handed_melee":
      return sub.includes("melee") && !props.includes("two-handed") && !props.includes("two handed")
    default:
      return sub.includes(target) || props.includes(target)
  }
}

export function sumAttackRollModifiers(
  aggregated: AggregatedCharacteristics,
  options?: { subcategory?: string; properties?: string[]; unarmed?: boolean },
): number {
  let bonus = 0
  for (const entry of aggregated.attackRollModifiers) {
    const target = resolveRollModifierTarget(entry)
    if (options?.unarmed) {
      if (target === "all" || target === "unarmed" || target.includes("unarmed")) {
        bonus += entry.bonus
      }
      continue
    }
    if (weaponMatchesAttackTarget(options?.subcategory ?? "", options?.properties ?? [], target)) {
      bonus += entry.bonus
    }
  }
  return bonus
}

export function sumDamageRollModifiers(
  aggregated: AggregatedCharacteristics,
  options?: { subcategory?: string; properties?: string[]; damageType?: string; unarmed?: boolean },
): number {
  let bonus = 0
  const damageType = options?.damageType?.toLowerCase() ?? ""
  for (const entry of aggregated.damageRollModifiers) {
    const target = resolveRollModifierTarget(entry)
    if (options?.unarmed) {
      if (target === "all" || target === "unarmed" || target.includes("unarmed")) {
        bonus += entry.bonus
      }
      continue
    }
    if (target === "all") {
      bonus += entry.bonus
      continue
    }
    if (damageType && target === damageType) {
      bonus += entry.bonus
      continue
    }
    if (weaponMatchesAttackTarget(options?.subcategory ?? "", options?.properties ?? [], target)) {
      bonus += entry.bonus
    }
  }
  return bonus
}

export function formatUnarmedStrikeDamage(
  die: UnarmedStrikeDie | null,
  abilityMod: number,
): string {
  const dice = die && die !== "1" ? die : "1"
  const modSuffix =
    abilityMod === 0 ? "" : abilityMod > 0 ? ` + ${abilityMod}` : ` - ${Math.abs(abilityMod)}`
  return `${dice}${modSuffix} Bludgeoning`.trim()
}
