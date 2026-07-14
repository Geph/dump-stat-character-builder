/**
 * BYO / import AI prompt index for Common Modifier auto-wiring.
 *
 * When adding a new phrase rule in detect-feature-modifier-rules.ts or a name rule
 * in FEATURE_NAME_MODIFIER_RULES, add a matching entry here. Tests enforce coverage.
 */
import { FEAT_PICK_CATEGORIES } from "@/lib/compendium/class-feature-metadata"
import {
  FEATURE_MODIFIER_RULES,
  FEATURE_NAME_MODIFIER_RULES,
} from "@/lib/import/detect-feature-modifier-rules"

/** Characteristic / effect kinds BYO LLM may emit in mechanics[] (subset of the Common Modifier catalog). */
export const AI_MECHANIC_KINDS = [
  "skills",
  "tool_proficiencies",
  "armor_proficiencies",
  "weapon_proficiencies",
  "saving_throws",
  "languages",
  "spells_known",
  "ac",
  "hit_points",
  "attack_roll_modifiers",
  "damage_roll_modifiers",
  "damage_resistance",
  "condition_immunity",
  "speed",
  "vision",
  "uses",
  "check_roll_modifier",
  "extra_attack",
  "grant_feat",
  "spellcasting_ability",
  "attunement_slots",
  "skill_check_alternate_ability",
  "saving_throw_alternate_ability",
  "forced_save_ability_remap",
  "weapon_ability_override",
  "turn_start_resource_restore",
  "turn_start_bonus_grant",
  "turn_start_trigger",
  "on_hit_trigger",
  "resource_ability_menu",
  "unarmed_strike_damage",
  "initiative",
  "telepathy",
  "temporary_hit_points",
  "weapon_reach_modifier",
  "extra_weapon_mastery",
  "damage_reduction",
  "movement_grant",
] as const

/**
 * Catalog suffixes that appear in the INDEX but intentionally have no mechanics[].kind
 * (ASI pool phrases, movement options, pickers, etc.). Everything else with a concrete
 * cat_char_* / cat_fx_* suffix must declare mechanicsKind in AI_MECHANIC_KINDS.
 */
export const AI_MECHANICS_NARRATIVE_CATALOG_SUFFIXES = new Set([
  "ability_scores",
  "movement_option",
  "feature_option_picker",
  "*",
])

export type WiringTrigger = "description" | "feature_name" | "mechanics" | "srd_preset_name"

export type ModifierWiringEntry = {
  ruleId: string
  trigger: WiringTrigger
  catalog: string
  /** Example phrasing or exact feature name — preserve in source JSON descriptions. */
  examples: string[]
  mechanicsKind?: (typeof AI_MECHANIC_KINDS)[number]
  notes?: string
}

const FEAT_CATEGORIES_FOR_IMPORT = FEAT_PICK_CATEGORIES.filter((category) =>
  ["Origin", "General", "Fighting Style", "Epic Boon", "Planar Pact", "Metamagic", "Mystic Technique", "Eldritch Invocation"].includes(
    category,
  ),
)

