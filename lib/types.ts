// D&D 2024 Types

import type { BackgroundProficiencies } from "@/lib/compendium/background-proficiencies"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { BuffAllyMode, RollBonusConfig } from "@/lib/compendium/roll-bonus-config"
import type { BonusByLevelEntry } from "@/lib/compendium/bonus-by-level"

export type FeatureDurationKey =
  | "1_round"
  | "until_ended"
  | "until_end_next_turn"
  | "until_next_day"
  | "1_minute"
  | "10_minutes"

export type RollTarget = "ally" | "enemy"

export type MoveDistanceMode = "speed" | "fixed" | "multiplier"

export type MovementType = "walk" | "fly" | "swim" | "climb" | "burrow" | "jump"

export type CastSpellCastingTime = "action" | "bonus_action" | "reaction" | "minute" | "hour"

export type AttackProfile = "melee" | "ranged" | "emanation" | "force_save"

export type CreatureModifyMode =
  | "roll"
  | "disadvantage"
  | "speed"
  | "forced_movement"
  | "restrict"

export type CreatureSpeedChange = "halve" | "reduce" | "set" | "zero"

export type FeatureActivationRequirement =
  | { kind: "drop_to_zero_hp" }
  | { kind: "while_raging" }
  | { kind: "while_condition"; condition: string }
  | { kind: "make_saving_throw"; ability?: string | null }
  | { kind: "fail_saving_throw"; ability?: string | null }
  | { kind: "on_hit" }
  | { kind: "on_attack" }
  | { kind: "on_cast_spell" }
  | { kind: "on_crit" }
  | { kind: "custom"; text: string }

// Feature with choice support
export interface FeatureChoice {
  category: string // e.g., "Fighting Style", "Skill Proficiency"
  options: {
    name: string
    description: string
    modifierRefs?: string[]
    linkedModifiers?: LinkedModifierInstance[]
  }[]
  count: number // how many to choose
  /** When "feats", builder offers compendium feats instead of static options. */
  /** @deprecated Feat picks use grant_feat modifiers from the common modifiers catalog. */
  kind?: "options" | "feats"
  /** @deprecated Use grant_feat catalog entries instead. */
  featCategories?: string[]
}

