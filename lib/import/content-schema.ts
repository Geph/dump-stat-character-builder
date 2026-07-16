import { z } from "zod"
import { AI_MECHANIC_KINDS } from "@/lib/import/common-modifiers-import-hints"

export { AI_MECHANIC_KINDS } from "@/lib/import/common-modifiers-import-hints"

const ABILITY_SCORE_KEYS = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const

const SAVE_ABILITY_NAMES = [
  "Strength",
  "Dexterity",
  "Constitution",
  "Intelligence",
  "Wisdom",
  "Charisma",
] as const

const USES_ABILITY_CODES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const

export const ImportMechanicSchema = z.object({
  kind: z.enum(AI_MECHANIC_KINDS),
  confidence: z.enum(["high", "medium", "low"]).optional(),
  sourcePhrase: z.string().optional(),
  skills: z.array(z.string()).optional(),
  grantExpertise: z.boolean().optional(),
  choiceCount: z.number().optional(),
  tools: z.array(z.string()).optional(),
  armor: z.array(z.string()).optional(),
  weaponMode: z.enum(["martial_weapons", "simple_weapons"]).optional(),
  savingThrows: z.array(z.enum(SAVE_ABILITY_NAMES)).optional(),
  acBase: z.number().optional(),
  acAbilities: z.array(z.enum(ABILITY_SCORE_KEYS)).optional(),
  acFlatBonus: z.number().optional(),
  hpMode: z.enum(["per_level", "flat"]).optional(),
  hpValue: z.number().optional(),
  attackBonus: z.number().optional(),
  attackTarget: z.enum(["all", "melee", "ranged"]).optional(),
  /** Flat damage bonus (Dueling +2). Prefer over inventing bonusDice for non-dice bonuses. */
  damageBonus: z.number().optional(),
  damageTarget: z.enum(["all", "melee", "ranged"]).optional(),
  bonusDice: z.string().optional(),
  damageType: z.string().optional(),
  damageTypes: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
  speedType: z.enum(["walk", "fly", "swim", "climb"]).optional(),
  speedFeet: z.number().optional(),
  /** "equal_to_walk" for "you gain a Swim/Fly/Climb Speed equal to your (walking) Speed" — speedFeet is ignored in that mode. */
  speedMode: z.enum(["fixed", "equal_to_walk"]).optional(),
  visionRangeFeet: z.number().optional(),
  /** darkvision (default) | blindsight | truesight | tremorsense — required for Blind Fighting / Skulker. */
  visionType: z.enum(["darkvision", "blindsight", "truesight", "tremorsense"]).optional(),
  usesFixed: z.number().optional(),
  usesAbility: z.enum(USES_ABILITY_CODES).optional(),
  /** When true, uses scale with Proficiency Bonus (Lucky, etc.). Prefer over usesFixed: null. */
  usesProficiency: z.boolean().optional(),
  usesRecharge: z
    .enum(["short_rest", "long_rest", "both", "until_item_consumed", "on_resource_reactivation"])
    .optional(),
  /** For usesRecharge on_resource_reactivation — resource/state whose activation refreshes the use (e.g. "rage"). */
  gatingResourceKey: z.string().optional(),
  /** Spend another class resource OR a spell slot to restore one use early. */
  alternateRefresh: z
    .object({
      spendResourceKey: z.string().optional(),
      spendAmount: z.number().optional(),
      /** Expend a spell slot of at least this level (e.g. 3 for "a level 3+ spell slot"). */
      spendSpellSlotMinLevel: z.number().optional(),
      actionCost: z.enum(["none", "action", "bonus_action", "reaction"]),
    })
    .optional(),
  /** Cap how many units of a class resource may be spent per use. */
  classResourceKey: z.string().optional(),
  classResourceCost: z.number().optional(),
  classResourceCostMode: z
    .enum(["fixed", "up_to_proficiency_bonus", "up_to_ability_modifier"])
    .optional(),
  classResourceCostAbility: z.enum(USES_ABILITY_CODES).optional(),
  checkRollMode: z.enum(["advantage", "disadvantage", "bonus"]).optional(),
  checkCategory: z.enum(["save", "skill", "ability", "attack", "initiative", "death_save"]).optional(),
  checkAbility: z.enum(SAVE_ABILITY_NAMES).optional(),
  checkSkills: z.array(z.string()).optional(),
  /** Freeform qualifier that cannot be auto-enforced (e.g. "that involves you dancing"). */
  conditionNote: z.string().optional(),
  /** Shared multi-target / beneficiary scope for die bonuses, THP, movement, etc. */
  targets: z
    .enum(["self", "self_and_allies_in_range", "self_and_chosen_ally", "chosen_creatures", "chosen_creatures_in_range"])
    .optional(),
  targetCount: z
    .object({
      mode: z.enum(["ability_modifier", "fixed"]),
      ability: z.enum(ABILITY_SCORE_KEYS).optional(),
      minimum: z.number().optional(),
      count: z.number().optional(),
    })
    .optional(),
  /** When damage/check bonus comes from rolling a class resource die. */
  plusAbilityModifier: z.boolean().optional(),
  amountMultiplier: z.number().optional(),
  /** damage_reduction */
  reductionMode: z.enum(["evasion", "flat"]).optional(),
  reductionAmount: z.number().optional(),
  /** movement_grant */
  distanceMode: z.enum(["fixed", "fraction_of_speed", "full_speed"]).optional(),
  distanceFeet: z.number().optional(),
  fraction: z.number().optional(),
  trigger: z.string().optional(),
  provokesOpportunityAttacks: z.boolean().optional(),
  /** movement_grant: true for "teleport to a space you can see" (ignores terrain/occupied
   * spaces along the way); false/omitted for ordinary movement along the ground. */
  teleport: z.boolean().optional(),
  featCategories: z
    .array(
      z.enum([
        "Origin",
        "Dark Gift",
        "General",
        "Fighting Style",
        "Epic Boon",
        "Planar Pact",
        "Metamagic",
        "Mystic Technique",
        "Eldritch Invocation",
      ]),
    )
    .optional(),
  featCount: z.number().optional(),
  languages: z.array(z.string()).optional(),
  languageChoiceCount: z.number().optional(),
  choicePool: z.enum(["standard", "standard_and_rare"]).optional(),
  spellNames: z.array(z.string()).optional(),
  /**
   * Class level when the spellNames on THIS mechanic become always-prepared (subclass spell
   * tables that emit one mechanic per level tier, e.g. "3 -> Cure Wounds, Moonbeam", "5 ->
   * Conjure Animals"). Not the same as spellChoiceGrants[].unlocksAtClassLevel, which gates a
   * player-chosen grant instead of a fixed list.
   */
  unlocksAtClassLevel: z.number().optional(),
  spellChoiceGrants: z
    .array(
      z.object({
        level: z.number(),
        count: z.number(),
        unlocksAtClassLevel: z.number().optional(),
      }),
    )
    .optional(),
  spellChoiceLabel: z.string().optional(),
  alwaysPrepared: z.boolean().optional(),
  castAsRitual: z.boolean().optional(),
  spellcastingAbility: z.enum(ABILITY_SCORE_KEYS).optional(),
  attunementTotal: z.number().optional(),
  attunementBonus: z.number().optional(),
  targetCreatureTypes: z.array(z.string()).optional(),
  requiresSheetToggle: z.string().optional(),
  sheetToggleLabel: z.string().optional(),
  /** Alternate ability for skill checks / saves / weapon rolls. */
  alternateAbility: z.enum(ABILITY_SCORE_KEYS).optional(),
  alternateSkills: z.array(z.string()).optional(),
  alternateSaves: z.array(z.string()).optional(),
  weaponAbilityAppliesTo: z.enum(["attack", "damage", "both"]).optional(),
  weaponAbilityScope: z.enum(["all", "melee", "ranged", "finesse", "specific"]).optional(),
  weaponNames: z.array(z.string()).optional(),
  fromSaveAbility: z.enum(["any", "STR", "DEX", "CON", "INT", "WIS", "CHA"]).optional(),
  toSaveAbility: z.enum(USES_ABILITY_CODES).optional(),
  forcedSaveScope: z.enum(["your_spells", "your_features", "all"]).optional(),
  restoreResourceKey: z.string().optional(),
  restoreResourceAmount: z.number().optional(),
  /** turn_start_bonus_grant — resource these bonus units count as (often same as the main pool key). */
  grantResourceKey: z.string().optional(),
  grantAmount: z.number().optional(),
  grantAmountByLevel: z
    .array(z.object({ level: z.number(), amount: z.number() }))
    .optional(),
  expiresEndOfTurn: z.boolean().optional(),
  usageRestriction: z.string().optional(),
  /** on_hit_trigger */
  triggerOn: z.enum(["hit", "crit"]).optional(),
  oncePerTurn: z.boolean().optional(),
  maximizeWeaponDamage: z.boolean().optional(),
  maximizeWeaponDamageAtLevel: z.number().optional(),
  spendResourceKey: z.string().optional(),
  spendResourceAmount: z.number().optional(),
  automaticBonusMode: z
    .enum(["character_level", "half_character_level_round_down", "none"])
    .optional(),
  scalingMode: z
    .enum(["none", "character_level", "half_character_level_round_down"])
    .optional(),
  damageTypeOptions: z.array(z.string()).optional(),
  /**
   * initiative. "ability_modifier" REPLACES the roll's governing ability (e.g. some feature
   * says initiative uses INT instead of DEX). "add_ability_modifier" ADDS the ability on top of
   * the normal DEX-based roll — use this for "you can add your Wisdom modifier to the roll"
   * phrasing (Ranger's Dread Ambusher, etc.), which is the far more common wording.
   */
  initiativeMode: z
    .enum(["flat_bonus", "add_proficiency", "ability_modifier", "add_ability_modifier"])
    .optional(),
  initiativeAbility: z.enum(ABILITY_SCORE_KEYS).optional(),
  initiativeFlatBonus: z.number().optional(),
  /** telepathy */
  telepathyRangeFeet: z.number().optional(),
  /** unarmed_strike_damage */
  dieByLevel: z.array(z.object({ level: z.number(), die: z.string() })).optional(),
  /** resource_ability_menu */
  waiveResourceCost: z.boolean().optional(),
  menuAbilityNames: z.array(z.string()).optional(),
  /** temporary_hit_points */
  amount: z.number().optional(),
  amountDice: z.string().optional(),
  amountScaling: z
    .enum(["character_level", "class_resource_die", "ability_modifier", "proficiency"])
    .optional(),
  ability: z.enum(ABILITY_SCORE_KEYS).optional(),
  thpTrigger: z.enum(["on_activation", "turn_start", "on_use", "on_hit"]).optional(),
  thpTarget: z.enum(["self", "chosen_creature_in_range", "allies_in_range"]).optional(),
  rangeFeet: z.number().optional(),
  expiresOnTriggerEnd: z.boolean().optional(),
  /** speed hover */
  canHover: z.boolean().optional(),
  /** turn_start_trigger */
  hpBelowFraction: z.number().optional(),
  blockedByConditions: z.array(z.string()).optional(),
  /** weapon_reach_modifier */
  reachBonusFeet: z.number().optional(),
  weaponPropertyFilter: z.array(z.string()).optional(),
  /** extra_weapon_mastery */
  masteryProperties: z.array(z.string()).optional(),
})