/** Description-phrase rules — must cover every FEATURE_MODIFIER_RULES id. */
export const DESCRIPTION_PHRASE_WIRING: ModifierWiringEntry[] = [
  {
    ruleId: "proficiency.skills.list",
    trigger: "description",
    catalog: "cat_char_skills",
    examples: [
      "You gain proficiency in Stealth and Perception",
      "You are proficient in Athletics",
    ],
    mechanicsKind: "skills",
  },
  {
    ruleId: "proficiency.skills.choice",
    trigger: "description",
    catalog: "cat_char_skills",
    examples: ["proficiency in two skills of your choice", "proficiency in one skill"],
    mechanicsKind: "skills",
    notes: "Use choiceCount in mechanics[] when count is explicit.",
  },
  {
    ruleId: "proficiency.expertise",
    trigger: "description",
    catalog: "cat_char_skills",
    examples: ["expertise in Stealth", "expertise in Thieves' Tools checks"],
    mechanicsKind: "skills",
    notes: "Set grantExpertise: true in mechanics[].",
  },
  {
    ruleId: "proficiency.tools",
    trigger: "description",
    catalog: "cat_char_tool_proficiencies",
    examples: ["proficiency with smith's tools", "proficiency with thieves' tools"],
    mechanicsKind: "tool_proficiencies",
  },
  {
    ruleId: "proficiency.tools.expertise",
    trigger: "description",
    catalog: "cat_char_tool_proficiencies",
    examples: [
      "your proficiency bonus is doubled for any ability check you make that uses any of the tool proficiencies you gained from this class",
    ],
    mechanicsKind: "tool_proficiencies",
    notes: "grantExpertise: true on class tools (empty tools[] = all class-granted tools).",
  },
  {
    ruleId: "attunement.slots.total",
    trigger: "description",
    catalog: "cat_char_attunement_slots",
    examples: [
      "you can attune to up to four magic items at once",
      "you can now attune to up to five magic items",
    ],
    mechanicsKind: "attunement_slots",
    notes: "attunementTotal N sets totalSlots (not bonusSlots).",
  },
  {
    ruleId: "proficiency.weapons.martial",
    trigger: "description",
    catalog: "cat_char_weapon_proficiencies",
    examples: ["proficiency with martial weapons"],
    mechanicsKind: "weapon_proficiencies",
    notes: 'weaponMode: "martial_weapons"',
  },
  {
    ruleId: "proficiency.armor.heavy",
    trigger: "description",
    catalog: "cat_char_armor_proficiencies",
    examples: ["proficiency with heavy armor"],
    mechanicsKind: "armor_proficiencies",
  },
  {
    ruleId: "proficiency.armor.medium",
    trigger: "description",
    catalog: "cat_char_armor_proficiencies",
    examples: ["proficiency with medium armor"],
    mechanicsKind: "armor_proficiencies",
  },
  {
    ruleId: "proficiency.armor.shields",
    trigger: "description",
    catalog: "cat_char_armor_proficiencies",
    examples: ["proficiency with shields"],
    mechanicsKind: "armor_proficiencies",
  },
  {
    ruleId: "proficiency.saves",
    trigger: "description",
    catalog: "cat_char_saving_throws",
    examples: ["proficiency in Strength saving throws"],
    mechanicsKind: "saving_throws",
  },
  {
    ruleId: "ac.unarmored.ability",
    trigger: "description",
    catalog: "cat_char_ac",
    examples: [
      "your AC equals 10 + your Dexterity modifier + your Wisdom modifier",
      "AC equals 13 + your Dexterity modifier",
    ],
    mechanicsKind: "ac",
    notes: "acBase + acAbilities[]",
  },
  {
    ruleId: "ac.unarmored.ten",
    trigger: "description",
    catalog: "cat_char_ac",
    examples: ["AC equals 10 + your Dexterity modifier + your Constitution modifier"],
    mechanicsKind: "ac",
  },
  {
    ruleId: "ac.flat_bonus",
    trigger: "description",
    catalog: "cat_char_ac",
    examples: [
      "+1 bonus to your AC while wearing medium armor",
      "gain a +2 bonus to AC",
    ],
    mechanicsKind: "ac",
    notes: "acFlatBonus when not a full formula.",
  },
  {
    ruleId: "hp.per_level",
    trigger: "description",
    catalog: "cat_char_hit_points",
    examples: ["hit point maximum increases by 1"],
    mechanicsKind: "hit_points",
  },
  {
    ruleId: "hp.per_level.alt",
    trigger: "description",
    catalog: "cat_char_hit_points",
    examples: ["+1 hit points per level", "+2 hit points per character level"],
    mechanicsKind: "hit_points",
  },
  {
    ruleId: "attack.bonus.all",
    trigger: "description",
    catalog: "cat_char_attack_roll_modifiers",
    examples: ["+2 bonus to attack rolls", "+2 bonus to attack rolls with ranged weapons"],
    mechanicsKind: "attack_roll_modifiers",
    notes: 'attackTarget from "with ranged/melee weapons"; ignoreHalfCover when "ignore half-cover" appears',
  },
  {
    ruleId: "attack.bonus.ranged",
    trigger: "description",
    catalog: "cat_char_attack_roll_modifiers",
    examples: ["+2 bonus to attack rolls with ranged weapons"],
    mechanicsKind: "attack_roll_modifiers",
    notes: 'attackTarget: "ranged"',
  },
  {
    ruleId: "attack.bonus.melee",
    trigger: "description",
    catalog: "cat_char_attack_roll_modifiers",
    examples: ["+2 bonus to melee attack rolls"],
    mechanicsKind: "attack_roll_modifiers",
    notes: 'attackTarget: "melee"',
  },
  {
    ruleId: "attack.critical.scaling",
    trigger: "description",
    catalog: "cat_char_attack_roll_modifiers",
    examples: [
      "Your attack rolls with Ranged weapons can score a Critical Hit on a roll of 19 or 20 on the d20.",
      "At level 9, your attack rolls with Ranged weapons score a Critical Hit on a roll of 18–20.",
      "Your weapon attacks score a critical hit on a roll of 19 or 20. At 15th level, this critical hit range increases again.",
    ],
    mechanicsKind: "attack_roll_modifiers",
    notes: "criticalHitMinimum + criticalHitMinimumByLevel on attack target entry",
  },
  {
    ruleId: "damage.rider.dice",
    trigger: "description",
    catalog: "cat_char_damage_roll_modifiers",
    examples: ["deal an extra 1d6 fire damage"],
    mechanicsKind: "damage_roll_modifiers",
    notes: 'bonusDice: "1d6", damageType: "fire"',
  },
  {
    ruleId: "damage.weapon.ability_modifier",
    trigger: "description",
    catalog: "cat_char_damage_roll_modifiers",
    examples: [
      "When you deal damage with a Ranged weapon that doesn't add your ability modifier to the roll, you add your ability modifier nonetheless. If you already add your modifier to the damage roll, the target takes an extra 1d8 damage of the weapon's type.",
    ],
    mechanicsKind: "damage_roll_modifiers",
    notes: "grantAbilityModifierWhenMissing + bonusDiceWhenModifierIncluded on weapon target",
  },
  {
    ruleId: "damage.crit.bonus",
    trigger: "description",
    catalog: "cat_char_bonus_damage_riders",
    examples: [
      "Whenever you score a critical hit with a weapon attack you deal bonus damage equal to your Fighter level.",
    ],
    mechanicsKind: "on_hit_trigger",
    notes:
      'Use on_hit_trigger with triggerOn: "crit" + automaticBonus / bonusDice (bonus_damage_riders catalog). Once-per-turn riders like Divine Fury also use on_hit_trigger.',
  },
  {
    ruleId: "damage.crit.maximize",
    trigger: "description",
    catalog: "cat_char_on_hit_trigger",
    examples: [
      "At 15th level, when you score a critical hit with a weapon attack, you can maximize the damage instead of rolling.",
    ],
    mechanicsKind: "on_hit_trigger",
    notes: 'triggerOn: "crit", maximizeWeaponDamage: true, maximizeWeaponDamageAtLevel',
  },
  {
    ruleId: "check.bonus.resource_die",
    trigger: "description",
    catalog: "cat_fx_check_roll_modifier",
    examples: [
      "whenever you are forced to make an Intelligence, Wisdom, or Charisma saving throw you gain a bonus to the roll equal to your Exploit Die",
      "whenever you are forced to make an Intelligence, Wisdom, or Charisma saving throw, you gain a bonus to your roll equal to your Exploit Die",
    ],
    mechanicsKind: "check_roll_modifier",
    notes:
      'bonusConfig: { mode: "die", dieScaling: "class_resource", classResourceKey }. Also use for damage rolls (checkCategory omitted / damageDiceFromResourceDie) and multi-beneficiary rolls: targets self|self_and_allies_in_range|chosen_creatures (rangeFeet when not self). Example: roll Bardic Inspiration die for Initiative for you and nearby allies — does not expend the die unless the prose says so.',
  },
  {
    ruleId: "resource.free_use_on_roll",
    trigger: "description",
    catalog: "cat_char_resource_ability_menu",
    examples: [
      "you can use feat of strength or heroic fortitude without expending an Exploit Die",
    ],
    mechanicsKind: "resource_ability_menu",
    notes: "waiveResourceCost: true, appliesOnRollKinds, appliesOnAbilities, menu options",
  },
  {
    ruleId: "resource.expend_psi_points",
    trigger: "description",
    catalog: "cat_char_uses",
    examples: ["expend 2 psi points to activate this discipline"],
    mechanicsKind: "uses",
    notes: 'classResourceKey: "psi_points", classResourceCost from match',
  },
  {
    ruleId: "heal.turn_start_low_hp",
    trigger: "description",
    catalog: "cat_char_turn_start_trigger",
    examples: [
      "If you begin your turn with less than half of your hit points remaining, but at least 1 hit point, you regain hit points equal to 5 + your Constitution modifier.",
    ],
    mechanicsKind: "turn_start_trigger",
    notes:
      "Prefer turn_start_trigger for general turn-start effects (heal, grant temp HP, nested effects). hpBelowFraction: 0.5 for low-HP gate.",
  },
  {
    ruleId: "resource.turn_start_regain_ki",
    trigger: "description",
    catalog: "cat_char_turn_start_trigger",
    examples: [
      "regain 1 Ki at the start of each of your turns in combat, so long as you are not Incapacitated",
    ],
    mechanicsKind: "turn_start_resource_restore",
    notes:
      "Narrow restore kind when the effect ONLY refills a pool; otherwise use turn_start_trigger. blockedByConditions when Incapacitated mentioned.",
  },
  {
    ruleId: "resource.turn_start_regain_pool",
    trigger: "description",
    catalog: "cat_char_turn_start_trigger",
    examples: [
      "regain 1 Psi Die at the start of each of your turns",
      "regain 1 psionic energy die at the start of each of your turns",
    ],
    notes: "Generalized turn-start restore for Psi Dice / Focus / Sorcery Points",
    mechanicsKind: "turn_start_resource_restore",
  },
  {
    ruleId: "technique.on_hit_once_per_turn",
    trigger: "description",
    catalog: "cat_char_on_hit_trigger",
    examples: [
      "once per turn when you hit a creature with an attack, you can spend 1 Ki to deal extra damage",
      "the first creature you hit on each of your turns while your Rage is active takes extra damage equal to 1d6 plus half your Barbarian level",
    ],
    mechanicsKind: "on_hit_trigger",
    notes:
      "oncePerTurn: true; optional spendResourceKey; bonusDice / scalingMode / damageTypeOptions for riders like Divine Fury",
  },
  {
    ruleId: "check.advantage.initiative",
    trigger: "description",
    catalog: "cat_fx_check_roll_modifier",
    examples: ["You have Advantage on Initiative rolls", "advantage on initiative"],
    mechanicsKind: "check_roll_modifier",
    notes: 'checkCategory: "initiative"',
  },
  {
    ruleId: "check.bonus.initiative.ability",
    trigger: "description",
    catalog: "cat_char_initiative",
    examples: [
      "You gain a bonus to Initiative rolls equal to your Charisma modifier (minimum bonus of +1).",
    ],
    mechanicsKind: "initiative",
    notes: 'mode: "ability_modifier"',
  },
  {
    ruleId: "check.advantage.attack.ranged",
    trigger: "description",
    catalog: "cat_fx_check_roll_modifier",
    examples: ["advantage on ranged weapon attack rolls"],
    mechanicsKind: "check_roll_modifier",
    notes: 'checkCategory: "attack"',
  },
  {
    ruleId: "check.advantage.attack.melee",
    trigger: "description",
    catalog: "cat_fx_check_roll_modifier",
    examples: ["advantage on melee attack rolls"],
    mechanicsKind: "check_roll_modifier",
  },
  {
    ruleId: "check.advantage.attack",
    trigger: "description",
    catalog: "cat_fx_check_roll_modifier",
    examples: ["advantage on attack rolls"],
    mechanicsKind: "check_roll_modifier",
  },
  {
    ruleId: "check.advantage.ability",
    trigger: "description",
    catalog: "cat_fx_check_roll_modifier",
    examples: ["advantage on Charisma checks"],
    mechanicsKind: "check_roll_modifier",
    notes: 'checkCategory: "ability"',
  },
  {
    ruleId: "check.advantage.track",
    trigger: "description",
    catalog: "cat_fx_check_roll_modifier",
    examples: ["Advantage on ability checks you make to track any creature"],
    mechanicsKind: "check_roll_modifier",
    notes: 'checkCategory: "skill", checkSkills: ["Survival"]',
  },
  {
    ruleId: "save.advantage",
    trigger: "description",
    catalog: "cat_fx_check_roll_modifier",
    examples: ["advantage on Constitution saving throws"],
    mechanicsKind: "check_roll_modifier",
    notes: 'checkCategory: "save"',
  },
  {
    ruleId: "check.advantage.skill",
    trigger: "description",
    catalog: "cat_fx_check_roll_modifier",
    examples: ["advantage on Stealth checks"],
    mechanicsKind: "check_roll_modifier",
    notes: 'checkCategory: "skill", checkSkills: ["Stealth"]',
  },
  {
    ruleId: "check.advantage.skill.ability",
    trigger: "description",
    catalog: "cat_fx_check_roll_modifier",
    examples: ["advantage on Intelligence (Arcana) checks made to understand magical traps"],
    mechanicsKind: "check_roll_modifier",
    notes: 'checkCategory: "skill", checkSkills from parenthetical',
  },
  {
    ruleId: "resistance.damage.except",
    trigger: "description",
    catalog: "cat_char_damage_resistance",
    examples: [
      "Resistance to every damage type except Force, Necrotic, Psychic, and Radiant",
    ],
    mechanicsKind: "damage_resistance",
  },
  {
    ruleId: "resistance.damage",
    trigger: "description",
    catalog: "cat_char_damage_resistance",
    examples: ["resistance to psychic damage", "resistance to fire and cold damage"],
    mechanicsKind: "damage_resistance",
  },
  {
    ruleId: "immunity.condition",
    trigger: "description",
    catalog: "cat_char_condition_immunity",
    examples: ["immune to the charmed condition"],
    mechanicsKind: "condition_immunity",
  },
  {
    ruleId: "speed.walk",
    trigger: "description",
    catalog: "cat_char_speed",
    examples: ["walking speed increases by 10 feet"],
    mechanicsKind: "speed",
    notes: 'speedType: "walk"',
  },
  {
    ruleId: "speed.fly",
    trigger: "description",
    catalog: "cat_char_speed",
    examples: ["fly speed of 30 feet", "a Fly Speed equal to your Speed and can hover"],
    mechanicsKind: "speed",
    notes: 'speedType: "fly"; set canHover: true when the source says you can hover',
  },
  {
    ruleId: "speed.swim",
    trigger: "description",
    catalog: "cat_char_speed",
    examples: ["swim speed of 30 feet"],
    mechanicsKind: "speed",
  },
  {
    ruleId: "speed.climb",
    trigger: "description",
    catalog: "cat_char_speed",
    examples: ["climb speed of 20 feet"],
    mechanicsKind: "speed",
  },
  {
    ruleId: "speed.equal_to_walk",
    trigger: "description",
    catalog: "cat_char_speed",
    examples: [
      "you gain a climbing speed and swimming speed equal to your walking speed",
      "have a Swim Speed equal to your Speed",
    ],
    mechanicsKind: "speed",
    notes: 'mode: "equal_to_walk" for climb/swim/fly',
  },
  {
    ruleId: "sense.telepathy",
    trigger: "description",
    catalog: "cat_char_telepathy",
    examples: ["You have telepathy with a range of 120 feet"],
    mechanicsKind: "telepathy",
  },
  {
    ruleId: "vision.darkvision",
    trigger: "description",
    catalog: "cat_char_vision",
    examples: ["darkvision within 60 feet"],
    mechanicsKind: "vision",
  },
  {
    ruleId: "attack.extra",
    trigger: "description",
    catalog: "cat_fx_extra_attack",
    examples: ["attack twice whenever you take the Attack action"],
    mechanicsKind: "extra_attack",
  },
  {
    ruleId: "uses.once_short_long_rest",
    trigger: "description",
    catalog: "cat_char_uses",
    examples: [
      "once per short or long rest",
      "you must finish a short or long rest before you can use this feature again",
      "After you do so, you must finish a short or long rest before you can use it again",
    ],
    mechanicsKind: "uses",
    notes: 'usesFixed: 1, usesRecharge: "both"',
  },
  {
    ruleId: "uses.item_charges",
    trigger: "description",
    catalog: "cat_char_uses",
    examples: [
      "This amulet has 3 charges and regains 1d3 expended charges daily at dawn",
      "This ring has 3 charges, regaining all expended charges when you finish a long rest",
    ],
    mechanicsKind: "uses",
    notes: "fixed charge pool; use specialDescription for dawn or partial recharge wording",
  },
  {
    ruleId: "uses.fixed_rest",
    trigger: "description",
    catalog: "cat_char_uses",
    examples: [
      "use this feature 3 times, regaining all expended uses when you finish a long rest",
    ],
    mechanicsKind: "uses",
  },
  {
    ruleId: "uses.ability_modifier",
    trigger: "description",
    catalog: "cat_char_uses",
    examples: ["a number of times equal to your Wisdom modifier (minimum once)"],
    mechanicsKind: "uses",
    notes: 'usesAbility: "WIS"',
  },
  {
    ruleId: "uses.proficiency",
    trigger: "description",
    catalog: "cat_char_uses",
    examples: [
      "a number of times equal to your proficiency bonus, regaining all uses on a long rest",
    ],
    mechanicsKind: "uses",
  },
  {
    ruleId: "language.known",
    trigger: "description",
    catalog: "cat_char_languages",
    examples: ["You know Sylvan", "You know Common and Elvish"],
    mechanicsKind: "languages",
    notes: 'languages: ["Sylvan"] for fixed grants.',
  },
  {
    ruleId: "language.choice",
    trigger: "description",
    catalog: "cat_char_languages",
    examples: ["learn two languages of your choice"],
    mechanicsKind: "languages",
    notes: "languageChoiceCount N; choicePool standard | standard_and_rare",
  },
  {
    ruleId: "language.choice.tables",
    trigger: "description",
    catalog: "cat_char_languages",
    examples: ["learn one language of your choice from the language tables in the Player's Handbook"],
    mechanicsKind: "languages",
    notes: "languageChoiceCount 1; choicePool standard",
  },
  {
    ruleId: "spell.know_cantrip",
    trigger: "description",
    catalog: "cat_char_spells_known",
    examples: ["You know the Druidcraft cantrip"],
    mechanicsKind: "spells_known",
    notes: 'spellNames: ["Druidcraft"]',
  },
  {
    ruleId: "spell.can_cast_named",
    trigger: "description",
    catalog: "cat_char_spells_known",
    examples: [
      "You can cast the Beast Sense and Speak with Animals spells but only as Rituals",
      "You can cast the Commune with Nature spell but only as a Ritual",
    ],
    mechanicsKind: "spells_known",
    notes: 'spellNames + castAsRitual: true when "only as Ritual(s)"; castingAbility from companion sentence',
  },
  {
    ruleId: "spell.cantrip.choice",
    trigger: "description",
    catalog: "cat_char_spells_known",
    examples: ["learn one other cantrip of your choice from the Divination or Enchantment school of magic"],
    mechanicsKind: "spells_known",
    notes: "spellChoiceGrants: [{ level: 0, count: 1 }]; spellChoiceLabel for school filters",
  },
  {
    ruleId: "spell.always_prepared",
    trigger: "description",
    catalog: "cat_char_spells_known",
    examples: ["You always have the Detect Magic spell prepared"],
    mechanicsKind: "spells_known",
    notes: "alwaysPrepared: true",
  },
  {
    ruleId: "spell.at_will_no_slot",
    trigger: "description",
    catalog: "cat_char_uses",
    examples: ["You can cast it without a spell slot"],
    mechanicsKind: "uses",
    notes: 'uses: { type: "unlimited" }',
  },
  {
    ruleId: "grant.fighting_style",
    trigger: "description",
    catalog: "cat_char_grant_feat",
    examples: ["You gain a Fighting Style feat of your choice"],
    mechanicsKind: "grant_feat",
    notes: 'featCategories: ["Fighting Style"] — do NOT use isChoice.',
  },
  {
    ruleId: "grant.fighting_style_feat",
    trigger: "description",
    catalog: "cat_char_grant_feat",
    examples: ["Fighting Style feat of your choice"],
    mechanicsKind: "grant_feat",
  },
  {
    ruleId: "grant.epic_boon",
    trigger: "description",
    catalog: "cat_char_grant_feat",
    examples: ["You gain an Epic Boon feat of your choice"],
    mechanicsKind: "grant_feat",
    notes: 'featCategories: ["Epic Boon"]',
  },
  {
    ruleId: "grant.origin_feat",
    trigger: "description",
    catalog: "cat_char_grant_feat",
    examples: ["You gain an Origin feat"],
    mechanicsKind: "grant_feat",
  },
  {
    ruleId: "grant.general_feat",
    trigger: "description",
    catalog: "cat_char_grant_feat",
    examples: ["choose a general feat of your choice", "gain one feat of your choice"],
    mechanicsKind: "grant_feat",
    notes: 'featCategories: ["General"]',
  },
  {
    ruleId: "grant.asi_classic",
    trigger: "description",
    catalog: "cat_char_ability_scores",
    examples: [
      "increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1",
    ],
    notes: "mode: asi_pool, points: 2 — overrides grant.asi_by_name when description disagrees",
  },
  {
    ruleId: "grant.asi_2024",
    trigger: "description",
    catalog: "cat_char_grant_feat",
    examples: [
      "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify",
    ],
    mechanicsKind: "grant_feat",
    notes: 'featCategories: ["General"] — explicit 2024 ASI phrasing',
  },
  {
    ruleId: "ac.bonus.while_armored",
    trigger: "description",
    catalog: "cat_char_ac",
    examples: ["+1 AC while wearing armor"],
    mechanicsKind: "ac",
    notes: "Sets requiresArmor on flat AC bonus.",
  },
  {
    ruleId: "ac.bonus.while_raging",
    trigger: "description",
    catalog: "cat_char_ac",
    examples: ["+1 AC while raging"],
    mechanicsKind: "ac",
    notes: "Requires sheet Rage toggle (requiresSheetToggle: while_raging).",
  },
  {
    ruleId: "action.bonus.dash_disengage.while_raging",
    trigger: "description",
    catalog: "cat_fx_movement_option",
    examples: [
      "take the Disengage and Dash actions as part of that Bonus Action",
      "While your Rage is active, you can take a Bonus Action to take both of those actions",
    ],
    notes:
      "Bonus Action activation with while_raging requirement; single sheet action (not separate Dash/Disengage cards).",
  },
  {
    ruleId: "damage.scaling.die_by_level",
    trigger: "description",
    catalog: "cat_char_unarmed_strike_damage",
    examples: ["at 3rd level the die becomes 1d8", "at 5th level ... 2d6"],
    mechanicsKind: "unarmed_strike_damage",
    notes: "Parses multiple at-level die tiers into dieByLevel.",
  },
  {
    ruleId: "defensive.evasion",
    trigger: "description",
    catalog: "cat_fx_damage_reduction",
    examples: [
      "When you're subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage if you succeed on the saving throw and only half damage if you fail",
    ],
    notes:
      'mode: "evasion" (no damage on Dex save success, half on fail). NOT saving_throw_trigger — that is for reactive abilities. Renamed reskins (Leading Evasion): set basedOnSrdFeature: "Evasion".',
    mechanicsKind: "damage_reduction",
  },
  {
    ruleId: "defensive.flat_damage_reduction",
    trigger: "description",
    catalog: "cat_char_damage_reduction",
    examples: ["you can reduce the damage taken by 2"],
    mechanicsKind: "damage_reduction",
    notes:
      'mode: "flat"; reductionAmount N; damageTypes optional (default B/P/S). Requires a numeric amount — phrasing like "reduce the damage by the amount rolled" is intentionally ignored.',
  },
  {
    ruleId: "spellcasting.ability",
    trigger: "description",
    catalog: "cat_char_spellcasting_ability",
    examples: [
      "Intelligence, Wisdom, or Charisma is your spellcasting ability for these spells (choose when you select this feat)",
      "Intelligence is your spellcasting ability for your Investigator spells",
      "Wisdom is your spellcasting ability for this spell",
    ],
    mechanicsKind: "spellcasting_ability",
    notes: "spellcastingAbility: intelligence | wisdom | charisma",
  },
  {
    ruleId: "damage.creature_type",
    trigger: "description",
    catalog: "cat_char_damage_roll_modifiers",
    examples: [
      "when you hit an Aberration with this weapon, the Aberration takes an extra 2d10 Radiant damage",
    ],
    mechanicsKind: "damage_roll_modifiers",
    notes: "bonusDice + damageType + targetCreatureTypes",
  },
  {
    ruleId: "toggle.conditional_grant",
    trigger: "description",
    catalog: "cat_char_*",
    examples: [
      "it can choose to grant you the following benefits",
      "while raging",
      "while below half hit points",
      "while in this form",
    ],
    notes:
      'requiresSheetToggle on mechanics[] — use a standard key (while_raging, etc.) OR a key declared once under new_toggles on the class/subclass. Never invent a one-off toggle key inside a single feature without declaring it.',
  },
]