export interface FeatureEffect {
  id: string
  kind: string
  /** resistance | immunity | flat reduction */
  mitigation?: "resistance" | "immunity" | "reduction" | null
  damageTypes?: string[]
  /** Conditions (Charmed, Frightened, etc.) when mitigation is resistance/immunity. */
  conditionTypes?: string[]
  reductionAmount?: number | null
  /** e.g. rage bonus: +2 at level 1, +3 at 9 */
  bonusByLevel?: BonusByLevelEntry[]
  bonusDice?: string | null
  checkCategory?: "ability" | "skill" | "attack" | "spell_attack" | "save" | "spell_save_dc" | "initiative" | "other" | null
  checkAbility?: string | null
  checkSkills?: string[]
  /** Conditions avoided or ended (typically with saving throws or ability checks). */
  checkConditionTypes?: string[]
  /** check_roll_modifier: bonus, advantage, disadvantage, or replace a failed save */
  checkRollMode?: "bonus" | "advantage" | "disadvantage" | "replace_failure" | null
  /** Reroll when the d20 shows a natural 1 (e.g. Halfling Luck on D20 Tests). */
  checkRerollOnNaturalOne?: boolean
  /** Treat rolls below checkRollFloorBelow as checkRollFloorSetTo. */
  checkRollFloorEnabled?: boolean
  checkRollFloorBelow?: number | null
  checkRollFloorSetTo?: number | null
  /** @deprecated Use bonusConfig */
  bonusAmount?: number | null
  bonusConfig?: RollBonusConfig | null
  /** modify_creature: ally or enemy */
  rollTarget?: RollTarget | null
  /** modify_creature: roll debuff/buff, speed, push, restrict actions, etc. */
  creatureModifyMode?: CreatureModifyMode | null
  creatureSpeedChange?: CreatureSpeedChange | null
  creatureSpeedAmount?: number | null
  creatureMoveDistance?: number | null
  /** e.g. no_opportunity_attacks, no_reactions */
  creatureRestrictions?: string[]
  /** @deprecated Use rollTarget + buffMode on modify_creature_roll */
  buffMode?: BuffAllyMode | null
  buffBonus?: RollBonusConfig | null
  /** @deprecated Implicit when kind is check_advantage */
  grantAdvantage?: boolean
  /** @deprecated Implicit when kind is check_disadvantage */
  grantDisadvantage?: boolean
  classResourceKey?: string | null
  /** How a class_resource effect modifies the pool. */
  classResourceChange?: "reduce" | "increase" | "reset" | null
  /** Uses reduced or restored; ignored when classResourceChange is reset. */
  classResourceAmount?: number | null
  /** heal_self / similar: how HP restored is calculated */
  healMode?: "fixed" | "dice" | "character_level" | "proficiency" | "ability_modifier" | null
  healFixed?: number | null
  healDiceCount?: number | null
  healDieType?: "d4" | "d6" | "d8" | "d10" | "d12" | "d20" | null
  healFlatBonus?: number | null
  /** HP = character level × multiplier when healMode is character_level */
  healLevelMultiplier?: number | null
  healAbility?: "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA" | null
  /** extra_attack: attacks when taking the Attack action */
  extraAttackCount?: number | null
  /** movement_option */
  movementDash?: boolean
  movementDisengage?: boolean
  movementHide?: boolean
  movementMoveThroughLargerSpaces?: boolean
  movementHideBehindLargerCreatures?: boolean
  moveDistanceMode?: MoveDistanceMode | null
  moveDistanceFixed?: number | null
  moveDistanceMultiplier?: number | null
  /** movement_option: movement does not provoke opportunity attacks. */
  moveWithoutOpportunityAttacks?: boolean
  /** weapon_attack / attack or effect */
  attackProfile?: AttackProfile | null
  /** @deprecated Use attackProfile */
  attackStyle?: "melee" | "ranged" | null
  attackDiceCount?: number | null
  attackDieType?: "d4" | "d6" | "d8" | "d10" | "d12" | null
  attackAbility?: "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA" | null
  attackDamageBonus?: number | null
  /** force_save profile: DC = base + modifier */
  saveDCBase?: number | null
  saveDCConfig?: RollBonusConfig | null
  saveAbility?: string | null
  /** damage/conditions applied on failed save or hit */
  effectDamageTypes?: string[]
  effectConditionTypes?: string[]
  /** damage_reduction: Dex-save-style mitigation (Evasion). */
  defensiveSaveScope?: boolean
  /** When defensiveSaveScope: damage on successful save (none = 0, half = half). */
  defensiveSaveSuccess?: "none" | "half" | null
  /** modify_creature: attack rolls against this character can't have Advantage. */
  attackRollsCantHaveAdvantage?: boolean
  /** grant_temp_hp: when temp HP is granted. */
  tempHpTrigger?: "passive" | "on_kill" | "on_action" | "bonus_action" | null
  /** class_resource: refresh pool when rolling Initiative (etc.). */
  resourceRefreshOnInitiative?: boolean
  /** class_resource reset: cap restored uses (e.g. until you have 2). */
  resourceRefreshCap?: number | null
  /** class_resource reset: refresh when finishing a rest. */
  resourceRefreshOnRest?: "short_rest" | "long_rest" | "short_or_long_rest" | null
  /** class_resource reset: cap formula instead of fixed cap (e.g. half level). */
  resourceRefreshFormula?: "half_level" | "full" | null
  /** class_resource: regain all when using another named class feature. */
  regainAllOnLinkedFeatureUse?: boolean
  linkedFeatureName?: string | null
  /** activate_custom_ability: compendium custom ability id to trigger. */
  customAbilityId?: string | null
  /** self_buff_caster: label for the temporary caster state. */
  casterBuffLabel?: string | null
  /** movement_option: movement types this bonus applies to (empty = all). */
  movementTypes?: MovementType[]
  /** cast_spell: spell level (0 = cantrip). */
  castSpellLevel?: number | null
  /** cast_spell: class spell lists the spell may be chosen from. */
  castSpellListClasses?: string[]
  /** cast_spell: required casting time for the granted cast. */
  castSpellCastingTime?: CastSpellCastingTime | null
  /** cast_spell: optional school filter. */
  castSpellSchool?: string | null
  /** cast_spell: fixed spell name when not a player choice. */
  castSpellName?: string | null
  /** cast_spell: cast without expending a spell slot. */
  castSpellWithoutSlot?: boolean
  /** cast_spell: may cast as ritual if the spell allows. */
  castSpellRitual?: boolean
  /** heal_from_pool / heal_self: also remove conditions from target. */
  removeConditions?: string[]
  /** Blessed Healer: heal self when healing others with a spell slot. */
  selfHealFlatOnHealOthers?: number | null
  selfHealPerSpellLevelOnHealOthers?: number | null
  /** Supreme Healing: maximize healing dice. */
  maximizeHealingDice?: boolean
  /** extra_damage_on_hit / rider_damage: selectable riders (Cunning Strike, Brutal Strike). */
  bonusRiderOptions?: { id: string; name: string; costDice?: string | null; description?: string | null }[]
  maxBonusRidersPerUse?: number | null
}

