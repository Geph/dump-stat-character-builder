import type { UsesConfig } from "@/lib/types"
import type { BonusByLevelEntry } from "@/lib/compendium/bonus-by-level"
import { normalizeBonusByLevel } from "@/lib/compendium/bonus-by-level"
import { SPECIES_SIZES } from "@/lib/compendium/constants"
import {
  MARTIAL_WEAPONS_LABEL,
  type WeaponProficiencyMode,
} from "@/lib/compendium/weapon-proficiency-options"

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

export const UNARMED_STRIKE_DICE = ["1", "1d4", "1d6", "1d8", "1d10", "1d12"] as const
export type UnarmedStrikeDie = (typeof UNARMED_STRIKE_DICE)[number]

export const SPECIAL_ATTACK_DIE_TYPES = ["d4", "d6", "d8", "d10", "d12"] as const
export type SpecialAttackDieType = (typeof SPECIAL_ATTACK_DIE_TYPES)[number]

export const SPECIAL_ATTACK_PROFILES = [
  { value: "melee", label: "Melee attack" },
  { value: "ranged", label: "Ranged attack" },
  { value: "emanation", label: "Emanation / aura" },
  { value: "force_save", label: "Area — saving throw" },
] as const

export const SPECIAL_ATTACK_AREA_SHAPES = [
  { value: "cone", label: "Cone" },
  { value: "line", label: "Line" },
  { value: "sphere", label: "Sphere" },
  { value: "cylinder", label: "Cylinder" },
  { value: "cube", label: "Cube" },
  { value: "cone_or_line", label: "Cone or line (choose each use)" },
] as const

export const SPECIAL_ATTACK_TARGET_MODES = [
  { value: "single", label: "Single target" },
  { value: "multi", label: "Multiple targets (e.g. Volley)" },
  { value: "area", label: "Area (all in zone)" },
] as const

export const SAVING_THROW_TARGET_SCOPES = [
  { value: "self", label: "Self" },
  { value: "target_creature", label: "Target creature" },
  { value: "allied_creature", label: "Allied creature" },
  { value: "targets_in_area", label: "Targets in area" },
  { value: "allies_in_area", label: "Allies in area" },
  { value: "enemies_in_area", label: "Enemies in area" },
] as const

export type SavingThrowTargetScope = (typeof SAVING_THROW_TARGET_SCOPES)[number]["value"]

export type CreatureSizeValue = (typeof SPECIES_SIZES)[number]

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
  { value: "attack_roll_modifiers", label: "Attack Roll and Crit Modifiers" },
  { value: "damage_roll_modifiers", label: "Weapon Damage Modifiers" },
  { value: "unarmed_strike_damage", label: "Unarmed Strike Damage Die" },
  { value: "special_attack", label: "Special Attack" },
  { value: "damage_resistance", label: "Damage Resistances" },
  { value: "damage_immunity", label: "Damage Immunities" },
  { value: "condition_immunity", label: "Condition Immunities" },
  { value: "damage_reduction", label: "Damage Reduction" },
  { value: "spells", label: "Spells per Level (Spell Slots)" },
  { value: "spells_known", label: "Spells Known / Prepared" },
  { value: "spell_list_access", label: "Access to Class Spell List" },
  { value: "spellcasting_ability", label: "Spellcasting Ability Modifier" },
  { value: "uses", label: "Uses (Limited Ability / Resource)" },
  { value: "attunement_slots", label: "Magic Item Attunement Slots" },
  { value: "aura", label: "Aura / Emanation" },
  {
    value: "bonus_damage_riders",
    label: "Attack Damage Riders (Hit/Crit)",
    hint: "Optional cost riders (Sneak Attack) or automatic bonus on hit/crit (Devastating Critical)",
  },
  { value: "saving_throw_trigger", label: "Saving Throw Trigger" },
  {
    value: "on_hit_trigger",
    label: "On Hit / Crit Trigger",
    hint: "Nested effect or maximize damage when an attack hits or crits",
  },
  { value: "failed_roll_trigger", label: "Failed Roll Trigger" },
  {
    value: "d20_test_reaction",
    label: "D20 Test Reaction",
    hint: "Add or subtract dice to any creature's D20 Test (Cosmic Omen, initiative bonuses)",
  },
  {
    value: "damage_halving_reaction",
    label: "Damage Halving Reaction",
    hint: "Halve incoming attack damage (Sentinel at Death's Door, Beguiling Defenses)",
  },
  {
    value: "healing_dice_pool",
    label: "Healing Dice Pool",
    hint: "Pool of dice spent to heal (Healing Light, Warrior of the Gods)",
  },
  {
    value: "on_creature_death_trigger",
    label: "On Creature Death Trigger",
    hint: "React when a creature dies nearby (Keeper of Souls)",
  },
  {
    value: "turn_start_trigger",
    label: "Turn Start Trigger",
    hint: "Passive effect at the start of your turn (Legendary Champion regen, etc.)",
  },
  { value: "telepathy", label: "Telepathy", hint: "Passive telepathic communication range" },
  { value: "on_cast_spell_trigger", label: "On Cast Spell Trigger", hint: "When you cast a matching spell, apply a nested effect (e.g. Empowered Evocation bonus damage)" },
  { value: "spell_healing_modifier", label: "Spell Healing Modifier" },
  { value: "resource_ability_menu", label: "Resource Ability Menu" },
  { value: "extra_turn", label: "Extra Turn" },
  { value: "grant_feat", label: "Gain a Feat" },
  { value: "rest_replacement", label: "Alternate Rest Duration" },
  { value: "magical_sleep_immunity", label: "Magical Sleep Immunity" },
  { value: "creature_size", label: "Change Size" },
  { value: "movement_effects", label: "Movement-Related Effects (Passive)" },
  {
    value: "skill_check_alternate_ability",
    label: "Alternate Ability for Skill Checks",
    hint: "Let certain skill checks use a different ability (e.g. Primal Knowledge: STR while raging)",
  },
] as const

export type CharacteristicModifierType =
  (typeof CHARACTERISTIC_MODIFIER_TYPE_OPTIONS)[number]["value"]

export type ListCharacteristicType =
  | "languages"
  | "armor_proficiencies"
  | "tool_proficiencies"
  | "saving_throws"

export interface CharacteristicModifierBase {
  id: string
  label?: string
  /** Share one pick pool across multiple modifiers on the same source (e.g. Skilled: 3 skills or tools). */
  sharedChoiceGroup?: string
  /** Total picks allowed across all modifiers in the group. */
  sharedChoiceCount?: number
}

export type AbilityScoresMode = "fixed" | "asi_pool"

export interface AbilityScoresCharacteristic extends CharacteristicModifierBase {
  type: "ability_scores"
  /** fixed = set amounts on specific abilities; asi_pool = player allocates points (SRD ASI rules). */
  mode: AbilityScoresMode
  bonuses: Partial<Record<AbilityScoreKey, number>>
  /** Points to spend when mode is asi_pool (default 2 per SRD ASI). */
  points?: number
}