export type ImportMechanic = z.infer<typeof ImportMechanicSchema>

/** Declared once on a class/subclass before features reference it via requiresSheetToggle. */
export const NewToggleImportSchema = z.object({
  key: z.string(),
  name: z.string(),
  grantingFeature: z.string(),
})

export type NewToggleImport = z.infer<typeof NewToggleImportSchema>

export const ChoiceOptionsSchema = z.object({
  category: z.string(),
  count: z.number(),
  options: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      prerequisite: z.string().nullable().optional(),
      repeatable: z.boolean().nullable().optional(),
    }),
  ),
  optionsSource: z
    .enum([
      "known_discipline_talents",
      "fusion_talents",
      "class_knacks",
      "class_upgrades",
      "class_bomb_formulas",
      "class_discoveries",
    ])
    .nullable()
    .optional(),
  resourceKey: z.string().nullable().optional(),
  swappableOnRest: z.boolean().optional(),
  swapRestType: z.enum(["short", "long"]).nullable().optional(),
})

export const SpeciesTraitSchema = z.object({
  name: z.string(),
  description: z.string(),
  isChoice: z.boolean().optional(),
  choices: ChoiceOptionsSchema.optional(),
  mechanics: z.array(ImportMechanicSchema).optional(),
  /** Exact SRD-standard feature name when this trait is a renamed/lightly-modified port. */
  basedOnSrdFeature: z.string().optional(),
})