export interface FeatureActivation {
  action?: boolean
  bonusAction?: boolean
  reaction?: boolean
  /** When you roll initiative (not an action economy cost). */
  onInitiative?: boolean
  /** Passive or reaction-style trigger when the character drops to 0 HP. */
  onDropToZeroHp?: boolean
  /** Use the same activation timing as another class feature on this class/subclass. */
  usesExistingClassFeature?: boolean
  /** Name of the sibling class feature whose activation this feature shares. */
  existingClassFeatureName?: string | null
  /** Limit to once per turn (Stunning Strike, etc.). */
  oncePerTurn?: boolean
  /** React when you fail a saving throw. */
  onFailedSave?: boolean
  /** React when you succeed on a saving throw. */
  onSuccessfulSave?: boolean
  /** Spend this class resource pool to activate. */
  spendClassResourceKey?: string | null
  spendClassResourceAmount?: number | null
  requirements?: FeatureActivationRequirement[]
  /** @deprecated Use effects[] */
  effect?: string | null
  effects?: FeatureEffect[]
}

export interface Feature {
  level: number
  name: string
  description: string
  isChoice?: boolean
  choices?: FeatureChoice
  limitedUses?: UsesConfig | null
  duration?: FeatureDurationKey | null
  activation?: FeatureActivation | null
  /** @deprecated Use limitedUses.type === "class_resource" */
  resourceId?: string | null
  /** Cleared when the user edits modifier wiring in the compendium after import. */
  modifierReviewPending?: boolean
  /** References into the Common Modifier Effects catalog. */
  modifierRefs?: string[]
  /** Per-instance catalog links with inline configuration. */
  linkedModifiers?: LinkedModifierInstance[]
}

export interface ClassResource {
  id: string
  name: string
  description?: string
  uses: UsesConfig
}

/** Row in the `class_resources` compendium table. */
export interface ClassResourceRow {
  id: string
  class_id: string
  resource_key: string
  name: string
  description: string | null
  uses: UsesConfig
  icon: string | null
  accent_color?: string | null
  card_image_url?: string | null
  source: string
  creator_url: string | null
  enabled?: boolean
  created_at: string
}

// Trait with choice support for species
export interface Trait {
  name: string
  description: string
  level?: number // level at which trait becomes available, defaults to 1
  isChoice?: boolean
  choices?: FeatureChoice
  modifierRefs?: string[]
  linkedModifiers?: LinkedModifierInstance[]
  duration?: FeatureDurationKey | null
}

export interface Species {
  id: string
  name: string
  description: string | null
  speed: number | { [key: string]: number } // e.g. { walking: 30, climbing: 30 }
  size: string | null
  creature_type: string | null
  traits: Trait[]
  characteristics: import("@/lib/compendium/characteristic-modifiers").CharacteristicModifier[] | null
  /** References into the Common Modifier Effects catalog (merged with characteristics in builder). */
  modifierRefs?: string[] | null
  linkedModifiers?: LinkedModifierInstance[] | null
  icon: string | null
  accent_color?: string | null
  card_image_url?: string | null
  source: string
  creator_url: string | null
  enabled?: boolean
  created_at: string
}

export interface StartingEquipmentOption {
  label: string
  items: { name: string; quantity: number }[]
}

export interface StartingEquipmentGroup {
  description: string
  options: StartingEquipmentOption[]
}

export interface SpellProgressionEntry {
  level: number
  cantrips: number
  prepared: number
  max_spell_level: number
}

export interface DndClass {
  id: string
  name: string
  description: string | null
  card_blurb: string | null
  hit_die: number
  primary_ability: string[] | null
  saving_throws: string[] | null
  armor_proficiencies: string[] | null
  weapon_proficiencies: string[] | null
  skill_choices: { count: number; options: string[] } | null
  starting_equipment: unknown
  starting_equipment_groups: StartingEquipmentGroup[] | null
  starting_gold: number | null
  features: Feature[]
  class_resources?: ClassResource[] | null
  spellcasting: {
    ability: string
    type?: "prepared" | "pact"
    cantrips?: number
    spells_known?: number
    prepared?: boolean
    spellbook?: boolean
    pact_magic?: boolean
    starts_at?: number
    progression?: SpellProgressionEntry[]
  } | null
  icon: string | null
  accent_color?: string | null
  card_image_url?: string | null
  source: string
  creator_url: string | null
  created_at: string
}