/** Feature-name rules — must cover every FEATURE_NAME_MODIFIER_RULES id. */
export const FEATURE_NAME_WIRING: ModifierWiringEntry[] = [
  {
    ruleId: "grant.asi_by_name",
    trigger: "feature_name",
    catalog: "cat_char_grant_feat",
    examples: ["Ability Score Improvement"],
    mechanicsKind: "grant_feat",
    notes: 'Wires at levels 4/8/12/16 even when description is blank (class table rows). featCategories: ["General"]',
  },
  {
    ruleId: "grant.epic_boon_by_name",
    trigger: "feature_name",
    catalog: "cat_char_grant_feat",
    examples: ["Epic Boon"],
    mechanicsKind: "grant_feat",
  },
  {
    ruleId: "grant.fighting_style_by_name",
    trigger: "feature_name",
    catalog: "cat_char_grant_feat",
    examples: ["Fighting Style"],
    mechanicsKind: "grant_feat",
    notes: "Class milestone row — still include full rules text in description when available.",
  },
  {
    ruleId: "defensive.evasion_by_name",
    trigger: "feature_name",
    catalog: "cat_fx_damage_reduction",
    examples: ["Evasion"],
    mechanicsKind: "damage_reduction",
    notes:
      'Exact name "Evasion". Renamed reskins: basedOnSrdFeature: "Evasion" + mechanics damage_reduction mode evasion when party-sharing / extra gates differ.',
  },
  {
    ruleId: "weapon.mastery_by_name",
    trigger: "feature_name",
    catalog: "cat_char_feature_option_picker",
    examples: ["Weapon Mastery"],
    notes:
      "Wire tier table via choices.choiceCountByLevel on the Weapon Mastery feature (not class_resources). Property names and rules come from the Weapon Mastery Properties system catalog (custom_abilities …0004), with SRD defaults as fallback.",
  },
]

