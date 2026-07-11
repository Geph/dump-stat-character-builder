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
] as const

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
    notes: 'triggerOn: "on_crit", automaticBonus: { mode: "character_level" }',
  },
  {
    ruleId: "damage.crit.maximize",
    trigger: "description",
    catalog: "cat_char_on_hit_trigger",
    examples: [
      "At 15th level, when you score a critical hit with a weapon attack, you can maximize the damage instead of rolling.",
    ],
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
    notes: 'bonusConfig: { mode: "die", dieScaling: "class_resource", classResourceKey }',
  },
  {
    ruleId: "resource.free_use_on_roll",
    trigger: "description",
    catalog: "cat_char_resource_ability_menu",
    examples: [
      "you can use feat of strength or heroic fortitude without expending an Exploit Die",
    ],
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
    notes: "hpBelowFraction: 0.5, nested heal_self fixed + ability modifier",
  },
  {
    ruleId: "resource.turn_start_regain_ki",
    trigger: "description",
    catalog: "cat_char_turn_start_trigger",
    examples: [
      "regain 1 Ki at the start of each of your turns in combat, so long as you are not Incapacitated",
    ],
    notes: "restoreResourceKey + restoreResourceAmount; blockedByConditions when Incapacitated mentioned",
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
    examples: ["once per turn when you hit a creature with an attack, you can spend 1 Ki to deal extra damage"],
    notes: "oncePerTurn: true, spendResourceKey: ki_points",
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
    mechanicsKind: "initiative" as (typeof AI_MECHANIC_KINDS)[number],
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
    examples: ["fly speed of 30 feet"],
    mechanicsKind: "speed",
    notes: 'speedType: "fly"',
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
    mechanicsKind: "telepathy" as (typeof AI_MECHANIC_KINDS)[number],
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
    notes: "Sets requiresArmor on flat AC bonus.",
  },
  {
    ruleId: "ac.bonus.while_raging",
    trigger: "description",
    catalog: "cat_char_ac",
    examples: ["+1 AC while raging"],
    notes: "Requires sheet Rage toggle (requiresSheetToggle: while_raging).",
  },
  {
    ruleId: "damage.scaling.die_by_level",
    trigger: "description",
    catalog: "cat_char_unarmed_strike_damage",
    examples: ["at 3rd level the die becomes 1d8", "at 5th level ... 2d6"],
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
      "Scoped defensive save (Dex, no damage on success). NOT saving_throw_trigger — that is for reactive abilities.",
  },
  {
    ruleId: "defensive.flat_damage_reduction",
    trigger: "description",
    catalog: "cat_char_damage_reduction",
    examples: ["you can reduce the damage taken by 2"],
    notes:
      "Flat damage reduction (e.g. Warden Mystic Bulwark). Defaults to Bludgeoning/Piercing/Slashing; widen damageTypes for all-damage variants. Requires a numeric amount — phrasing like 'reduce the damage by the amount rolled' is intentionally ignored.",
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
    ],
    notes: 'requiresSheetToggle on mechanics[] — medium confidence; confirm in import review.',
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
    notes: "Rogue/Monk/Gunslinger — include SRD prose in description when possible.",
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