export const ClassFeatureSchema = z.object({
  level: z.number(),
  name: z.string(),
  description: z.string(),
  isChoice: z.boolean().optional(),
  choices: ChoiceOptionsSchema.optional(),
  mechanics: z.array(ImportMechanicSchema).optional(),
  /** Exact SRD-standard feature name when this feature is a renamed/lightly-modified port. */
  basedOnSrdFeature: z.string().optional(),
  psionic_augments: z.unknown().optional(),
  /** Companion/minion stat block (Steel Defender, Homunculus, etc.). */
  companion_stat_block: z.record(z.unknown()).nullable().optional(),
  sheetDisplay: z
    .object({
      abilitiesActions: z.boolean().optional(),
      combatActions: z.boolean().optional(),
      featuresTab: z.boolean().optional(),
    })
    .optional(),
})

/**
 * Shared by class-level and subclass-granted spellcasting (e.g. Eldritch Knight, Arcane
 * Trickster) — a subclass can grant its own spell slots separate from its base class.
 */
export const ClassSpellcastingImportSchema = z.object({
  ability: z.string(),
  cantrips: z.number().optional(),
  spells_known: z.number().optional(),
  prepared: z.boolean().optional(),
  progression: z
    .array(
      z.object({
        level: z.number(),
        cantrips: z.number(),
        prepared: z.number(),
        max_spell_level: z.number(),
      }),
    )
    .optional(),
  caster_progression: z.enum(["full", "half", "third", "pact"]).optional(),
  explicit_slot_progression: z
    .array(
      z.object({
        level: z.number(),
        slots: z.array(z.number()),
      }),
    )
    .nullable()
    .optional(),
  point_pool: z
    .object({
      resource_key: z.string(),
      cost_by_level: z.record(z.string(), z.number()),
      base_cost_cap_resource_key: z.string().optional(),
      metamagic_cost_cap: z.enum(["proficiency_bonus"]).optional(),
      replaces_spell_slots: z.boolean(),
    })
    .optional(),
})

export const SubclassImportSchema = z.object({
  name: z.string(),
  class_name: z.string(),
  description: z.string().nullable(),
  card_image_url: z.string().nullable().optional(),
  features: z.array(ClassFeatureSchema),
  new_toggles: z.array(NewToggleImportSchema).optional(),
  /**
   * Subclass-granted spellcasting (e.g. Eldritch Knight, Arcane Trickster) — supply
   * `caster_progression` ("third" for these two) so the character sheet resolves spell slots.
   * Most subclasses won't set this; only use it when the subclass itself grants spell slots.
   */
  spellcasting: ClassSpellcastingImportSchema.nullable().optional(),
})

export const FeatImportSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  prerequisite: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  level_requirement: z.number().nullable().optional(),
  /** Ability-catalog picks (discipline / class talent / exploit). Not for ASI / Fighting Style / Epic Boon milestones. */
  isChoice: z.boolean().optional(),
  choices: ChoiceOptionsSchema.optional(),
  mechanics: z.array(ImportMechanicSchema).optional(),
})

export const SpellImportSchema = z.object({
  name: z.string(),
  card_image_url: z.string().nullable().optional(),
  level: z.number(),
  school: z.string(),
  casting_time: z.string().nullable(),
  range: z.string().nullable(),
  components: z.array(z.string()).nullable(),
  duration: z.string().nullable(),
  concentration: z.boolean(),
  description: z.string().nullable(),
  classes: z.array(z.string()).nullable(),
  psionic_augments: z.unknown().optional(),
  companion_stat_block: z.record(z.unknown()).nullable().optional(),
})