/**
 * SRD-standard feature names that auto-wire on import when spelled exactly
 * (via wildcard presets). Prefer these names for equivalent homebrew features.
 */
export const SRD_PRESET_FEATURE_NAMES = [
  "Ability Score Improvement",
  "Epic Boon",
  "Fighting Style",
  "Weapon Mastery",
  "Evasion",
  "Expertise",
  "Extra Attack",
  "Second Wind",
  "Action Surge",
  "Indomitable",
  "Sneak Attack",
  "Cunning Action",
  "Uncanny Dodge",
  "Rage",
  "Wild Shape",
  "Channel Divinity",
  "Bardic Inspiration",
  "Lay On Hands",
  "Metamagic",
  "Eldritch Invocations",
  "Hunter's Prey",
  "Defensive Tactics",
  "Danger Sense",
  "Fast Movement",
  "Martial Arts",
  "Mystic Techniques",
  "Improved Critical",
  "Tactical Master",
] as const

/** Patterns from homebrew imports (Gunslinger, point-pool casters, Alternate Fighter, Dancer). */
export const HOMEBREW_WIRING_PATTERNS = [
  {
    source: "Barbarian subclasses (World Tree / Zealot patterns)",
    guidance: [
      "Once-per-turn Rage riders (Divine Fury): mechanics kind on_hit_trigger with oncePerTurn, bonusDice, scalingMode half_character_level_round_down, damageTypeOptions when the type is chosen at use, requiresSheetToggle while_raging.",
      "Temp HP on Rage (Vitality Surge) or turn-start ally THP (Life-Giving Force): temporary_hit_points with amountScaling / amountDice, thpTrigger, and thpTarget.",
      "Spend Rage to refresh a long-rest feature early (Zealous Presence): uses + alternateRefresh { spendResourceKey: \"rage\", spendAmount: 1, actionCost: \"none\" }.",
      "Once per active Rage (Fanatical Focus): usesRecharge on_resource_reactivation + gatingResourceKey \"rage\".",
      "Subclass-only dice pools with no table name (Warrior of the Gods): class_resources with subclass_name + name derived from the feature (\"Warrior of the Gods Dice\").",
      "Transformation forms (Rage of the Gods): declare new_toggles once on the subclass, then gate flight/resistance/reactions with requiresSheetToggle.",
      "Extra Weapon Mastery property alongside the normal one (Battering Roots): extra_weapon_mastery; +reach on Heavy/Versatile: weapon_reach_modifier.",
    ],
  },
  {
    source: "Bard colleges (Dance / Glamour patterns)",
    guidance: [
      "Renamed SRD features (Leading Evasion ≈ Evasion): set basedOnSrdFeature: \"Evasion\" so name-based auto-wire applies; put party-sharing / extra gates in description and/or mechanics[].",
      "Beguiling Magic / Mantle of Majesty alternate refresh: ALWAYS wire base usesFixed + usesRecharge from \"Once you use this… until you finish a [rest]\" even when the next sentence adds an early restore — alternateRefresh is additive. Spell-slot restore: alternateRefresh.spendSpellSlotMinLevel (e.g. 3). Resource restore: spendResourceKey + spendAmount (e.g. bardic_inspiration).",
      "Temp HP from Bardic Inspiration die × N (Mantle of Inspiration): temporary_hit_points with amountScaling class_resource_die, classResourceKey bardic_inspiration, amountMultiplier 2, targetCount by Charisma modifier.",
      "Roll class-resource die as damage or multi-target Initiative (Bardic Damage / Tandem Footwork): check_roll_modifier or damage_roll_modifiers with bonusConfig dieScaling class_resource + targets.",
      "Dexterity instead of Strength for Unarmed Strikes: weapon_ability_override (worked example in cheat sheet).",
      "One-off movement without OA (Inspiring Movement / Mantle of Inspiration tail): movement_grant — not speed.",
    ],
  },
  {
    source: "Gunslinger / martial homebrew",
    guidance: [
      "Extract Risk Dice, Weapon Mastery, Exploit Dice, Superiority Dice, etc. as class_resources[] from the level table (resource_key snake_case).",
      "Keep spend phrases in feature descriptions: \"expend 1 risk die\", \"spend 2 exploit dice\" — links limited uses to the pool.",
      "Quick Draw / initiative features: preserve \"Advantage on Initiative rolls\" wording.",
      "Fighting Style milestone: name + \"You gain a Fighting Style feat of your choice\" in description.",
    ],
  },
  {
    source: "Point-pool casters (e.g. Psion)",
    guidance: [
      "Psi Points + Psi Limit as separate class_resources (pool vs per-use cap).",
      "Disciplines / talents: isChoice + choices.options[] for player picks; keep psi costs in each option description.",
      "Distinguish Discipline Talents (nested on the discipline) from Class Talents (ability_role class_talent) — distinct choices.category and resourceKey.",
      "Use import_proposals.custom_abilities for discipline systems needing builder UI.",
      "Ephemeral turn-start free points that expire unused and have spend restrictions: mechanics kind turn_start_bonus_grant (not turn_start_resource_restore).",
    ],
  },
  {
    source: "Alternate Fighter / exploit martials",
    guidance: [
      "Fighting Style options: also add matching feats[] with category \"Fighting Style\".",
      "Split multi-sentence features into full descriptions — e.g. \"+2 ranged attacks\" and \"+1 AC while wearing armor\" wire as separate modifiers from one paragraph.",
      "Action Surge / once-per-rest: \"Once during your turn... finish a short or long rest before you can use this feature again\".",
      "Resource-scaled saves: \"bonus equal to your Exploit Die\" — keep resource name consistent with class_resources.",
    ],
  },
  {
    source: "Dancer / performance classes",
    guidance: [
      "Dance Style / subclass picks: isChoice + choices (not grant_feat).",
      "Bardic-Inspiration-style pools: class_resources + limited-uses phrasing in features.",
    ],
  },
  {
    source: "Captain / battle-dice martials",
    guidance: [
      "Battle Dice column on the class table → class_resources.battle_dice (NdM pool notation, e.g. 2d6 → 3d8).",
      "Maneuver options in abilities[] with \"expend one Battle Die\" — proposed as custom abilities linked to battle_dice.",
      "Cohort feature → companion stat block; wire Weapon Mastery and Fighting Style via standard feature names.",
      "Blitz, Valiant Surge, Legendary Commander stay narrative unless clear passive phrasing is present.",
    ],
  },
] as const