/** Patterns from homebrew imports (Gunslinger, KibblesTasty Psion, Alternate Fighter, Dancer). */
export const HOMEBREW_WIRING_PATTERNS = [
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
    source: "KibblesTasty Psion / point-pool casters",
    guidance: [
      "Psi Points + Psi Limit as separate class_resources (pool vs per-use cap).",
      "Disciplines / talents: isChoice + choices.options[] for player picks; keep psi costs in each option description.",
      "Use import_proposals.custom_abilities for discipline systems needing builder UI.",
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

/** Content that should stay narrative — do not force mechanics[] unless a clear passive bonus exists. */
export const NARRATIVE_ONLY_GUIDANCE = [
  "Spellcasting progressions and spell-list tables (spells[] / description HTML tables — not modifiers).",
  "Subclass spell-list features (* Spells) — preserve HTML tables in description.",
  "Transformation / polymorph stat blocks (Wild Shape forms, Draconic forms) — descriptive unless a fixed AC/speed bonus is stated in prose.",
  "Social / exploration ribbons without numeric bonuses.",
  "Reaction timing, advantage on specific story checks, or GM-adjudicated effects without standard phrasing.",
  "Reaction rerolls or once-per-long-rest reaction riders (e.g. reroll a low Deception check) — keep in description unless a catalog trigger exists; do NOT map to uses.",
  "Maneuver / discipline / invocation option lists — use isChoice + choices, not grant_feat.",
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
    "- spells_known: spellNames [\"Druidcraft\"]; spellChoiceGrants [{ level: 0, count: 1 }]; spellChoiceLabel for filters",
    "- tool_proficiencies: tools [\"Smith's Tools\"]; grantExpertise true for doubled tool checks",
    "- attunement_slots: attunementTotal 4 (sets cap) OR attunementBonus 1 (adds to default 3)",
    "- armor_proficiencies: armor [\"Heavy Armor\", \"Shields\"]",
    "- weapon_proficiencies: weaponMode martial_weapons | simple_weapons",
    "- saving_throws: savingThrows [\"Strength\", \"Constitution\"]",
    "- ac: acBase 10 + acAbilities [\"dexterity\",\"wisdom\"] OR acFlatBonus 1",
    "- hit_points: hpMode per_level, hpValue 1",
    "- attack_roll_modifiers: attackBonus 2, attackTarget all|melee|ranged; criticalHitMinimum; criticalHitMinimumByLevel [{ level, fixed: minD20 }]",
    "- damage_roll_modifiers: bonusDice \"1d6\", damageType \"fire\"; grantAbilityModifierWhenMissing; bonusDiceWhenModifierIncluded \"1d8\"",
    "- damage_resistance: damageTypes [\"Fire\", \"Psychic\"]",
    "- condition_immunity: conditions [\"Charmed\"]",
    "- speed: speedType walk|fly|swim|climb, speedFeet 10",
    "- vision: visionRangeFeet 60",
    "- uses: usesFixed 2, usesRecharge short_rest|long_rest|both; OR usesAbility WIS",
    "- check_roll_modifier: checkRollMode advantage, checkCategory save|skill|ability|attack|initiative, checkAbility/checkSkills",
    "- extra_attack: (no extra fields)",
    `- grant_feat: featCategories ${JSON.stringify(FEAT_CATEGORIES_FOR_IMPORT)}, featCount 1`,
    "- skill_check_alternate_ability: alternateAbility strength|…; alternateSkills [\"Insight\"]; optional requiresSheetToggle",
    "- saving_throw_alternate_ability: alternateAbility intelligence; alternateSaves [\"Wisdom\"]",
    "- forced_save_ability_remap: fromSaveAbility WIS|any; toSaveAbility INT; forcedSaveScope your_features|your_spells|all",
    "- weapon_ability_override: alternateAbility charisma; weaponAbilityAppliesTo both|attack|damage; weaponAbilityScope all|melee|ranged|finesse|specific; weaponNames optional",
    "- turn_start_resource_restore: restoreResourceKey \"psionic_energy_dice\"; restoreResourceAmount 1",
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

Feat milestones (ASI, Fighting Style, Epic Boon): never isChoice — use feature name and/or grant_feat phrasing.
Player picks between named options (Hunter's Prey, Dance Style, Psionic Discipline): isChoice + choices, not grant_feat.

Catalog ids (generated at import — never emit in JSON):
- Passive: cat_char_* (skills, ac, grant_feat, uses, speed, …)
- Active: cat_fx_* (extra_attack, check_roll_modifier, damage_reduction, …)`,

    formatWiringSection("INDEX — Feature name (works with blank class-table descriptions)", FEATURE_NAME_WIRING),

    formatWiringSection("INDEX — Description phrases", DESCRIPTION_PHRASE_WIRING),

    `INDEX — SRD-standard feature names (exact spelling auto-wires on import; prefer for equivalent homebrew):
${SRD_PRESET_FEATURE_NAMES.map((name) => `- ${name}`).join("\n")}
Hundreds of additional SRD features wire when names match the seeded compendium — use official names when porting SRD content.`,

    `INDEX — Class resources (class_resources[], not feature modifiers):
- Extract columns from level tables: Psi Points, Psi Limit, Rage, Ki, Risk Dice, Battle Dice, Weapon Mastery, Superiority Dice, Exploit Dice, Sorcery Points, Bardic Inspiration, etc.
- resource_key: snake_case (risk_dice, weapon_mastery, psi_points)
- uses.type: at_level with atLevelTable [{ level, count }] from the table
- Mention spend/regain in feature descriptions for automatic limited-use linking`,

    "INDEX — Homebrew patterns",
    ...HOMEBREW_WIRING_PATTERNS.flatMap((pattern) => [
      `${pattern.source}:`,
      ...pattern.guidance.map((line) => `- ${line}`),
    ]),

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