export const ClassImportSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  card_image_url: z.string().nullable().optional(),
  card_blurb: z.string().max(120).nullable().optional(),
  complexity: z.enum(["easy", "medium", "hard"]).nullable().optional(),
  hit_die: z.number(),
  primary_ability: z.array(z.string()).nullable(),
  saving_throws: z.array(z.string()).nullable().optional(),
  armor_proficiencies: z.array(z.string()).nullable().optional(),
  weapon_proficiencies: z.array(z.string()).nullable().optional(),
  skill_choices: z
    .object({
      count: z.number(),
      options: z.array(z.string()),
    })
    .nullable()
    .optional(),
  spellcasting: ClassSpellcastingImportSchema.nullable().optional(),
  features: z.array(ClassFeatureSchema),
  spell_list: z.array(z.string()).nullable().optional(),
  starting_equipment_groups: z
    .array(
      z.object({
        description: z.string(),
        options: z.array(
          z.object({
            label: z.string(),
            items: z.array(
              z.object({
                name: z.string(),
                quantity: z.number(),
              }),
            ),
          }),
        ),
      }),
    )
    .nullable()
    .optional(),
  starting_gold: z.number().nullable().optional(),
  multiclass_prerequisites: z
    .array(
      z.object({
        ability: z.string(),
        minimum: z.number(),
      }),
    )
    .nullable()
    .optional(),
  multiclass_prerequisite_groups: z
    .array(
      z.object({
        options: z.array(
          z.object({
            ability: z.string(),
            minimum: z.number(),
          }),
        ),
      }),
    )
    .nullable()
    .optional(),
  multiclass_proficiencies_gained: z.array(z.string()).nullable().optional(),
  special_ability: z
    .object({
      save_dc_ability: z.string(),
      label: z.string().nullable().optional(),
      dc_formula: z.enum(["8_plus_prof_plus_ability_mod"]).optional(),
    })
    .nullable()
    .optional(),
  new_toggles: z.array(NewToggleImportSchema).optional(),
})

export const BackgroundImportSchema = z.object({
  name: z.string(),
  card_image_url: z.string().nullable().optional(),
  description: z.string().nullable(),
  skill_proficiencies: z.array(z.string()).nullable(),
  tool_proficiencies: z.array(z.string()).nullable().optional(),
  /**
   * null = pre-2024 legacy background. The builder offers free +2/+1 or +1/+1/+1 ASI
   * and any Origin feat — do NOT substitute zero-valued objects or invent a feat.
   */
  feat_granted: z.string().nullable(),
  ability_bonuses: z.record(z.string(), z.number()).nullable(),
  feature: z.object({ name: z.string(), description: z.string() }).nullable().optional(),
  grants_spells: z.boolean().optional(),
  granted_spells: z.record(z.string(), z.array(z.string())).nullable().optional(),
  proficiencies: z
    .object({
      tools: z.array(z.string()).optional(),
      vehicles: z.array(z.string()).optional(),
      weapons: z.array(z.string()).optional(),
      armor: z.array(z.string()).optional(),
      languages: z.array(z.string()).optional(),
    })
    .nullable()
    .optional(),
  starting_equipment: z
    .array(z.object({ name: z.string(), quantity: z.number() }))
    .nullable()
    .optional(),
  starting_gold: z.number().nullable().optional(),
})

/** Prompt hint for background PDF / BYO extraction. */
export const BACKGROUND_LEGACY_IMPORT_HINT = `Background ability scores and feats:
- D&D 2024 backgrounds: set ability_bonuses to eligible abilities with value 0 (e.g. {"intelligence":0,"wisdom":0,"charisma":0}) or fixed +1/+2 values; set feat_granted to the Origin feat name (e.g. "Magic Initiate (Cleric)").
- Pre-2024 / legacy backgrounds (no fixed ASI or Origin feat): set ability_bonuses: null and feat_granted: null. Do NOT invent zero-valued ability objects or placeholder feats — the character builder offers the player a free +2/+1 or +1/+1/+1 allocation and any Origin feat pick.
- Extract Languages into proficiencies.languages (e.g. ["One language of your choice"]).
- Extract Equipment into starting_equipment as { name, quantity } items and starting_gold for GP in a belt pouch (e.g. starting_gold: 10).
- Assign each Feature to the background whose toolset/theme it matches — do not attach a feature to the wrong background because of PDF column flow.
- Do not copy d6 Ideals/Bonds/Flaws/Personality Trait tables into descriptions.`