/** Leave narrative-only — do not force mechanics[] unless a clear passive bonus exists. */
export const NARRATIVE_ONLY_GUIDANCE = [
  "Spellcasting progressions and spell-list tables (spells[] / description HTML tables — not modifiers).",
  "Subclass spell-list features (* Spells) — preserve HTML tables in description.",
  "Transformation / polymorph stat blocks (Wild Shape forms, Draconic forms) — descriptive unless a fixed AC/speed bonus is stated in prose.",
  "Social / exploration ribbons without numeric bonuses.",
  "Reaction timing, advantage on specific story checks, or GM-adjudicated effects without standard phrasing.",
  "Reaction rerolls or once-per-long-rest reaction riders (e.g. reroll a low Deception check) — keep in description unless a catalog trigger exists; do NOT map to uses.",
  "Maneuver / discipline / invocation option lists — use isChoice + choices, not grant_feat.",
  "Common Modifiers only cover effects on the character's own sheet — forced saves, conditions, or miss chances imposed on *other* creatures (e.g. attacker Charisma save or miss, Charm/Frighten on a target) always stay narrative. Do not invent mechanics[] kinds for those.",
]

function formatWiringSection(title: string, entries: ModifierWiringEntry[]): string {
  const lines: string[] = [title]
  let lastCatalog = ""
  for (const entry of entries) {
    if (entry.catalog !== lastCatalog) {
      lines.push(`\n[${entry.catalog}]`)
      lastCatalog = entry.catalog
    }
    const example = entry.examples.map((text) => `"${text}"`).join(" | ")
    lines.push(`- ${entry.ruleId}: ${example}`)
    if (entry.notes) lines.push(`  → ${entry.notes}`)
  }
  return lines.join("\n")
}