export interface Subclass {
  id: string
  class_id: string
  name: string
  description: string | null
  features: Feature[]
  spellcasting?: {
    ability: string
    cantrips?: number
    spells_known?: number
  } | null
  icon: string | null
  accent_color?: string | null
  card_image_url?: string | null
  source: string
  creator_url: string | null
  created_at: string
}

// Uses configuration for abilities with limited uses
export interface UsesAtLevel {
  level: number
  count: number
}

export type RestType = "short_rest" | "long_rest" | "initiative"

export interface RechargeRule {
  rest: RestType
  /** Uses restored on this rest; omit for full pool. */
  amount?: number | null
}

export interface UsesConfig {
  type:
    | "fixed"
    | "proficiency"
    | "ability_modifier"
    | "custom_ability"
    | "at_level"
    | "class_resource"
    | "unlimited"
    | "special"
  fixedAmount?: number
  abilityModifier?: "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA"
  customAbilityId?: string
  /** When type is special — freeform uses description (e.g. Greater Divine Intervention). */
  specialDescription?: string
  /** When type is class_resource — resource_key from class_resources table */
  classResourceKey?: string
  /** When type is class_resource — uses spent per activation (default: 1) */
  classResourceAmount?: number
  atLevelTable?: UsesAtLevel[]
  /** How at_level rows are interpreted (default tier). */
  atLevelMode?: "tier" | "multiply_level"
  /** @deprecated — use recharges */
  recharge?: RestType | null
  recharges?: RechargeRule[]
  dieCount?: number
  dieType?: "d4" | "d6" | "d8" | "d10" | "d12" | "d20" | null
  /**
   * Restore uses when rolling initiative. true = full pool; number = partial restore.
   * Used by homebrew resources such as Relentless (regain all Exploit Dice).
   */
  rechargeOnInitiative?: boolean | number
  /**
   * At this character level and above, activations do not consume uses from this pool
   * (e.g. Martial Superiority-style free exploits).
   */
  freeUseAfterLevel?: number
  /** Spend a spell slot (no action) to restore uses from this pool. */
  restoreBySpellSlot?: { minSpellLevel: number; restores: number }
  /** Spend a class resource (no action) to restore uses from this pool. */
  restoreByResource?: { resourceKey: string; resourceAmount?: number; restores: number }
}

export interface CustomAbility {
  id: string
  name: string
  description: string | null
  prerequisites: string | null
  characteristics: import("@/lib/compendium/characteristic-modifiers").CharacteristicModifier[] | null
  modifier_catalog?: import("@/lib/compendium/modifier-catalog").ModifierCatalogEntry[] | null
  modifierRefs?: string[] | null
  is_system?: boolean
  attached_to_type: string | null
  attached_to_id: string | null
  /** @deprecated Use a "uses" entry in characteristics instead */
  uses: UsesConfig | null
  show_in_builder: boolean
  icon: string | null
  accent_color?: string | null
  card_image_url?: string | null
  source: string
  creator_url: string | null
  created_at: string
  updated_at: string
}

export interface Background {
  id: string
  name: string
  description: string | null
  ability_bonuses: Record<string, number> | null
  skill_proficiencies: string[] | null
  tool_proficiencies: string[] | null
  /** Tools, vehicles, weapons, armor, and languages granted by this background. */
  proficiencies: BackgroundProficiencies | null
  feat_granted: string | null
  starting_gold: number | null
  starting_equipment: { name: string; quantity: number }[] | null
  starting_equipment_groups: StartingEquipmentGroup[] | null
  equipment: unknown  // legacy field
  feature: {
    name: string
    description: string
    modifierRefs?: string[]
    linkedModifiers?: LinkedModifierInstance[]
  } | null
  grants_spells?: boolean
  granted_spells?: Record<string, string[]> | null
  icon: string | null
  accent_color?: string | null
  card_image_url?: string | null
  source: string
  creator_url: string | null
  created_at: string
}