/** Cross-cutting name consistency for multi-pass library ↔ class/feat imports. */
export const NAME_SOURCE_MATCHING_HINT = `Name and source matching (multi-pass imports)

Custom ability libraries (disciplines, talents, exploits, upgrades, fusion/combo abilities, etc.) are often imported in a separate pass from the class or feat that references them. You do not need to resolve or embed those references yourself — the importer matches them by name after the fact. What you must do is be exact and consistent: use the identical name string, verbatim from the source text, every time an ability is named — whether it's the full write-up, a short grant reference in a class table/feature, or a prerequisite string on a feat or another ability. Also keep source_type/source_name consistent for the same ability across passes (e.g. always attribute a class-level talent to the class, not sometimes to a subclass it happens to be gated behind). If a name is capitalized or punctuated inconsistently in the source (e.g. running headers vs. body text), prefer the spelling used in the ability's own heading.

Undefined class-specific terms (cross-pass flags):
If an ability references a derived stat, resource, or term that reads as class-specific (capitalized, mechanically load-bearing — e.g. "Leadership modifier," "Ki save DC") and that term is not defined anywhere in the current extraction pass, do not silently treat it as ordinary prose. Note it in the entry's definition using the exact term as written (e.g. "References Warlord's Leadership modifier, defined in the class chapter") so a later pass that defines it can match by name.

Action-economy gates vs resource spends:
Some abilities in a resource-pool library are gated by action economy rather than spending that pool (e.g. "forgo an attack to issue this Order" with no Exploit Die spent). Do not assume every custom ability in an Exploit/Psi/maneuver library spends the pool — check each entry's own trigger / Execution text.`

/** Applies to every content type — not only backgrounds. */
export const GENERAL_SOURCE_CLEANUP_HINT = `Source text cleanup (all content types)
- Omit chapter running heads, page numbers, and nav ribbons from every description field.
- Repeated running-head or footer text (e.g. a pipe-separated list of section names) must never be copied into description, regardless of what you are extracting.`

/** Marker legends near spell/option tables (homebrew vs SRD). */
export const MARKER_LEGEND_SCAN_HINT = `Footnote / marker legends near tables
Before extracting spell tables or option lists, check for a legend, footnote, or "Special Cases" callout near them that defines a marker (superscript letter, dagger, asterisk, etc.) attached to some names but not others. These markers commonly distinguish homebrew/custom entries (which need full extraction from this document) from standard SRD entries (which should resolve against the existing compendium and not be re-extracted). If you find such a marker, note in your own extraction which names carried it, and extract full entries only for those.`

/** Brief grant + full write-up = one ability. */
export const DUPLICATE_ABILITY_MERGE_HINT = `Duplicate references / same-ability merge
The same ability is sometimes introduced twice in a source — once as a brief grant reference (a bullet inside another ability's list, or a one-line mention) and again later as a full write-up with its own heading and rules text (e.g. under a "Special Powers" or appendix-style section). These are one ability, not two. If you encounter a name you've already extracted, use the fuller/more detailed version as the entry's description and don't emit a second custom_abilities row — reuse the identical name string so the importer's own matching (see Name and source matching) doesn't need to deduplicate on your behalf.`

export const EquipmentImportSchema = z.object({
  name: z.string(),
  card_image_url: z.string().nullable().optional(),
  category: z.string(),
  subcategory: z.string().nullable(),
  description: z.string().nullable(),
  cost: z.object({ amount: z.number(), unit: z.string() }).nullable().optional(),
  weight: z.number().nullable().optional(),
  properties: z.record(z.unknown()).nullable().optional(),
  requires_attunement: z.boolean().nullable().optional(),
  magic_item_category: z.string().nullable().optional(),
  rarity: z.string().nullable().optional(),
  base_equipment_ids: z.array(z.string()).nullable().optional(),
  selected_base_equipment_id: z.string().nullable().optional(),
  base_equipment_filter: z.enum(["any_melee_weapon", "any_ranged_weapon", "any_weapon"]).nullable().optional(),
  magic_effects: z.array(z.record(z.unknown())).nullable().optional(),
})

export const AbilityImportSchema = z.object({
  name: z.string(),
  card_image_url: z.string().nullable().optional(),
  description: z.string(),
  prerequisite: z.string().nullable().optional(),
  repeatable: z.boolean().optional(),
  source_type: z
    .enum(["class", "subclass", "species", "background", "feat", "item", "compendium"])
    .nullable(),
  source_name: z.string().nullable(),
  level_requirement: z.number().nullable(),
  companion_stat_block: z.record(z.unknown()).nullable().optional(),
  psionic_augments: z.unknown().optional(),
  casting_time: z.string().nullable().optional(),
  /**
   * Activation cost/timing when the source labels it explicitly (Execution / Activation / Trigger).
   * Distinct from casting_time (spell/psionic casting headers).
   */
  execution: z.string().nullable().optional(),
  /**
   * Every class/subclass named as able to learn this ability when the source lists one or more.
   * Prefer this over collapsing multiple class names into source_name or prerequisite.
   */
  eligible_classes: z.array(z.string()).nullable().optional(),
  range: z.string().nullable().optional(),
  components: z.array(z.string()).nullable().optional(),
  duration: z.string().nullable().optional(),
  concentration: z.boolean().optional(),
  isChoice: z.boolean().optional(),
  choices: ChoiceOptionsSchema.optional(),
  ability_role: z
    .enum([
      "discipline",
      "psionic_power",
      "talent_pool",
      "class_talent",
      "knack",
      "upgrade",
      "bomb_formula",
      "discovery",
      "alchemist_bomb",
    ])
    .optional(),
  mechanics: z.array(ImportMechanicSchema).optional(),
})

const UsesAtLevelImportSchema = z.object({
  level: z.number(),
  count: z.number(),
})