function formatMechanicsCheatsheet(): string {
  const lines = [
    "mechanics[] field cheat sheet (kind → required fields):",
    `Allowed kind values: ${AI_MECHANIC_KINDS.join(", ")}`,
    "- skills: skills [\"Stealth\"] OR choiceCount N; grantExpertise true/false",
    "- languages: languages [\"Sylvan\"] OR languageChoiceCount N; choicePool standard|standard_and_rare",
    "- spells_known: spellNames [\"Beast Sense\", \"Speak with Animals\"]; castAsRitual true for ritual-only grants; spellChoiceGrants [{ level: 0, count: 1 }]; spellChoiceLabel for filters",
    "- tool_proficiencies: tools [\"Smith's Tools\"]; grantExpertise true for doubled tool checks",
    "- attunement_slots: attunementTotal 4 (sets cap) OR attunementBonus 1 (adds to default 3)",
    "- armor_proficiencies: armor [\"Heavy Armor\", \"Shields\"]",
    "- weapon_proficiencies: weaponMode martial_weapons | simple_weapons",
    "- saving_throws: savingThrows [\"Strength\", \"Constitution\"]",
    "- ac: acBase 10 + acAbilities [\"dexterity\",\"wisdom\"] OR acFlatBonus 1",
    "- hit_points: hpMode per_level, hpValue 1",
    "- attack_roll_modifiers: attackBonus 2, attackTarget all|melee|ranged; criticalHitMinimum; criticalHitMinimumByLevel [{ level, fixed: minD20 }]",
    "- damage_roll_modifiers: bonusDice \"1d6\", damageType \"fire\"; grantAbilityModifierWhenMissing; bonusDiceWhenModifierIncluded \"1d8\"; scalingMode half_character_level_round_down|character_level|none (for \"plus half your Class level\" riders); damageTypeOptions [\"Necrotic\",\"Radiant\"] when the player picks the type at trigger time",
    "- damage_resistance: damageTypes [\"Fire\", \"Psychic\"]",
    "- damage_reduction: reductionMode \"evasion\" (Dex-save half→none/half) OR \"flat\" with reductionAmount N; damageTypes optional for flat (default B/P/S). Kind must be damage_reduction — do not invent other names from cat_fx_damage_reduction / cat_char_damage_reduction.",
    "- condition_immunity: conditions [\"Charmed\"]",
    "- speed: speedType walk|fly|swim|climb, speedFeet 10; canHover true when fly speed allows hovering",
    "- movement_grant: one-off movement (not a permanent speed increase). distanceMode fixed|fraction_of_speed|full_speed; distanceFeet when fixed; fraction 0.5 when half Speed; trigger freeform (e.g. \"bonus_action_spend_bardic\", \"reaction_on_mantle\"); targets self|self_and_chosen_ally|chosen_creatures_in_range; provokesOpportunityAttacks false when the source says it doesn't; optional classResourceKey/cost when spending BI etc.",
    "- vision: visionRangeFeet 60",
    "- telepathy: telepathyRangeFeet 120 (passive telepathic communication range)",
    "- initiative: initiativeMode ability_modifier|flat_bonus|add_proficiency; initiativeAbility charisma (for ability_modifier); initiativeFlatBonus N",
    "- unarmed_strike_damage: dieByLevel [{ level: 3, die: \"1d8\" }, { level: 5, die: \"2d6\" }] — martial-arts-style die ladder",
    "- on_hit_trigger: triggerOn hit|crit; oncePerTurn true/false; bonusDice \"1d6\"; optional automaticBonusMode character_level|half_character_level_round_down; damageType / damageTypeOptions; spendResourceKey + spendResourceAmount; requiresSheetToggle when gated (e.g. while_raging). Use for Divine Fury–style once-per-turn extra damage riders and crit maximize/bonus riders.",
    "- turn_start_trigger: general turn-start effect (heal, grant temp HP via nested text, etc.). Optional hpBelowFraction 0.5, restoreResourceKey/Amount, grantResourceKey/Amount, blockedByConditions. Prefer the narrow kinds below when the effect is ONLY a pool refill or ephemeral bonus grant.",
    "- turn_start_resource_restore: restoreResourceKey \"psionic_energy_dice\"; restoreResourceAmount 1 — refills a spent pool toward its cap (narrow case of turn_start_trigger)",
    "- turn_start_bonus_grant: grantResourceKey \"psi_points\"; grantAmount 2; expiresEndOfTurn true; usageRestriction \"…\" — ephemeral bonus units that do NOT refill the main pool; optional grantAmountByLevel [{ level, amount }]",
    "- resource_ability_menu: classResourceKey (or resourceKey) for the pool; waiveResourceCost true when options can be used free; menuAbilityNames [\"Feat of Strength\", \"Heroic Fortitude\"] when the source lists named options",
    "- temporary_hit_points: amount N OR amountDice \"1d12\" OR amountScaling character_level|class_resource_die|ability_modifier (pair classResourceKey / ability as needed); amountMultiplier 2 when \"two times the number rolled\"; thpTrigger on_activation|turn_start|on_use|on_hit (field name is thpTrigger, not trigger); thpTarget self|chosen_creature_in_range|allies_in_range (field name is thpTarget, not target; rangeFeet when not self); targetCount { mode: \"ability_modifier\", ability: \"charisma\", minimum: 1 } when creature count scales that way; expiresOnTriggerEnd true when THP ends with the gating state",
    "- uses: usesFixed 2, usesRecharge short_rest|long_rest|both|until_item_consumed|on_resource_reactivation; OR usesAbility WIS. ALWAYS wire the base usesFixed/usesRecharge from \"Once you use this… until you finish a [rest]\" even when the next sentence adds an alternate early refresh — alternateRefresh is additive, never a reason to omit the base wire. until_item_consumed = resource locked until a crafted/summoned item from this ability is spent or destroyed. on_resource_reactivation + gatingResourceKey \"rage\" = once per (re)activation of that resource/state (Fanatical Focus). alternateRefresh: { spendResourceKey, spendAmount, actionCost } for resource spends OR { spendSpellSlotMinLevel: 3, actionCost } for \"expend a level 3+ spell slot\".",
    "- uses / check_roll_modifier resource spend caps: classResourceKey + classResourceCostMode fixed (default, use classResourceCost) | up_to_proficiency_bonus | up_to_ability_modifier (pair with classResourceCostAbility). Use when the source caps spend per use by a scaling value — e.g. \"expend Exploit Dice (up to your Proficiency Bonus)\" — not a separate Limit class_resource.",
    "- check_roll_modifier: checkRollMode advantage|disadvantage|bonus; checkCategory save|skill|ability|attack|initiative; checkAbility/checkSkills; conditionNote for non-enforcible qualifiers (\"that involves you dancing\") so imports flag manual review instead of silently over-granting; for class-resource die bonuses use bonusDiceFromResource / classResourceKey + targets self|self_and_allies_in_range|chosen_creatures",
    "- damage_roll_modifiers: bonusDice \"1d6\", damageType \"fire\"; OR die from class resource (classResourceKey + amountScaling class_resource_die) for \"damage equal to a roll of your Bardic Inspiration die\" (note whether the die is expended); plusAbilityModifier true when \"+ your Dexterity modifier\"; targets when allies also benefit",
    "- extra_attack: (no extra fields)",
    `- grant_feat: featCategories ${JSON.stringify(FEAT_CATEGORIES_FOR_IMPORT)}, featCount 1`,
    "- skill_check_alternate_ability: alternateAbility strength|…; alternateSkills [\"Insight\"]; optional requiresSheetToggle",
    "- saving_throw_alternate_ability: alternateAbility intelligence; alternateSaves [\"Wisdom\"]",
    "- forced_save_ability_remap: fromSaveAbility WIS|any; toSaveAbility INT; forcedSaveScope your_features|your_spells|all",
    "- weapon_ability_override: alternateAbility charisma|dexterity; weaponAbilityAppliesTo both|attack|damage; weaponAbilityScope all|melee|ranged|finesse|specific; weaponNames optional. Examples: (1) Charisma for all weapon attacks while transformed; (2) Dexterity instead of Strength for Unarmed Strikes only → alternateAbility \"dexterity\", weaponAbilityAppliesTo \"attack\", weaponAbilityScope \"specific\", weaponNames [\"Unarmed Strike\"]",
    "- weapon_reach_modifier: reachBonusFeet 10; optional weaponPropertyFilter [\"Heavy\", \"Versatile\"] when only some melee weapons gain the reach",
    "- extra_weapon_mastery: masteryProperties [\"Push\", \"Topple\"] — apply these Weapon Mastery properties in addition to the weapon's normal mastery (not the tier-table known-count)",
    "- armor_proficiencies / weapon_proficiencies: list gains in armor[] / weaponMode. Conditional upgrades (\"gain X, or Y instead if you already have X\") stay in description prose only — do not invent a conditionalUpgrade field until the schema supports it.",
    "- spells_known / spellChoiceGrants: spellChoiceGrants[].level is SPELL level (0 = cantrip, 1–9); use unlocksAtClassLevel when the feature unlocks that pick at a specific character/class level (both fields when the source states both).",
    "- Sheet toggles: requiresSheetToggle must reference either a standard key (while_raging, concentrating, …) OR a key listed once under new_toggles on the parent class/subclass ({ key, name, grantingFeature }). Declare transformation states (Rage of the Gods form, etc.) in new_toggles before other features reference them.",
    "- Renamed / lightly-modified SRD features: set basedOnSrdFeature to the exact INDEX — SRD-standard feature name (e.g. \"Evasion\") while keeping the homebrew display name. Auto-wire applies the base; description/mechanics[] carry deltas (party share, extra gates).",
    "- targetCount (shared): { mode: \"ability_modifier\", ability: \"charisma\", minimum: 1 } for \"a number of creatures equal to your Charisma modifier (minimum of one)\" — use on temporary_hit_points, movement_grant, and similar targeted effects (not uses.ability_modifier, which is for use counts).",
    "Always include sourcePhrase (quote the rule sentence) and confidence high|medium|low.",
  ]
  return lines.join("\n")
}