export interface SkillEntry {
  skill: string
  expertise: boolean
}

export interface SkillsCharacteristic extends CharacteristicModifierBase {
  type: "skills"
  entries: SkillEntry[]
  /** Player picks any skill (e.g. Skilled feat). */
  allowAnySkill?: boolean
  /**
   * Player picks from the granting class's level-1 skill list (e.g. Barbarian Primal Knowledge).
   * Resolved against the class's `skill_choices.options` when slots are built.
   */
  fromClassSkillList?: boolean
  /** When set, player chooses this many skills from entries / any-skill pool. */
  choiceCount?: number | null
  /** When true, chosen or listed skills grant Expertise instead of proficiency. */
  grantExpertise?: boolean
  /**
   * When false, skill entries / player picks do not grant proficiency — only drive
   * which skill a paired bonus applies to (e.g. Thaumaturge Arcana or Religion).
   */
  grantsProficiency?: boolean
  /** @deprecated legacy — migrated to entries on load */
  values?: string[]
}

export interface SkillCheckAlternateAbilityCharacteristic extends CharacteristicModifierBase {
  type: "skill_check_alternate_ability"
  /** Ability whose modifier may be substituted for the listed skills' ability checks. */
  ability: AbilityScoreKey
  /** Skills whose ability checks can be made with the alternate ability (empty = any skill). */
  skills: string[]
  /** Optional condition gating the substitution (e.g. "While your Rage is active"). */
  conditionLabel?: string
}

export interface ListCharacteristic extends CharacteristicModifierBase {
  type: ListCharacteristicType
  values: string[]
  /** Player picks this many tools/languages when values are open-ended. */
  choiceCount?: number | null
  /**
   * For `languages` choices, which SRD table the player picks from.
   * Defaults to the Standard Languages table. Players may always add a
   * custom user-defined language regardless of pool.
   */
  choicePool?: "standard" | "standard_and_rare" | null
  /**
   * For `tool_proficiencies` choices, the explicit pool the player picks from
   * (e.g. specific musical instruments). When empty, all SRD tools are offered.
   */
  choiceOptions?: string[] | null
}

export interface WeaponProficienciesCharacteristic extends CharacteristicModifierBase {
  type: "weapon_proficiencies"
  mode: WeaponProficiencyMode
  /** Specific weapon names when mode is "specific". */
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
  /** When true, flat_bonus only applies while wearing armor (Fighting Style: Defense). */
  requiresArmor?: boolean
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
  mode: "set" | "add" | "equal_to_walk"
  value: number
  customType?: string
}

export interface RollModifierEntry {
  bonus: number
  target: string
  customTarget?: string
  /** Lowest d20 total that counts as a critical hit for this attack type (default 20). */
  criticalHitMinimum?: number | null
  /** Level-scaled critical hit minimum (fixed = lowest d20 that crits). */
  criticalHitMinimumByLevel?: BonusByLevelEntry[]
  /** Add ability modifier to weapon damage when the attack would not normally include it. */
  grantAbilityModifierWhenMissing?: boolean
  /** Extra damage dice when ability modifier is already included on the damage roll (e.g. 1d8). */
  bonusDiceWhenModifierIncluded?: string | null
  /** When true, bonus dice use the weapon's damage type. */
  bonusDiceUsesWeaponDamageType?: boolean
  /** Archery: ranged attacks ignore half cover. */
  ignoreHalfCover?: boolean
  /** Archery (extended): three-quarters cover counts as half cover. */
  treatThreeQuartersCoverAsHalf?: boolean
}

export interface AttackRollModifiersCharacteristic extends CharacteristicModifierBase {
  type: "attack_roll_modifiers"
  entries: RollModifierEntry[]
  /** Lowest d20 total that counts as a critical hit (default 20). E.g. 19 = Improved Critical. */
  criticalHitMinimum?: number | null
  /** Level-scaled critical hit minimum when not set per attack entry. */
  criticalHitMinimumByLevel?: BonusByLevelEntry[]
  /** Tactical Master: replace weapon mastery with these properties. */
  weaponMasteryOverrides?: string[]
  /** Studied Attacks: advantage on next attack vs same target after a miss. */
  advantageVsTargetAfterMiss?: boolean
}

export interface DamageRollModifiersCharacteristic extends CharacteristicModifierBase {
  type: "damage_roll_modifiers"
  entries: RollModifierEntry[]
}

export interface UnarmedStrikeDamageCharacteristic extends CharacteristicModifierBase {
  type: "unarmed_strike_damage"
  /** Fixed die when dieByLevel is empty. */
  die?: UnarmedStrikeDie
  /** Martial Arts-style die progression by character level. */
  dieByLevel?: import("@/lib/compendium/bonus-by-level").BonusByLevelEntry[]
}

export interface SpecialAttackCharacteristic extends CharacteristicModifierBase {
  type: "special_attack"
  attackName?: string
  attackProfile?: "melee" | "ranged" | "emanation" | "force_save"
  /** single = one creature; multi = pick N targets; area = all in zone (Volley, Whirlwind, etc.) */
  targetMode?: "single" | "multi" | "area"
  /** Cap on targets when targetMode is multi (omit for unlimited within range). */
  maxTargets?: number | null
  /** Damage uses equipped weapon dice + modifier instead of fixed dice below. */
  useWeaponDamage?: boolean
  areaShape?: "cone" | "line" | "sphere" | "cylinder" | "cube" | "cone_or_line" | null
  areaLengthFeet?: number | null
  areaWidthFeet?: number | null
  /** When areaShape is cone_or_line, length of the line option (e.g. 30 ft. breath line). */
  alternateAreaLengthFeet?: number | null
  properties: string[]
  damageTypes: string[]
  damageDiceCount: number
  damageDieType: SpecialAttackDieType
  damageByLevel?: BonusByLevelEntry[]
  saveAbility?: string | null
  saveDCBase?: number | null
  /** On a successful save, target takes half damage (area exploits). */
  saveHalfDamage?: boolean
  rangeFeet?: number | null
}

export interface RestReplacementCharacteristic extends CharacteristicModifierBase {
  type: "rest_replacement"
  restHours: number
  replacesLongRest?: boolean
  description?: string
}

export interface MagicalSleepImmunityCharacteristic extends CharacteristicModifierBase {
  type: "magical_sleep_immunity"
}

export interface CreatureSizeCharacteristic extends CharacteristicModifierBase {
  type: "creature_size"
  size: CreatureSizeValue
  /** passive = always this size; activatable = can assume this size temporarily */
  mode: "passive" | "activatable"
  durationMinutes?: number | null
}