export interface Spell {
  id: string
  name: string
  level: number
  school: string
  casting_time: string | null
  range: string | null
  components: string[] | null
  material: string | null
  duration: string | null
  concentration: boolean
  ritual: boolean
  description: string | null
  higher_levels: string | null
  classes: string[] | null
  icon: string | null
  accent_color?: string | null
  card_image_url?: string | null
  source: string
  creator_url: string | null
  created_at: string
}

export interface Feat {
  id: string
  name: string
  description: string | null
  category: string | null  // "Origin" | "General" | "Fighting Style" | "Epic Boon"
  level_requirement: number | null
  prerequisite: string | null  // legacy field
  prerequisite_feat_ids: string[] | null
  prerequisite_class_ids: string[] | null
  prerequisite_species_ids: string[] | null
  prerequisite_background_ids: string[] | null
  benefits: import("@/lib/compendium/characteristic-modifiers").CharacteristicModifier[] | null
  /** References into the Common Modifier Effects catalog (merged with benefits in builder). */
  modifierRefs?: string[] | null
  linkedModifiers?: LinkedModifierInstance[] | null
  /** When true, player picks from choices.options instead of top-level linked modifiers. */
  isChoice?: boolean
  choices?: FeatureChoice
  duration?: FeatureDurationKey | null
  /** When true, the feat may be chosen in more than one milestone slot. */
  repeatable?: boolean
  icon: string | null
  accent_color?: string | null
  card_image_url?: string | null
  source: string
  creator_url: string | null
  created_at: string
}

export interface Equipment {
  id: string
  name: string
  category: string
  subcategory: string | null
  cost: { amount: number; unit: string } | null
  weight: number | null
  properties: string[] | null
  description: string | null
  // Armor-specific fields
  armor_class?: number | null
  stealth_disadvantage?: boolean
  // Weapon-specific fields
  damage?: string | null // e.g. "1d8"
  damage_type?: string | null // e.g. "slashing", "piercing", "bludgeoning"
  range?: string | null // e.g. "5 ft" or "80/320 ft"
  mastery?: string | null // e.g. "Cleave", "Graze"
  // Attached abilities (for finesse, two-handed, etc.)
  attached_ability_ids?: string[]
  icon: string | null
  accent_color?: string | null
  card_image_url?: string | null
  source: string
  creator_url: string | null
  created_at: string
}

export interface Character {
  id: string
  local_id: string | null
  name: string
  level: number
  experience: number
  class_id: string | null
  subclass_id: string | null
  /** Full multiclass level breakdown (persisted JSON + MySQL join rows). */
  character_classes?: import("@/lib/character/character-classes").CharacterClassRow[] | null
  /** Order classes were added in the builder (primary = first unless reordered). */
  class_add_order?: string[] | null
  species_id: string | null
  background_id: string | null
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  alignment: string | null
  personality_traits: string | null
  ideals: string | null
  bonds: string | null
  flaws: string | null
  backstory: string | null
  appearance: Record<string, string> | null
  portrait_url: string | null
  banner_url: string | null
  asi_allocations: Record<string, Partial<Record<string, number>>> | null
  proficiency_bonus: number
  hit_points: number | null
  hit_point_max: number | null
  armor_class: number | null
  initiative: number | null
  speed: number | null
  skill_proficiencies: string[] | null
  skill_expertise: string[] | null
  tool_proficiencies: string[] | null
  weapon_proficiencies: string[] | null
  armor_proficiencies: string[] | null
  languages: string[] | null
  equipment_ids: string[]
  gold?: number | null
  equipped_armor_id?: string | null
  equipped_shield_id?: string | null
  equipped_weapon_id?: string | null
  spell_ids: string[]
  feat_ids: string[]
  feat_choice_picks?: Record<string, string[]> | null
  modifier_player_picks?: Record<string, string[]> | null
  created_at: string
  updated_at: string
}

export interface CharacterDraft {
  name: string
  level: number
  class_id: string | null
  subclass_id?: string | null
  species_id: string | null
  background_id: string | null
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
  alignment?: string
  personality_traits: string
  ideals: string
  bonds: string
  flaws: string
  backstory: string
  appearance?: Record<string, string>
  portrait_url: string | null
  banner_url?: string | null
  asi_allocations?: Record<string, Partial<Record<string, number>>> | null
  skill_proficiencies: string[]
  tool_proficiencies?: string[]
  weapon_proficiencies?: string[]
  armor_proficiencies?: string[]
  languages: string[]
  equipment_ids: string[]
  gold?: number
  spell_ids: string[]
  feat_ids?: string[]
}