/** Build the full Common Modifier section for import / BYO prompts. */
export function buildCommonModifiersImportHint(): string {
  const sections = [
    `Common Modifier wiring index (auto-linked at import — do NOT output linkedModifiers or modifierRefs)

Dump Stat maps features, traits, and feats to reusable catalog entries. Use TWO complementary strategies:
1. PRIMARY — Keep mechanical sentences verbatim in description (phrase matcher below).
2. OPTIONAL — Add mechanics[] when wording is unusual, split across clauses, or you want an explicit hint.

Feat milestones (ASI, Fighting Style feat, Epic Boon): never isChoice — use feature name and/or grant_feat phrasing.
Player picks between named options (Hunter's Prey, Dance Style, Psionic Discipline): isChoice + choices, not grant_feat.
Feats that grant a pick from an ability catalog (discipline / class talent / exploit list): isChoice + choices with exact option names — this is NOT a grant_feat milestone.

Catalog ids (generated at import — never emit in JSON):
- Passive: cat_char_* (skills, ac, grant_feat, uses, speed, …)
- Active: cat_fx_* (extra_attack, check_roll_modifier, damage_reduction, …)
Allowed mechanics[].kind values are listed in the cheat sheet below — use those exact strings (e.g. damage_reduction), not invented suffixes of catalog ids.`,

    formatWiringSection("INDEX — Feature name (works with blank class-table descriptions)", FEATURE_NAME_WIRING),

    formatWiringSection("INDEX — Description phrases", DESCRIPTION_PHRASE_WIRING),

    `INDEX — SRD-standard feature names (exact spelling auto-wires on import; prefer for equivalent homebrew):
${SRD_PRESET_FEATURE_NAMES.map((name) => `- ${name}`).join("\n")}
Hundreds of additional SRD features wire when names match the seeded compendium — use official names when porting SRD content.
When the homebrew name differs (e.g. "Leading Evasion"), keep that name and set basedOnSrdFeature to the exact SRD name above.`,

    `INDEX — Class resources (class_resources[], not feature modifiers):
- Extract columns from level tables: Psi Points, Psi Limit, Rage, Ki, Risk Dice, Battle Dice, Weapon Mastery, Superiority Dice, Exploit Dice, Sorcery Points, Bardic Inspiration, etc.
- resource_key: snake_case (risk_dice, weapon_mastery, psi_points)
- name: display name from the table header (e.g. "Psi Points")
- When a level-scaling pool has NO formal name (source only says "the pool" / "your pool"), derive the display name from the granting feature (e.g. Warrior of the Gods → "Warrior of the Gods Dice") so re-extractions converge — do not invent flavor names
- uses.type: at_level with atLevelTable [{ level, count }] from the table
- Set class_name to the parent class. When the pool is introduced entirely in a subclass feature (not on the base class table), also set subclass_name to that subclass's exact name so it is not implied for every member of the class
- Mention spend/regain in feature descriptions for automatic limited-use linking
- Alternate early refresh (spend Rage to recharge Zealous Presence): uses.alternateRefresh on the feature's uses mechanic, not a second class_resource`,

    "INDEX — Homebrew patterns",
    ...HOMEBREW_WIRING_PATTERNS.flatMap((pattern) => [
      `${pattern.source}:`,
      ...pattern.guidance.map((line) => `- ${line}`),
    ]),

    "INDEX — Sheet toggles (new_toggles[]):",
    "- Standard toggles (while_raging, concentrating, …) need no declaration — use requiresSheetToggle directly.",
    "- When a feature invents a new transformation / conditional state (\"while in this form\", Rage of the Gods, etc.), add ONE entry under new_toggles on the class or subclass: { key: \"rage_of_the_gods_form\", name: \"Rage of the Gods\", grantingFeature: \"Rage of the Gods\" }.",
    "- Derive key as snake_case from the feature name. Sub-benefits (flight, resistance, reaction) then set requiresSheetToggle to that same key.",
    "- Do not invent mismatched keys silently inside individual mechanics[] rows — declare once, then reference.",

    "Leave narrative-only (no mechanics[] unless a clear bonus phrase exists):",
    ...NARRATIVE_ONLY_GUIDANCE.map((line) => `- ${line}`),

    formatMechanicsCheatsheet(),

    `Example feature with mechanics[]:
{
  "level": 2,
  "name": "Fighting Style",
  "description": "You gain a Fighting Style feat of your choice.",
  "mechanics": [{
    "kind": "grant_feat",
    "featCategories": ["Fighting Style"],
    "featCount": 1,
    "sourcePhrase": "You gain a Fighting Style feat of your choice.",
    "confidence": "high"
  }]
}

Example ephemeral turn-start bonus grant (not a pool refill):
{
  "level": 6,
  "name": "Psionic Empowerment",
  "description": "At the start of each of your turns, you gain 2 psi points that last until the end of your turn. These points can only be spent on discipline powers, not talents or spell recreation.",
  "mechanics": [{
    "kind": "turn_start_bonus_grant",
    "grantResourceKey": "psi_points",
    "grantAmount": 2,
    "expiresEndOfTurn": true,
    "usageRestriction": "can only be spent on discipline powers, not talents or spell recreation",
    "sourcePhrase": "At the start of each of your turns, you gain 2 psi points that last until the end of your turn.",
    "confidence": "high"
  }]
}

Example once-per-turn on-hit rider (Divine Fury–style):
{
  "level": 3,
  "name": "Divine Fury",
  "description": "You can channel divine fury into your weapon strikes. On each of your turns while your Rage is active, the first creature you hit with a weapon takes extra damage equal to 1d6 + half your Barbarian level (round down). Choose Necrotic or Radiant for the damage type each time.",
  "mechanics": [{
    "kind": "on_hit_trigger",
    "triggerOn": "hit",
    "oncePerTurn": true,
    "bonusDice": "1d6",
    "scalingMode": "half_character_level_round_down",
    "damageTypeOptions": ["Necrotic", "Radiant"],
    "requiresSheetToggle": "while_raging",
    "sourcePhrase": "the first creature you hit with a weapon takes extra damage equal to 1d6 + half your Barbarian level",
    "confidence": "high"
  }]
}`,
  ]

  return sections.join("\n\n")
}