const UsesConfigImportSchema = z.object({
  type: z.enum([
    "fixed",
    "proficiency",
    "ability_modifier",
    "custom_ability",
    "at_level",
    "class_resource",
    "unlimited",
    "special",
  ]),
  fixedAmount: z.number().optional(),
  abilityModifier: z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"]).optional(),
  specialDescription: z.string().optional(),
  atLevelTable: z.array(UsesAtLevelImportSchema).optional(),
  atLevelMode: z.enum(["tier", "multiply_level"]).optional(),
  recharges: z
    .array(
      z.object({
        rest: z.enum(["short_rest", "long_rest"]),
        amount: z.number().nullable().optional(),
        amountFormula: z.enum(["half_class_level_round_up", "ability_modifier"]).nullable().optional(),
        amountFormulaAbility: z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"]).nullable().optional(),
        maxPerLongRest: z.number().nullable().optional(),
      }),
    )
    .optional(),
  rechargeOverrides: z
    .array(
      z.object({
        atClassLevel: z.number(),
        recharges: z.array(
          z.object({
            rest: z.enum(["short_rest", "long_rest"]),
            amount: z.number().nullable().optional(),
            amountFormula: z.enum(["half_class_level_round_up", "ability_modifier"]).nullable().optional(),
        amountFormulaAbility: z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"]).nullable().optional(),
            maxPerLongRest: z.number().nullable().optional(),
          }),
        ),
      }),
    )
    .optional(),
  restoreBySpellSlot: z
    .object({
      minSpellLevel: z.number(),
      restores: z.number(),
    })
    .optional(),
  useShareKey: z.string().optional(),
})

export const ClassResourceImportSchema = z.object({
  class_name: z.string(),
  /** When the pool is granted entirely by a subclass feature (not the base class table). */
  subclass_name: z.string().optional(),
  resource_key: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  uses: UsesConfigImportSchema,
})

export const ProposedClassResourceImportSchema = ClassResourceImportSchema.extend({
  proposal_id: z.string(),
  definition: z.string(),
})

export const ProposedCustomAbilityImportSchema = AbilityImportSchema.extend({
  proposal_id: z.string(),
  definition: z.string(),
  choices: ChoiceOptionsSchema.optional(),
})

export const ImportProposalsSchema = z.object({
  class_resources: z.array(ProposedClassResourceImportSchema).optional(),
  custom_abilities: z.array(ProposedCustomAbilityImportSchema).optional(),
})

/** Internal validation shape for import content (not sent to OpenAI). Use `buildImportContentAiSchema` for AI extraction. */
export function buildImportContentSchema(options?: { includeAbilities?: boolean }) {
  const base = {
    species: z
      .array(
        z.object({
          name: z.string(),
          card_image_url: z.string().nullable().optional(),
          description: z.string().nullable(),
          speed: z.number().nullable(),
          size: z.string().nullable(),
          traits: z.array(SpeciesTraitSchema),
        }),
      )
      .optional(),
    classes: z.array(ClassImportSchema).optional(),
    class_resources: z.array(ClassResourceImportSchema).optional(),
    subclasses: z.array(SubclassImportSchema).optional(),
    backgrounds: z.array(BackgroundImportSchema).optional(),
    spells: z.array(SpellImportSchema).optional(),
    feats: z.array(FeatImportSchema).optional(),
    equipment: z.array(EquipmentImportSchema).optional(),
    import_proposals: ImportProposalsSchema.optional(),
  }

  if (options?.includeAbilities) {
    return z.object({
      ...base,
      abilities: z.array(AbilityImportSchema).optional(),
    })
  }

  return z.object(base)
}

export type ImportContent = z.infer<ReturnType<typeof buildImportContentSchema>> & {
  abilities?: z.infer<typeof AbilityImportSchema>[]
}

export type ImportContentWithAbilities = ImportContent & {
  abilities?: z.infer<typeof AbilityImportSchema>[]
}

import { COMMON_MODIFIERS_IMPORT_HINT } from "@/lib/import/common-modifiers-import-hints"

export const MECHANICS_IMPORT_HINT = COMMON_MODIFIERS_IMPORT_HINT

export const CHOICE_EXTRACTION_HINT = `When content requires a player to choose between fixed options (species lineage/ancestry/legacy, fighting style options listed by name, skill from a list, etc.):
- Set isChoice: true on the trait or class feature (use null when not a choice)
- Populate choices with { category, count, options: [{ name, description }] } or null when not applicable
- Keep rules text in description; list each selectable option in choices.options
- Put each option's mechanical rules in that option's description (not only in the parent feature list). Dump Stat wires Common Modifiers per option from option descriptions (resistance, speeds, darkvision, etc.) and strips duplicates from the parent.
- Feat milestones that grant another feat (Epic Boon, Fighting Style feat picks, Origin Feat picks): do NOT use isChoice — use grant_feat via description phrasing and/or mechanics[] (see Common Modifier wiring). Never model those milestones as isChoice + choices.
- The Ability Score Improvement feat itself is NOT a grant_feat — its body is +2 to one score or +1 to two. Prefer empty mechanics[] (hand presets wire asi_pool) or omit grant_feat entirely; never tag ASI as grant_feat.
- Named PHB Origin/General feats with complex spell/skill picks (Magic Initiate, Resilient, Keen Mind, Observant, Elemental Adept): prefer empty mechanics[] and avoid inventing isChoice shells — Dump Stat has name-matched presets. isChoice is fine for true option lists with no preset (homebrew).
- If a feat grants a choice from a custom ability catalog that a class or subclass also draws from (a discipline, a class-level talent list, an exploit list, etc.) rather than granting a new feat pick, use isChoice: true with choices.options listing each eligible entry by its exact name (see Name and source matching). This is different from grant_feat milestones — the feat is granting a pick from an ability system, not another feat.`