export interface MovementEffectsCharacteristic extends CharacteristicModifierBase {
  type: "movement_effects"
  movementDash?: boolean
  movementDisengage?: boolean
  movementHide?: boolean
  movementMoveThroughLargerSpaces?: boolean
  movementHideBehindLargerCreatures?: boolean
  /** When set, movement bonuses apply only to these types (empty = all). */
  movementTypes?: import("@/lib/types").MovementType[]
}

export interface DamageCharacteristic extends CharacteristicModifierBase {
  type: "damage_resistance" | "damage_immunity"
  damageTypes: string[]
}

export interface ConditionImmunityCharacteristic extends CharacteristicModifierBase {
  type: "condition_immunity"
  conditions: string[]
}

export interface AttunementSlotsCharacteristic extends CharacteristicModifierBase {
  type: "attunement_slots"
  /** Additional attunement slots beyond the default of 3. */
  bonusSlots?: number
  /** Set total attunement slots (overrides default + bonus). */
  totalSlots?: number | null
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

export interface SpellsKnownChoiceGrant {
  /** Spell level (0 = cantrip). */
  level: number
  /** How many spells the player chooses at this level. */
  count: number
  /** Optional per-grant class list override; otherwise uses spellListClassOptions + player pick. */
  classNames?: string[]
  /** Player may pick from any prepared-caster class list (Magical Secrets). */
  crossClassAnyList?: boolean
  /** Spells from this grant are always prepared (domain/oath spells). */
  alwaysPrepared?: boolean
}

export interface SpellsKnownEntry {
  spellId: string
  prepared?: boolean
  alwaysPrepared?: boolean
  /** Class level when this always-prepared spell unlocks (subclass spell tables). */
  unlocksAtClassLevel?: number
}

export interface SpellsKnownCharacteristic extends CharacteristicModifierBase {
  type: "spells_known"
  spells: SpellsKnownEntry[]
  /** Player chooses spells at runtime (e.g. Magic Initiate cantrips / level-1 spell). */
  choiceGrants?: SpellsKnownChoiceGrant[]
  /** Class spell lists the player may choose from when playerPicksSpellList is true. */
  spellListClassOptions?: string[]
  /** Player picks one class list before choosing spells from choiceGrants. */
  playerPicksSpellList?: boolean
  castingAbility?: AbilityScoreKey
  /** Default for choice grants and fixed spells without per-entry override. */
  alwaysPrepared?: boolean
  /** Free casts per long rest (Dragon Companion, etc.). */
  freeCastPerLongRest?: { spellName: string; count: number }[]
  /** Spell Mastery: cast these levels at will. */
  castAtWillLevels?: number[]
  /** Relentless Hunter: concentration on this spell can't break from damage. */
  concentrationImmuneForSpell?: string | null
  /** Foe Slayer: Hunter's Mark damage die override. */
  markDamageDie?: string | null
}

export interface AuraCharacteristic extends CharacteristicModifierBase {
  type: "aura"
  radiusFeet: number
  radiusByLevel?: BonusByLevelEntry[]
  affectsSelf?: boolean
  affectsAllies?: boolean
  saveBonusConfig?: import("@/lib/compendium/roll-bonus-config").RollBonusConfig | null
  conditionImmunities?: string[]
  halfCover?: boolean
  /** Smite of Protection: aura active while casting spells with this tag. */
  activeWhileCastingSpellTag?: string | null
  /** Superior Hunter's Defense: reaction resistance to last damage type. */
  reactionGrantResistance?: boolean
}

export interface BonusDamageRiderEntry {
  name: string
  costDice?: string | null
  description?: string | null
  saveAbility?: string | null
  conditionOnFailedSave?: string | null
}

export type BonusDamageRiderTrigger = "on_hit" | "on_crit"

export interface BonusDamageRidersCharacteristic extends CharacteristicModifierBase {
  type: "bonus_damage_riders"
  riders: BonusDamageRiderEntry[]
  maxRidersPerUse?: number | null
  appliesTo?: string | null
  /** When riders is empty, automatic bonus applied on hit or crit (e.g. +level on crit). */
  triggerOn?: BonusDamageRiderTrigger | null
  automaticBonus?: import("@/lib/compendium/roll-bonus-config").RollBonusConfig | null
}

/** Nested common-modifier effect fired by a trigger characteristic. */
export type NestedModifierEffect = {
  catalogRefId: string
  instanceId?: string
  characteristics?: CharacteristicModifier[]
  activation?: import("@/lib/types").FeatureActivation | null
}

export type RollTriggerKind = "ability" | "skill" | "attack" | "save"

export interface SavingThrowTriggerCharacteristic extends CharacteristicModifierBase {
  type: "saving_throw_trigger"
  triggerOn: "make" | "fail" | "ally_fails"
  saveAbility?: string | null
  targetScope: SavingThrowTargetScope
  saveConditionFilter?: string[]
  useReaction?: boolean
  /** When set, failed saves are treated as this total instead (Bend Reality, Shared Resilience). */
  replaceFailedRollWith?: number | null
  spendResourceKey?: string | null
  spendResourceAmount?: number | null
  effect?: NestedModifierEffect | null
}

export type OnHitTriggerKind = "hit" | "crit"

export interface OnHitTriggerCharacteristic extends CharacteristicModifierBase {
  type: "on_hit_trigger"
  /** hit = on any hit; crit = critical hit only (Devastating Critical maximize). */
  triggerOn?: OnHitTriggerKind | null
  oncePerTurn?: boolean
  spendResourceKey?: string | null
  spendResourceAmount?: number | null
  appliesTo?: string | null
  /** Maximize weapon damage dice instead of rolling (optional level gate). */
  maximizeWeaponDamage?: boolean
  maximizeWeaponDamageAtLevel?: number | null
  effect?: NestedModifierEffect | null
}

export interface FailedRollTriggerCharacteristic extends CharacteristicModifierBase {
  type: "failed_roll_trigger"
  /** fail = Peerless Skill; success = Cutting Words, Psychic Feedback */
  triggerOn?: "fail" | "success"
  rollKind: RollTriggerKind
  ability?: string | null
  skills?: string[]
  targetScope: SavingThrowTargetScope
  rangeFeet?: number | null
  useReaction?: boolean
  spendResourceKey?: string | null
  spendResourceAmount?: number | null
  /** Peerless Skill: don't expend resource if the roll still fails after adding the die. */
  refundResourceOnStillFailed?: boolean
  effect?: NestedModifierEffect | null
}

export interface D20TestReactionCharacteristic extends CharacteristicModifierBase {
  type: "d20_test_reaction"
  modifierMode: "add" | "subtract"
  rollKinds?: RollTriggerKind[]
  targetScope: SavingThrowTargetScope
  rangeFeet?: number | null
  useReaction?: boolean
  spendResourceKey?: string | null
  spendResourceAmount?: number | null
  dieSource?: "resource_die" | "fixed" | "ability_modifier"
  fixedDie?: string | null
  effect?: NestedModifierEffect | null
}

export interface DamageHalvingReactionCharacteristic extends CharacteristicModifierBase {
  type: "damage_halving_reaction"
  cancelCritRiders?: boolean
  rangeFeet?: number | null
  useReaction?: boolean
  /** Only against a creature you previously imposed disadvantage on (Sentinel). */
  requiresPriorDisadvantage?: boolean
}

export interface HealingDicePoolCharacteristic extends CharacteristicModifierBase {
  type: "healing_dice_pool"
  dieType: "d4" | "d6" | "d8" | "d10" | "d12" | "d20"
  poolSize?: number | null
  poolSizeByLevel?: BonusByLevelEntry[]
  maxDicePerUse?: { type: "ability_modifier"; ability: AbilityScoreKey } | null
  activation: "bonus_action" | "action" | "magic_action"
  recharges?: import("@/lib/types").RechargeRule[]
}

export interface OnCreatureDeathTriggerCharacteristic extends CharacteristicModifierBase {
  type: "on_creature_death_trigger"
  creatureFilter: "enemy" | "ally" | "any"
  rangeFeet: number
  useReaction?: boolean
  effect?: NestedModifierEffect | null
}

export interface TurnStartTriggerCharacteristic extends CharacteristicModifierBase {
  type: "turn_start_trigger"
  /** Regain HP when current HP is below this fraction of max (e.g. 0.5 = half). */
  hpBelowFraction?: number | null
  /** Minimum HP required (e.g. 1 = not at 0). */
  hpAtLeast?: number | null
  effect?: NestedModifierEffect | null
}

export interface TelepathyCharacteristic extends CharacteristicModifierBase {
  type: "telepathy"
  rangeFeet: number
  canInitiate?: boolean
}

export interface OnCastSpellTriggerCharacteristic extends CharacteristicModifierBase {
  type: "on_cast_spell_trigger"
  spellTags?: string[]
  spellSchool?: string | null
  effect?: NestedModifierEffect | null
}

export interface SpellHealingModifierCharacteristic extends CharacteristicModifierBase {
  type: "spell_healing_modifier"
  /** Disciple of Life flat bonus on healing spells. */
  bonusFlat?: number
  /** Disciple of Life: +N per spell level. */
  bonusPerSpellLevel?: number
  /** Blessed Healer self-heal when healing others. */
  selfHealFlat?: number
  selfHealPerSpellLevel?: number
  maximizeHealingDice?: boolean
  /** Grave Domain Return to Life — maximize dice only when target is at 0 HP. */
  maximizeOnlyAtZeroHp?: boolean
  halfDamageOnSaveSuccess?: boolean
}

export interface ResourceAbilityMenuOption {
  name: string
  description?: string
  resourceCost?: number
  effect?: NestedModifierEffect | null
}

export interface ResourceAbilityMenuCharacteristic extends CharacteristicModifierBase {
  type: "resource_ability_menu"
  resourceKey: string
  options: ResourceAbilityMenuOption[]
  /** Remarkable Strength: use menu abilities without spending the pool. */
  waiveResourceCost?: boolean
  /** Roll types that may trigger a free use (ability check, save, etc.). */
  appliesOnRollKinds?: RollTriggerKind[]
  /** Limit free use to these abilities (Strength, Constitution, etc.). */
  appliesOnAbilities?: string[]
}

export interface ExtraTurnCharacteristic extends CharacteristicModifierBase {
  type: "extra_turn"
  firstRoundOnly?: boolean
  turnCount?: number
}

export interface SpellListAccessCharacteristic extends CharacteristicModifierBase {
  type: "spell_list_access"
  /** Class names whose spell lists are accessible (e.g. Cleric for Divine Soul). */
  classNames: string[]
}

export interface SpellcastingAbilityCharacteristic extends CharacteristicModifierBase {
  type: "spellcasting_ability"
  ability: AbilityScoreKey
}

export interface UsesCharacteristic extends CharacteristicModifierBase {
  type: "uses"
  uses: UsesConfig
}

export interface GrantFeatCharacteristic extends CharacteristicModifierBase {
  type: "grant_feat"
  /** Feat categories the character may choose from (General, Epic Boon, etc.). */
  featCategories: string[]
  /** How many feat choices this modifier grants (default 1). */
  count: number
}

export type CharacteristicModifier =
  | AbilityScoresCharacteristic
  | SkillsCharacteristic
  | SkillCheckAlternateAbilityCharacteristic
  | ListCharacteristic
  | WeaponProficienciesCharacteristic
  | AcCharacteristic
  | HitPointsCharacteristic
  | InitiativeCharacteristic
  | VisionCharacteristic
  | SpeedCharacteristic
  | AttackRollModifiersCharacteristic
  | DamageRollModifiersCharacteristic
  | UnarmedStrikeDamageCharacteristic
  | SpecialAttackCharacteristic
  | RestReplacementCharacteristic
  | MagicalSleepImmunityCharacteristic
  | CreatureSizeCharacteristic
  | MovementEffectsCharacteristic
  | DamageCharacteristic
  | ConditionImmunityCharacteristic
  | AttunementSlotsCharacteristic
  | AuraCharacteristic
  | BonusDamageRidersCharacteristic
  | SavingThrowTriggerCharacteristic
  | OnHitTriggerCharacteristic
  | FailedRollTriggerCharacteristic
  | D20TestReactionCharacteristic
  | DamageHalvingReactionCharacteristic
  | HealingDicePoolCharacteristic
  | OnCreatureDeathTriggerCharacteristic
  | TurnStartTriggerCharacteristic
  | TelepathyCharacteristic
  | OnCastSpellTriggerCharacteristic
  | SpellHealingModifierCharacteristic
  | ResourceAbilityMenuCharacteristic
  | ExtraTurnCharacteristic
  | DamageReductionCharacteristic
  | SpellGrantCharacteristic
  | SpellsKnownCharacteristic
  | SpellListAccessCharacteristic
  | SpellcastingAbilityCharacteristic
  | UsesCharacteristic
  | GrantFeatCharacteristic

export function createModifierId(): string {
  return `mod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function createCharacteristicModifier(
  type: CharacteristicModifierType,
): CharacteristicModifier {
  const id = createModifierId()
  switch (type) {
    case "ability_scores":
      return { id, type, mode: "fixed", bonuses: {} }
    case "skills":
      return { id, type, entries: [] }
    case "skill_check_alternate_ability":
      return { id, type, ability: "strength", skills: [] }
    case "languages":
    case "armor_proficiencies":
    case "tool_proficiencies":
    case "saving_throws":
      return { id, type, values: [] }
    case "weapon_proficiencies":
      return { id, type, mode: "specific", values: [] }
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
      return {
        id,
        type,
        entries: [{ bonus: 2, target: "ranged" }],
        criticalHitMinimum: null,
        criticalHitMinimumByLevel: [],
      }
    case "condition_immunity":
      return { id, type, conditions: [] }
    case "damage_roll_modifiers":
      return { id, type, entries: [{ bonus: 2, target: "one_handed_melee" }] }
    case "unarmed_strike_damage":
      return { id, type, die: "1d6", dieByLevel: [] }
    case "special_attack":
      return {
        id,
        type,
        attackName: "Special Attack",
        attackProfile: "melee",
        properties: [],
        damageTypes: [],
        damageDiceCount: 1,
        damageDieType: "d6",
        damageByLevel: [],
      }
    case "rest_replacement":
      return { id, type, restHours: 4, replacesLongRest: true, description: "" }
    case "magical_sleep_immunity":
      return { id, type }
    case "creature_size":
      return { id, type, size: "Large", mode: "activatable", durationMinutes: 10 }
    case "movement_effects":
      return { id, type }
    case "damage_resistance":
    case "damage_immunity":
      return { id, type, damageTypes: [] }
    case "damage_reduction":
      return { id, type, amount: 3, damageTypes: ["Bludgeoning", "Piercing", "Slashing"] }
    case "spells":
      return { id, type, grants: [{ level: 1, count: 1 }] }
    case "spells_known":
      return { id, type, spells: [], choiceGrants: [] }
    case "spell_list_access":
      return { id, type, classNames: [] }
    case "spellcasting_ability":
      return { id, type, ability: "intelligence" }
    case "uses":
      return { id, type, uses: { type: "unlimited" } }
    case "attunement_slots":
      return { id, type, bonusSlots: 1, totalSlots: null }
    case "aura":
      return { id, type, radiusFeet: 10, affectsSelf: true, affectsAllies: true }
    case "bonus_damage_riders":
      return { id, type, riders: [], maxRidersPerUse: 1 }
    case "saving_throw_trigger":
      return { id, type, triggerOn: "make", saveAbility: null, targetScope: "self", effect: null }
    case "on_hit_trigger":
      return { id, type, oncePerTurn: true, effect: null }
    case "failed_roll_trigger":
      return { id, type, triggerOn: "fail", rollKind: "ability", targetScope: "self", effect: null }
    case "d20_test_reaction":
      return {
        id,
        type,
        modifierMode: "add",
        rollKinds: [],
        targetScope: "self",
        dieSource: "resource_die",
        effect: null,
      }
    case "damage_halving_reaction":
      return { id, type, useReaction: true, cancelCritRiders: false }
    case "healing_dice_pool":
      return {
        id,
        type,
        dieType: "d6",
        activation: "bonus_action",
        recharges: [{ rest: "long_rest" }],
      }
    case "on_creature_death_trigger":
      return { id, type, creatureFilter: "enemy", rangeFeet: 30, effect: null }
    case "turn_start_trigger":
      return { id, type, hpBelowFraction: 0.5, hpAtLeast: 1, effect: null }
    case "telepathy":
      return { id, type, rangeFeet: 60, canInitiate: true }
    case "on_cast_spell_trigger":
      return { id, type, spellTags: [], effect: null }
    case "spell_healing_modifier":
      return { id, type, bonusFlat: 0, bonusPerSpellLevel: 0 }
    case "resource_ability_menu":
      return { id, type, resourceKey: "", options: [] }
    case "extra_turn":
      return { id, type, firstRoundOnly: true, turnCount: 1 }
    case "grant_feat":
      return { id, type, featCategories: ["General"], count: 1 }
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

function coerceStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
  }
  if (typeof value === "string" && value.trim()) return [value.trim()]
  return []
}

function migrateWeaponProficiencies(value: CharacteristicModifier): WeaponProficienciesCharacteristic {
  const raw = value as WeaponProficienciesCharacteristic & { values?: string[] }
  if (raw.mode === "martial_weapons" || raw.mode === "specific") {
    return {
      id: raw.id,
      label: raw.label,
      type: "weapon_proficiencies",
      mode: raw.mode,
      values: raw.values ?? [],
    }
  }

  const legacyValues = raw.values ?? []
  const hasMartialCategory = legacyValues.some((entry) =>
    entry.toLowerCase().includes("martial"),
  )
  const specificValues = legacyValues.filter(
    (entry) =>
      !entry.toLowerCase().includes("martial") &&
      !entry.toLowerCase().includes("simple") &&
      entry.trim().length > 0,
  )

  if (hasMartialCategory && specificValues.length === 0) {
    return {
      id: raw.id,
      label: raw.label,
      type: "weapon_proficiencies",
      mode: "martial_weapons",
      values: [],
    }
  }

  return {
    id: raw.id,
    label: raw.label,
    type: "weapon_proficiencies",
    mode: "specific",
    values: specificValues.length ? specificValues : legacyValues,
  }
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

  if (value.type === "weapon_proficiencies") {
    return migrateWeaponProficiencies(value)
  }

  if (value.type === "spells_known") {
    const raw = value as SpellsKnownCharacteristic
    return {
      ...raw,
      spells: raw.spells ?? [],
      choiceGrants: raw.choiceGrants ?? [],
      spellListClassOptions: raw.spellListClassOptions ?? [],
      playerPicksSpellList: raw.playerPicksSpellList ?? false,
      alwaysPrepared: raw.alwaysPrepared ?? false,
    }
  }

  if (value.type === "aura") {
    const raw = value as AuraCharacteristic
    return {
      ...raw,
      radiusFeet: raw.radiusFeet ?? 10,
      conditionImmunities: raw.conditionImmunities ?? [],
      radiusByLevel: raw.radiusByLevel ?? [],
    }
  }

  if (value.type === "bonus_damage_riders") {
    const raw = value as BonusDamageRidersCharacteristic
    return {
      ...raw,
      riders: raw.riders ?? [],
      maxRidersPerUse: raw.maxRidersPerUse ?? 1,
      triggerOn: raw.triggerOn ?? "on_hit",
      automaticBonus: raw.automaticBonus ?? null,
    }
  }

  if (value.type === "saving_throw_trigger") {
    const raw = value as SavingThrowTriggerCharacteristic
    return {
      ...raw,
      triggerOn: raw.triggerOn ?? "make",
      saveAbility: raw.saveAbility ?? null,
      targetScope: raw.targetScope ?? "self",
      saveConditionFilter: raw.saveConditionFilter ?? [],
      useReaction: raw.useReaction ?? false,
      replaceFailedRollWith: raw.replaceFailedRollWith ?? null,
      spendResourceKey: raw.spendResourceKey ?? null,
      spendResourceAmount: raw.spendResourceAmount ?? null,
      effect: raw.effect ?? null,
    }
  }

  if (value.type === "on_hit_trigger") {
    const raw = value as OnHitTriggerCharacteristic
    return {
      ...raw,
      triggerOn: raw.triggerOn ?? "hit",
      oncePerTurn: raw.oncePerTurn ?? true,
      maximizeWeaponDamage: raw.maximizeWeaponDamage ?? false,
      maximizeWeaponDamageAtLevel: raw.maximizeWeaponDamageAtLevel ?? null,
      effect: raw.effect ?? null,
    }
  }

  if (value.type === "failed_roll_trigger") {
    const raw = value as FailedRollTriggerCharacteristic
    return {
      ...raw,
      triggerOn: raw.triggerOn ?? "fail",
      rollKind: raw.rollKind ?? "ability",
      targetScope: raw.targetScope ?? "self",
      rangeFeet: raw.rangeFeet ?? null,
      useReaction: raw.useReaction ?? false,
      refundResourceOnStillFailed: raw.refundResourceOnStillFailed ?? false,
      effect: raw.effect ?? null,
    }
  }

  if (value.type === "d20_test_reaction") {
    const raw = value as D20TestReactionCharacteristic
    return {
      ...raw,
      modifierMode: raw.modifierMode ?? "add",
      rollKinds: raw.rollKinds ?? [],
      targetScope: raw.targetScope ?? "self",
      rangeFeet: raw.rangeFeet ?? null,
      useReaction: raw.useReaction ?? false,
      dieSource: raw.dieSource ?? "resource_die",
      fixedDie: raw.fixedDie ?? null,
      effect: raw.effect ?? null,
    }
  }

  if (value.type === "damage_halving_reaction") {
    const raw = value as DamageHalvingReactionCharacteristic
    return {
      ...raw,
      cancelCritRiders: raw.cancelCritRiders ?? false,
      useReaction: raw.useReaction ?? true,
      requiresPriorDisadvantage: raw.requiresPriorDisadvantage ?? false,
    }
  }

  if (value.type === "healing_dice_pool") {
    const raw = value as HealingDicePoolCharacteristic
    return {
      ...raw,
      dieType: raw.dieType ?? "d6",
      activation: raw.activation ?? "bonus_action",
      recharges: raw.recharges ?? [{ rest: "long_rest" }],
      poolSizeByLevel: raw.poolSizeByLevel ?? [],
    }
  }

  if (value.type === "on_creature_death_trigger") {
    const raw = value as OnCreatureDeathTriggerCharacteristic
    return {
      ...raw,
      creatureFilter: raw.creatureFilter ?? "enemy",
      rangeFeet: raw.rangeFeet ?? 30,
      useReaction: raw.useReaction ?? false,
      effect: raw.effect ?? null,
    }
  }

  if (value.type === "telepathy") {
    const raw = value as TelepathyCharacteristic
    return {
      ...raw,
      rangeFeet: raw.rangeFeet ?? 60,
      canInitiate: raw.canInitiate ?? true,
    }
  }

  if (value.type === "on_cast_spell_trigger") {
    const raw = value as OnCastSpellTriggerCharacteristic
    return {
      ...raw,
      spellTags: raw.spellTags ?? [],
      spellSchool: raw.spellSchool ?? null,
      effect: raw.effect ?? null,
    }
  }

  if (value.type === "spell_healing_modifier") {
    const raw = value as SpellHealingModifierCharacteristic
    return {
      ...raw,
      bonusFlat: raw.bonusFlat ?? 0,
      bonusPerSpellLevel: raw.bonusPerSpellLevel ?? 0,
      maximizeHealingDice: raw.maximizeHealingDice ?? false,
      maximizeOnlyAtZeroHp: raw.maximizeOnlyAtZeroHp ?? false,
      halfDamageOnSaveSuccess: raw.halfDamageOnSaveSuccess ?? false,
    }
  }

  if (value.type === "resource_ability_menu") {
    const raw = value as ResourceAbilityMenuCharacteristic
    return {
      ...raw,
      resourceKey: raw.resourceKey ?? "",
      options: raw.options ?? [],
      waiveResourceCost: raw.waiveResourceCost ?? false,
      appliesOnRollKinds: raw.appliesOnRollKinds ?? [],
      appliesOnAbilities: raw.appliesOnAbilities ?? [],
    }
  }

  if (value.type === "turn_start_trigger") {
    const raw = value as TurnStartTriggerCharacteristic
    return {
      ...raw,
      hpBelowFraction: raw.hpBelowFraction ?? null,
      hpAtLeast: raw.hpAtLeast ?? null,
      effect: raw.effect ?? null,
    }
  }

  if (value.type === "extra_turn") {
    const raw = value as ExtraTurnCharacteristic
    return {
      ...raw,
      firstRoundOnly: raw.firstRoundOnly ?? true,
      turnCount: raw.turnCount ?? 1,
    }
  }

  if (
    value.type === "tool_proficiencies" ||
    value.type === "languages" ||
    value.type === "armor_proficiencies" ||
    value.type === "saving_throws"
  ) {
    const raw = value as ListCharacteristic
    return { ...raw, values: coerceStringArray(raw.values), choiceCount: raw.choiceCount ?? null }
  }

  if (value.type === "damage_resistance" || value.type === "damage_immunity") {
    const raw = value as DamageCharacteristic & { values?: string[] }
    return {
      ...raw,
      damageTypes: coerceStringArray(raw.damageTypes ?? raw.values),
    }
  }

  if (value.type === "unarmed_strike_damage") {
    const raw = value as UnarmedStrikeDamageCharacteristic
    return {
      ...raw,
      die: raw.die ?? "1d6",
      dieByLevel: normalizeBonusByLevel(raw.dieByLevel),
    }
  }

  if (value.type === "special_attack") {
    const raw = value as SpecialAttackCharacteristic
    return {
      ...raw,
      targetMode: raw.targetMode ?? "single",
      maxTargets: raw.maxTargets ?? null,
      useWeaponDamage: raw.useWeaponDamage ?? false,
      saveHalfDamage: raw.saveHalfDamage ?? false,
      properties: raw.properties ?? [],
      damageTypes: raw.damageTypes ?? [],
      damageDiceCount: raw.damageDiceCount ?? 1,
      damageDieType: raw.damageDieType ?? "d6",
      damageByLevel: raw.damageByLevel ?? [],
    }
  }

  if (value.type === "rest_replacement") {
    const raw = value as RestReplacementCharacteristic
    return {
      ...raw,
      restHours: raw.restHours ?? 4,
      replacesLongRest: raw.replacesLongRest ?? true,
      description: raw.description ?? "",
    }
  }

  if (value.type === "magical_sleep_immunity") {
    return value as MagicalSleepImmunityCharacteristic
  }

  if (value.type === "creature_size") {
    const raw = value as CreatureSizeCharacteristic
    return {
      ...raw,
      size: raw.size ?? "Medium",
      mode: raw.mode ?? "passive",
    }
  }

  if (value.type === "movement_effects") {
    const raw = value as MovementEffectsCharacteristic
    return { ...raw, movementTypes: raw.movementTypes ?? [] }
  }

  if (value.type === "condition_immunity") {
    const raw = value as ConditionImmunityCharacteristic & { values?: string[] }
    return {
      ...raw,
      conditions: coerceStringArray(raw.conditions ?? raw.values),
    }
  }

  if (value.type === "attunement_slots") {
    const raw = value as AttunementSlotsCharacteristic
    return {
      ...raw,
      bonusSlots: raw.bonusSlots ?? 0,
      totalSlots: raw.totalSlots ?? null,
    }
  }

  if (value.type === "attack_roll_modifiers") {
    const raw = value as AttackRollModifiersCharacteristic
    return {
      ...raw,
      entries: (raw.entries ?? []).map((entry) => ({
        ...entry,
        criticalHitMinimum: entry.criticalHitMinimum ?? null,
        criticalHitMinimumByLevel: normalizeBonusByLevel(entry.criticalHitMinimumByLevel),
      })),
      criticalHitMinimum: raw.criticalHitMinimum ?? null,
      criticalHitMinimumByLevel: normalizeBonusByLevel(raw.criticalHitMinimumByLevel),
    }
  }

  if (value.type === "damage_roll_modifiers") {
    const raw = value as DamageRollModifiersCharacteristic
    return {
      ...raw,
      entries: (raw.entries ?? []).map((entry) => ({ ...entry })),
    }
  }

  if (value.type === "ability_scores") {
    const raw = value as AbilityScoresCharacteristic
    const mode = raw.mode === "asi_pool" ? "asi_pool" : "fixed"
    return {
      id: raw.id,
      label: raw.label,
      type: "ability_scores",
      mode,
      bonuses: raw.bonuses ?? {},
      points: mode === "asi_pool" ? (raw.points ?? 2) : undefined,
    }
  }

  if (value.type === "spell_list_access") {
    const raw = value as SpellListAccessCharacteristic
    return { ...raw, classNames: coerceStringArray(raw.classNames) }
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

export function getWeaponProficiencyValues(mod: WeaponProficienciesCharacteristic): string[] {
  if (mod.mode === "martial_weapons") return [MARTIAL_WEAPONS_LABEL]
  return mod.values ?? []
}

export type AggregatedRollModifier = RollModifierEntry

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
  acFlatBonusWhileArmored: number
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
  /** Climb/swim/fly speeds that mirror walking speed (Peak Athlete). */
  speedEqualToWalk: string[]
  attackRollModifiers: AggregatedRollModifier[]
  damageRollModifiers: AggregatedRollModifier[]
  unarmedStrikeDie: UnarmedStrikeDie | null
  unarmedStrikeDieByLevel: import("@/lib/compendium/bonus-by-level").BonusByLevelEntry[]
  resistances: string[]
  immunities: string[]
  conditionImmunities: string[]
  criticalHitMinimum: number | null
  criticalHitMinimumByLevel: import("@/lib/compendium/bonus-by-level").BonusByLevelEntry[]
  attunementSlots: number | null
  auras: AuraCharacteristic[]
  bonusDamageRiders: BonusDamageRidersCharacteristic[]
  savingThrowTriggers: SavingThrowTriggerCharacteristic[]
  onHitTriggers: OnHitTriggerCharacteristic[]
  failedRollTriggers: FailedRollTriggerCharacteristic[]
  onCastSpellTriggers: OnCastSpellTriggerCharacteristic[]
  spellHealingModifiers: SpellHealingModifierCharacteristic[]
  resourceAbilityMenus: ResourceAbilityMenuCharacteristic[]
  extraTurns: ExtraTurnCharacteristic[]
  damageReduction: { amount: number; damageTypes: string[] }[]
  spellsByLevel: { level: number; count: number }[]
  spellsKnown: AggregatedSpellsKnown[]
  spellListAccess: string[]
  spellcastingAbility: AbilityScoreKey | null
  specialAttacks: SpecialAttackCharacteristic[]
  restReplacement: { restHours: number; replacesLongRest: boolean; description: string } | null
  magicalSleepImmunity: boolean
  creatureSize: CreatureSizeCharacteristic | null
  movementEffects: {
    movementDash: boolean
    movementDisengage: boolean
    movementHide: boolean
    movementMoveThroughLargerSpaces: boolean
    movementHideBehindLargerCreatures: boolean
  }
}

const UNARMED_DIE_RANK: Record<UnarmedStrikeDie, number> = {
  "1": 0,
  "1d4": 1,
  "1d6": 2,
  "1d8": 3,
  "1d10": 4,
  "1d12": 5,
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
  acFlatBonusWhileArmored: 0,
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
  speedEqualToWalk: [],
  attackRollModifiers: [],
  damageRollModifiers: [],
  unarmedStrikeDie: null,
  unarmedStrikeDieByLevel: [],
  resistances: [],
  immunities: [],
  conditionImmunities: [],
  criticalHitMinimum: null,
  criticalHitMinimumByLevel: [],
  attunementSlots: null,
  auras: [],
  bonusDamageRiders: [],
  savingThrowTriggers: [],
  onHitTriggers: [],
  failedRollTriggers: [],
  onCastSpellTriggers: [],
  spellHealingModifiers: [],
  resourceAbilityMenus: [],
  extraTurns: [],
  damageReduction: [],
  spellsByLevel: [],
  spellsKnown: [],
  spellListAccess: [],
  spellcastingAbility: null,
  specialAttacks: [],
  restReplacement: null,
  magicalSleepImmunity: false,
  creatureSize: null,
  movementEffects: {
    movementDash: false,
    movementDisengage: false,
    movementHide: false,
    movementMoveThroughLargerSpaces: false,
    movementHideBehindLargerCreatures: false,
  },
})

function pushUnique(list: string[], values: string[] | null | undefined) {
  for (const value of values ?? []) {
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
        if (mod.mode === "asi_pool") break
        for (const [key, bonus] of Object.entries(mod.bonuses)) {
          const ability = key as AbilityScoreKey
          result.abilityBonuses[ability] = (result.abilityBonuses[ability] ?? 0) + (bonus ?? 0)
        }
        break
      case "skills":
        if (mod.grantsProficiency === false) break
        for (const entry of getSkillEntries(mod)) {
          pushUnique(result.skills, [entry.skill])
          if (entry.expertise || mod.grantExpertise) {
            pushUnique(result.skillExpertise, [entry.skill])
          }
        }
        break
      case "languages":
      case "armor_proficiencies":
      case "tool_proficiencies":
        pushUnique(
          mod.type === "languages"
            ? result.languages
            : mod.type === "armor_proficiencies"
              ? result.armorProficiencies
              : result.toolProficiencies,
          mod.values,
        )
        break
      case "weapon_proficiencies":
        pushUnique(result.weaponProficiencies, getWeaponProficiencyValues(mod))
        break
      case "saving_throws":
        pushUnique(result.savingThrows, mod.values)
        break
      case "ac":
        if (mod.mode === "flat_bonus") {
          if (mod.requiresArmor) {
            result.acFlatBonusWhileArmored += mod.flatBonus ?? 0
          } else {
            result.acFlatBonus += mod.flatBonus ?? 0
          }
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
        if (mod.mode === "equal_to_walk") {
          if (!result.speedEqualToWalk.includes(key)) {
            result.speedEqualToWalk.push(key)
          }
        } else {
          const current = result.speed[key] ?? 0
          result.speed[key] = mod.mode === "set" ? mod.value : current + mod.value
        }
        break
      }
      case "attack_roll_modifiers":
        result.attackRollModifiers.push(...mod.entries)
        if (mod.criticalHitMinimum != null) {
          result.criticalHitMinimum =
            result.criticalHitMinimum == null
              ? mod.criticalHitMinimum
              : Math.min(result.criticalHitMinimum, mod.criticalHitMinimum)
        }
        if (mod.criticalHitMinimumByLevel?.length) {
          result.criticalHitMinimumByLevel = normalizeBonusByLevel([
            ...result.criticalHitMinimumByLevel,
            ...mod.criticalHitMinimumByLevel,
          ]).sort((a, b) => a.level - b.level)
        }
        break
      case "damage_roll_modifiers":
        result.damageRollModifiers.push(...mod.entries)
        break
      case "unarmed_strike_damage":
        if (mod.dieByLevel?.length) {
          result.unarmedStrikeDieByLevel = normalizeBonusByLevel([
            ...result.unarmedStrikeDieByLevel,
            ...mod.dieByLevel,
          ]).sort((a, b) => a.level - b.level)
        }
        if (mod.die) {
          result.unarmedStrikeDie = pickHigherUnarmedDie(result.unarmedStrikeDie, mod.die)
        }
        break
      case "special_attack":
        result.specialAttacks.push(mod)
        break
      case "rest_replacement":
        result.restReplacement = {
          restHours: mod.restHours,
          replacesLongRest: mod.replacesLongRest ?? true,
          description: mod.description ?? "",
        }
        break
      case "magical_sleep_immunity":
        result.magicalSleepImmunity = true
        break
      case "creature_size":
        result.creatureSize = mod
        break
      case "movement_effects":
        if (mod.movementDash) result.movementEffects.movementDash = true
        if (mod.movementDisengage) result.movementEffects.movementDisengage = true
        if (mod.movementHide) result.movementEffects.movementHide = true
        if (mod.movementMoveThroughLargerSpaces) {
          result.movementEffects.movementMoveThroughLargerSpaces = true
        }
        if (mod.movementHideBehindLargerCreatures) {
          result.movementEffects.movementHideBehindLargerCreatures = true
        }
        break
      case "damage_resistance":
        pushUnique(result.resistances, mod.damageTypes)
        break
      case "damage_immunity":
        pushUnique(result.immunities, mod.damageTypes)
        break
      case "condition_immunity":
        pushUnique(result.conditionImmunities, mod.conditions)
        break
      case "attunement_slots":
        if (mod.totalSlots != null) {
          result.attunementSlots = mod.totalSlots
        } else if (mod.bonusSlots) {
          result.attunementSlots = (result.attunementSlots ?? 3) + mod.bonusSlots
        }
        break
      case "aura":
        result.auras.push(mod)
        if (mod.conditionImmunities?.length) {
          pushUnique(result.conditionImmunities, mod.conditionImmunities)
        }
        break
      case "bonus_damage_riders":
        result.bonusDamageRiders.push(mod)
        break
      case "saving_throw_trigger":
        result.savingThrowTriggers.push(mod)
        break
      case "on_hit_trigger":
        result.onHitTriggers.push(mod)
        break
      case "failed_roll_trigger":
        result.failedRollTriggers.push(mod)
        break
      case "on_cast_spell_trigger":
        result.onCastSpellTriggers.push(mod)
        break
      case "spell_healing_modifier":
        result.spellHealingModifiers.push(mod)
        break
      case "resource_ability_menu":
        result.resourceAbilityMenus.push(mod)
        break
      case "extra_turn":
        result.extraTurns.push(mod)
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
      case "spell_list_access":
        pushUnique(result.spellListAccess, mod.classNames)
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
  options?: { shieldBonus?: number; wearingArmor?: boolean },
): number {
  const shieldBonus = options?.shieldBonus ?? 0
  const armoredFlat =
    options?.wearingArmor ? aggregated.acFlatBonusWhileArmored : 0

  if (aggregated.acFixed != null && aggregated.acFixed > 0) {
    let ac = aggregated.acFixed
    if (aggregated.acIncludeProficiency) ac += proficiencyBonus
    return ac + aggregated.acFlatBonus + armoredFlat + shieldBonus
  }

  if (aggregated.acAbilityMods.length > 0) {
    let ac = aggregated.acBase
    for (const key of aggregated.acAbilityMods) {
      ac += abilityMods[abilityModifierKeyToScoreKey(key)]
    }
    if (aggregated.acIncludeProficiency) ac += proficiencyBonus
    return ac + aggregated.acFlatBonus + armoredFlat + shieldBonus
  }

  let ac = baseAc + aggregated.acFlatBonus + armoredFlat
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
  dieByLevel?: BonusByLevelEntry[],
  characterLevel = 20,
): string {
  const resolved = dieByLevel?.length
    ? resolveUnarmedStrikeDieAtLevel(die, dieByLevel, characterLevel)
    : die
  const dice = resolved && resolved !== "1" ? resolved : "1"
  const modSuffix =
    abilityMod === 0 ? "" : abilityMod > 0 ? ` + ${abilityMod}` : ` - ${Math.abs(abilityMod)}`
  return `${dice}${modSuffix} Bludgeoning`.trim()
}

export function bonusByLevelEntryToUnarmedDie(entry: BonusByLevelEntry): UnarmedStrikeDie | null {
  if (entry.mode === "dice" && entry.dieCount === 1 && entry.dieType) {
    const candidate = `1${entry.dieType}` as UnarmedStrikeDie
    if (UNARMED_STRIKE_DICE.includes(candidate)) return candidate
  }
  if (entry.bonus?.match(/^1d\d+$/i)) {
    const candidate = entry.bonus.toLowerCase() as UnarmedStrikeDie
    if (UNARMED_STRIKE_DICE.includes(candidate)) return candidate
  }
  return null
}

export function resolveUnarmedStrikeDieAtLevel(
  fallbackDie: UnarmedStrikeDie | null | undefined,
  dieByLevel: BonusByLevelEntry[] | null | undefined,
  characterLevel: number,
): UnarmedStrikeDie | null {
  const rows = normalizeBonusByLevel(dieByLevel)
  if (rows.length) {
    const applicable = rows.filter((row) => row.level <= characterLevel).sort((a, b) => b.level - a.level)
    for (const row of applicable) {
      const die = bonusByLevelEntryToUnarmedDie(row)
      if (die) return die
    }
  }
  return fallbackDie ?? null
}