/** Ensure registry stays in sync with detector rules. */
export function assertModifierWiringRegistryComplete(): void {
  const descriptionIds = new Set(DESCRIPTION_PHRASE_WIRING.map((entry) => entry.ruleId))
  for (const rule of FEATURE_MODIFIER_RULES) {
    if (!descriptionIds.has(rule.id)) {
      throw new Error(
        `modifier-wiring-registry: missing DESCRIPTION_PHRASE_WIRING entry for rule "${rule.id}"`,
      )
    }
  }

  const nameIds = new Set(FEATURE_NAME_WIRING.map((entry) => entry.ruleId))
  for (const rule of FEATURE_NAME_MODIFIER_RULES) {
    if (!nameIds.has(rule.id)) {
      throw new Error(
        `modifier-wiring-registry: missing FEATURE_NAME_WIRING entry for rule "${rule.id}"`,
      )
    }
  }

  assertPhraseIndexMechanicsKindsCovered()
}

/**
 * Fail when an INDEX catalog has no mechanicsKind that exists in AI_MECHANIC_KINDS.
 * Prevents the model from inventing kind names from catalog ID suffixes (e.g. damage_reduction)
 * that are documented in the INDEX but missing from Allowed kind values — then silently dropped.
 */
export function assertPhraseIndexMechanicsKindsCovered(): void {
  const kinds = new Set<string>(AI_MECHANIC_KINDS)
  const problems: string[] = []

  for (const entry of [...DESCRIPTION_PHRASE_WIRING, ...FEATURE_NAME_WIRING]) {
    const suffix = entry.catalog.replace(/^cat_(?:char|fx)_/, "")
    if (AI_MECHANICS_NARRATIVE_CATALOG_SUFFIXES.has(suffix)) continue

    if (entry.mechanicsKind) {
      if (!kinds.has(entry.mechanicsKind)) {
        problems.push(
          `${entry.ruleId}: mechanicsKind "${entry.mechanicsKind}" is not in AI_MECHANIC_KINDS`,
        )
      }
      continue
    }

    if (/^[a-z][a-z0-9_]*$/.test(suffix)) {
      problems.push(
        `${entry.ruleId}: catalog ${entry.catalog} has no mechanicsKind — add "${suffix}" (or the correct kind) to AI_MECHANIC_KINDS and set entry.mechanicsKind, or list "${suffix}" in AI_MECHANICS_NARRATIVE_CATALOG_SUFFIXES if it must stay narrative-only`,
      )
    }
  }

  if (problems.length) {
    throw new Error(
      `modifier-wiring-registry: INDEX / AI_MECHANIC_KINDS drift (${problems.length}):\n- ${problems.join("\n- ")}`,
    )
  }
}

export type ModifierWiringRegistryCoverage = {
  phraseRules: { documented: number; total: number; complete: boolean }
  nameRules: { documented: number; total: number; complete: boolean }
  mechanicsKinds: number
  srdPresetNames: number
  homebrewPatterns: number
  isComplete: boolean
}

/** Counts for the BYO wiring index vs live import detectors (shown on import review). */
export function getModifierWiringRegistryCoverage(): ModifierWiringRegistryCoverage {
  const phraseRules = {
    documented: DESCRIPTION_PHRASE_WIRING.length,
    total: FEATURE_MODIFIER_RULES.length,
    complete: DESCRIPTION_PHRASE_WIRING.length === FEATURE_MODIFIER_RULES.length,
  }
  const nameRules = {
    documented: FEATURE_NAME_WIRING.length,
    total: FEATURE_NAME_MODIFIER_RULES.length,
    complete: FEATURE_NAME_WIRING.length === FEATURE_NAME_MODIFIER_RULES.length,
  }
  return {
    phraseRules,
    nameRules,
    mechanicsKinds: AI_MECHANIC_KINDS.length,
    srdPresetNames: SRD_PRESET_FEATURE_NAMES.length,
    homebrewPatterns: HOMEBREW_WIRING_PATTERNS.length,
    isComplete: phraseRules.complete && nameRules.complete,
  }
}

export function formatModifierWiringRegistryCoverage(coverage: ModifierWiringRegistryCoverage): string {
  const phrase = `${coverage.phraseRules.documented}/${coverage.phraseRules.total} phrase rules`
  const name = `${coverage.nameRules.documented}/${coverage.nameRules.total} name rules`
  return `BYO wiring index: ${phrase} · ${name} documented`
}