export const FEAT_CATEGORY_IMPORT_HINT = `For feats, set category when the source labels them:
- "Origin" for Origin Feats (1st-level background-style feats)
- "Dark Gift" for Ravenloft Dark Gift feats — NOT Planar Pact. Dark Gifts may be chosen whenever an Origin feat slot is offered (with DM permission). Headers like "Dark Gift Feat (Prerequisite: Ravenloft Campaign)" → category "Dark Gift".
- "Epic Boon" for Epic Boons (19th+ level boons)
- "Fighting Style" for fighting style options
- "Planar Pact" for Planar Pact feats only (mutually exclusive pact feats like Fey Pact, Infernal Pact — "Can't Have Another Planar Pact Feat"). Do NOT use Planar Pact for Planescape Scion / follow-up feats (those are General) or Ravenloft Dark Gifts.
- "General" for other feats (default when unclear), including Planescape campaign feats (Scion of the Outer Planes and its follow-ups)
Do not embed the category name only in description — use the category field.
When the header says "Planar Pact Feat", set category to "Planar Pact" and put prerequisite text in prerequisite (not only in description).
When the header says "Dark Gift Feat", set category to "Dark Gift" (never "Planar Pact").
For well-known PHB feats (Alert, Tough, Magic Initiate, Archery, War Caster, etc.), prefer omitting mechanics[] when unsure — name-matched presets apply on load. Partial wrong mechanics (e.g. vision without visionType blindsight, grant_feat on ASI, empty damage_roll_modifiers) are worse than none.`

export const SUBCLASS_IMPORT_HINT = `For subclasses:
- Set class_name to the exact parent class name as it appears in the source (e.g. "Druid", "Fighter", "Sorcerer", "Psion")
- Third-party subclass names (Psionic Archetype, Circle, Oath, Patron, etc.) still use the subclasses array
- Include all subclass features with their gain level
- Spell list features should keep HTML tables in description when present
- When a feature invents a new transformation / conditional state (e.g. "while in this form"), declare it once under new_toggles: [{ key: "rage_of_the_gods_form", name: "Rage of the Gods", grantingFeature: "Rage of the Gods" }] — then reference that key via requiresSheetToggle in mechanics[]. Do not invent unmatched toggle keys inside individual features.
- When the SUBCLASS itself grants spell slots that the base class doesn't have (e.g. Eldritch Knight, Arcane Trickster — the "Spellcasting"/"Spell Slots" feature has its own slot table separate from any full-caster class), set the subclass's own spellcasting field: { ability, caster_progression }. Use caster_progression "third" for a table that starts at level 3 and grants its first 2nd-level slot around level 7 (Eldritch Knight/Arcane Trickster pattern); use "half" only if the table instead starts at level 2 and matches a half-caster's pace. If the table doesn't match either canonical shape, also set explicit_slot_progression: [{ level, slots: [1st,2nd,...] }, ...] read directly from the table. Do NOT set this for subclasses that just add spells known/prepared to an already-full-caster base class (e.g. Divine Soul Sorcerer) — that's already covered by the base class's own spellcasting.`

export const CLASS_RESOURCE_IMPORT_HINT = `For class_resources (custom class pools like Psi Points, Rage, Ki, Risk Dice):
- Extract rows when a class level table lists named resource columns (Psi Points, Psi Limit, Rage, Risk Dice, etc.)
- Set class_name to the exact parent class name from the source headers/table (e.g. "Psion")
- When the pool is introduced entirely inside a subclass feature (not on the base class level table), also set subclass_name to that subclass's exact name (e.g. "Path of the Zealot") so the pool is not implied for every member of the parent class
- resource_key: lowercase snake_case (e.g. "psi_points", "psi_limit", "warrior_of_the_gods_dice")
- name: display name from the table header (e.g. "Psi Points")
- When a level-scaling pool has no formal name in the source (referred to only as "the pool" / "your pool"), derive the display name from the granting feature (e.g. "Warrior of the Gods" → "Warrior of the Gods Dice") so repeated extractions converge — do not invent a flavor name
- uses.type should be "at_level" with atLevelMode "tier" and atLevelTable [{ level, count }, ...] from the class table
- **Spendable pools** (Rage, Ki, Psi Points, Exploit Dice, etc.): include recharges (short_rest and/or long_rest)
- **Counters and caps** (Exploits Known, Psi Limit, Hexes Known, Ritual Level): use type "special" with atLevelTable and no recharges — these render as static caps, not depleting pools
- **Weapon Mastery** table columns do NOT become class_resources — wire the tier table into the Weapon Mastery feature's choices.choiceCountByLevel instead
- When the table has a separate "Die Size" / "Die Type" column alongside the pool count (e.g. Psionic Energy Dice: d6→d8→d10→d12 as the Number column also grows), set uses.dieSidesByLevel: [{ level, count: <die sides as a number, e.g. 6/8/10/12> }, ...] in addition to atLevelTable — do not drop the die-size progression just because it scales separately from the count
- Also extract class_resources when rules text clearly defines a level-scaling pool even without a full table`

export const CUSTOM_CLASS_IMPORT_HINT = `For homebrew/custom classes (e.g. <Designer> <Class Name>, Gunslinger):
- Use the class name exactly as it appears in the source text's own headers and class table (e.g. "Psion," not an invented designer-prefixed variant) unless the user has explicitly told you a disambiguating prefix is required — do not default to prefixing the credited designer's name onto the class name. If a prefix convention is needed to avoid colliding with another compendium entry, that's a decision for the user to confirm, not something to infer from a byline or credits page.
- That exact class name is the canonical string other passes must match (spells[].classes, source_name on abilities, subclass class_name) — see Name and source matching.
- Put the full class in classes[] with hit_die, proficiencies, and all class features by level
- Put each subclass/archetype/path in subclasses[] with class_name set to that same parent class name
- Do NOT embed the class level progression table in classes[].description — only flavor and rules prose; table data becomes features[] and class_resources[]
- Extract starting_equipment_groups when an Equipment block lists choice groups (a)/(b)/(c) and fixed items; mirror { description, options: [{ label, items: [{ name, quantity }] }] }
- Disciplines, talents, or invocation-like options with point costs should be class/subclass features; note psi/point costs in description
- Custom spells and feats in spells[] and feats[]; set spell classes to include the custom class name`

export const IMPORT_PROPOSALS_HINT = `For import_proposals (user confirmation before creating compendium entries):
- Identify every class resource pool you find (Psi Points, Psi Limit, Rage, Ki, Sorcery Points, etc.)
- Put each in import_proposals.class_resources[] with proposal_id (snake_case), class_name, optional subclass_name (when the pool is subclass-only), resource_key, name, uses, and definition
- When the source never names the pool formally, derive name from the granting feature (see Class resource import rules) so proposal_id / name stay stable across re-imports
- definition: 1–3 sentences explaining what the pool is, how it is spent, and typical recharge — shown to the user before import
- Identify custom builder abilities: psionic disciplines, invocation lists, fighting-style pickers, and similar player-chosen option systems
- Put each in import_proposals.custom_abilities[] with proposal_id, name, definition, description, source_type, source_name, level_requirement, prerequisite (freeform), repeatable (when the knack can be learned multiple times), ability_role: "knack" for class Knack options (one proposal row per Knack — do not bundle into a single choices catalog)
- For knack pools, put a class feature with choices { category: "Knack", count: 1, resourceKey: "knacks_known", optionsSource: "class_knacks", swappableOnRest: true } — individual Knacks are separate custom_abilities rows
- Maneuver / technique libraries (Battle Master-style: a die pool fuels player-chosen combat options) use the SAME "class_knacks" pipeline as Knacks — set ability_role: "knack" on each maneuver's custom_abilities row and wire the granting feature's choices with optionsSource: "class_knacks" (there is no "class_maneuvers" option — it will resolve to zero picks). Do NOT set choices.resourceKey to the die pool's resource_key: maneuvers-known and the die pool almost always scale on different tables (e.g. 3/5/7/9 maneuvers known vs. 4/5/6 dice). Use choices.choiceCountByLevel with the maneuvers-known tier table instead — resourceKey is only for choice counts that equal a resource pool's own count (e.g. knacks_known)
- For Inventor-style upgrades, put one custom_abilities proposal per upgrade option (ability_role: "upgrade", repeatable per option). Section headers like "Gadgetsmith Upgrades" / "Unrestricted Upgrades" are NOT ability rows. Wire the class feature with choices { category: "Upgrade", resourceKey: "upgrades", optionsSource: "class_upgrades" }. Subclass-only upgrade lists stay deferred when extracted with the subclass.
- Talent pools (three patterns — do not conflate):
  1) Discipline-gated talents: nested in choices on the discipline package (category e.g. "Discipline Talents", not a colliding bare "Talents" when a class-level pool also exists).
  2) Class-level talents: separate list at end of class chapter / "Talents Known" column — one custom_abilities row per talent with ability_role: "class_talent"; wire the class feature with a distinct choices.category (e.g. "Class Talents") and resourceKey (e.g. class_talents_known). Capture level/subclass gates in options[].prerequisite or the row's prerequisite.
  3) Feat-gated / combo talents: also ability_role: "class_talent" with prerequisite naming the feat and any required disciplines/talents (exact names — see Name and source matching).
- Specialization on a discipline package: if the package offers a mutually exclusive one-time sub-choice when first gained (often labeled "Specialization"), use choices: { category: "Specialization", count: 1, options: [...] } on the package, separate from any Talents choice. Put replacement Alternate Effects tables on the specialization option's description; keep only the default/base table on the parent package description.
- For disciplines with nested talents, include EVERY talent from that discipline's list in choices.options. Put each leaf labeled Psionic power as its own custom_abilities proposal with ability_role: "psionic_power" (casting headers + augment lists in description) — do NOT put those powers in spells[] and do not mash power text into the discipline package description.
- For exploit/maneuver libraries, one custom_abilities proposal per exploit; degree headers (1st-Degree Exploits, …) are NOT ability rows.
- Populate execution (verbatim Execution/Activation/Trigger line) and eligible_classes (every named learnable class) on exploit-style leaves; keep prerequisite for real prerequisites only (ability scores, skills/tools, level) — see Custom ability library structure.
- When a section/tier intro states a recharge, cost, level gate, or activation rule for every entry beneath it, copy that rule onto each leaf's own fields (do not leave it only in the section header).
- Crafted-consumable abilities (bombs, traps, poisons): one custom_abilities row covering craft + consumable rules; usesRecharge "until_item_consumed" when the spent resource is locked until the item is used/destroyed — do not split into equipment[] unless the schema treats player-crafted consumables as inventory.
- Do NOT also duplicate the same entries in class_resources[] or abilities[] — proposals are reviewed first; omit level tables from class description`
