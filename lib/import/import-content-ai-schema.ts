import { zodSchema } from "ai"
import { z } from "zod"
import { AI_MECHANIC_KINDS } from "@/lib/import/common-modifiers-import-hints"
import type { ImportContent, ImportMechanic } from "@/lib/import/content-schema"
import { ImportMechanicSchema } from "@/lib/import/content-schema"
import { normalizeSpellImportRows } from "@/lib/import/normalize-spell-import"
import { coerceMagicEquipmentImportFields } from "@/lib/import/normalize-magic-equipment-import"

/**
 * OpenAI structured output requires every object property in `required`.
 * Use `.nullable()` (not `.optional()`) for fields the model may omit — then
 * normalize with `normalizeAiImportContent()` before the rest of the pipeline.
 */

const ChoiceOptionsAiSchema = z.object({
  category: z.string(),
  count: z.number(),
  options: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      prerequisite: z.string().nullable(),
      repeatable: z.boolean().nullable(),
    }),
  ),
  optionsSource: z
    .enum([
      "known_discipline_talents",
      "fusion_talents",
      "class_talents",
      "class_disciplines",
      "class_knacks",
      "class_upgrades",
      "class_bomb_formulas",
      "class_discoveries",
    ])
    .nullable(),
  resourceKey: z.string().nullable(),
  choiceCountByLevel: z
    .array(z.object({ level: z.number(), count: z.number() }))
    .nullable(),
  swappableOnRest: z.boolean().nullable(),
  swapRestType: z.enum(["short", "long"]).nullable(),
})

const PrerequisiteRuleAiSchema = z.object({
  category: z.literal("other"),
  value: z.string(),
})

const ImportMechanicAiSchema = z.object({
  kind: z.enum(AI_MECHANIC_KINDS),
  confidence: z.enum(["high", "medium", "low"]).nullable(),
  sourcePhrase: z.string().nullable(),
  skills: z.array(z.string()).nullable(),
  grantExpertise: z.boolean().nullable(),
  choiceCount: z.number().nullable(),
  tools: z.array(z.string()).nullable(),
  armor: z.array(z.string()).nullable(),
  weaponMode: z.enum(["martial_weapons", "simple_weapons"]).nullable(),
  savingThrows: z
    .array(z.enum(["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"]))
    .nullable(),
  acBase: z.number().nullable(),
  acAbilities: z
    .array(z.enum(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]))
    .nullable(),
  acFlatBonus: z.number().nullable(),
  hpMode: z.enum(["per_level", "flat"]).nullable(),
  hpValue: z.number().nullable(),
  attackBonus: z.number().nullable(),
  attackTarget: z.enum(["all", "spell", "melee", "ranged"]).nullable(),
  criticalHitMinimum: z.number().nullable(),
  criticalHitMinimumByLevel: z
    .array(z.object({ level: z.number(), fixed: z.number() }))
    .nullable(),
  ignoreHalfCover: z.boolean().nullable(),
  treatThreeQuartersCoverAsHalf: z.boolean().nullable(),
  damageBonus: z.number().nullable(),
  damageTarget: z.enum(["all", "melee", "ranged"]).nullable(),
  bonusDice: z.string().nullable(),
  grantAbilityModifierWhenMissing: z.boolean().nullable(),
  bonusDiceWhenModifierIncluded: z.string().nullable(),
  bonusDiceUsesWeaponDamageType: z.boolean().nullable(),
  damageType: z.string().nullable(),
  damageTypes: z.array(z.string()).nullable(),
  conditions: z.array(z.string()).nullable(),
  speedType: z.enum(["walk", "fly", "swim", "climb"]).nullable(),
  speedFeet: z.number().nullable(),
  speedMode: z.enum(["fixed", "equal_to_walk"]).nullable(),
  visionRangeFeet: z.number().nullable(),
  visionType: z.enum(["darkvision", "blindsight", "truesight", "tremorsense"]).nullable(),
  usesFixed: z.number().nullable(),
  usesAbility: z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"]).nullable(),
  usesProficiency: z.boolean().nullable(),
  usesRecharge: z
    .enum(["short_rest", "long_rest", "both", "until_item_consumed", "on_resource_reactivation"])
    .nullable(),
  gatingResourceKey: z.string().nullable(),
  alternateRefresh: z
    .object({
      spendResourceKey: z.string().nullable(),
      spendAmount: z.number().nullable(),
      spendSpellSlotMinLevel: z.number().nullable(),
      actionCost: z.enum(["none", "action", "bonus_action", "reaction"]),
    })
    .nullable(),
  classResourceKey: z.string().nullable(),
  resourceKey: z.string().nullable(),
  classResourceCost: z.number().nullable(),
  classResourceCostMode: z
    .enum(["fixed", "up_to_proficiency_bonus", "up_to_ability_modifier"])
    .nullable(),
  classResourceCostAbility: z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"]).nullable(),
  checkRollMode: z.enum(["advantage", "disadvantage", "bonus"]).nullable(),
  incomingAttackMode: z.enum(["advantage", "disadvantage"]).nullable(),
  checkCategory: z.enum(["save", "skill", "ability", "attack", "initiative", "death_save"]).nullable(),
  checkAbility: z
    .enum(["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"])
    .nullable(),
  checkSkills: z.array(z.string()).nullable(),
  conditionNote: z.string().nullable(),
  checkConditionTypes: z.array(z.string()).nullable(),
  bonusConfig: z
    .object({
      mode: z.enum(["fixed", "proficiency", "ability_modifier", "die"]),
      fixed: z.number().nullable(),
      ability: z
        .enum(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"])
        .nullable(),
      multiplier: z.number().nullable(),
      minimum: z.number().nullable(),
      dieCount: z.number().nullable(),
      dieScaling: z.enum(["fixed", "by_level", "class_resource"]).nullable(),
      classResourceKey: z.string().nullable(),
    })
    .nullable(),
  targets: z
    .enum([
      "self",
      "self_and_allies_in_range",
      "self_and_chosen_ally",
      "chosen_creatures",
      "chosen_creatures_in_range",
    ])
    .nullable(),
  targetCount: z
    .object({
      mode: z.enum(["ability_modifier", "fixed"]),
      ability: z
        .enum(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"])
        .nullable(),
      minimum: z.number().nullable(),
      count: z.number().nullable(),
    })
    .nullable(),
  plusAbilityModifier: z.boolean().nullable(),
  amountMultiplier: z.number().nullable(),
  reductionMode: z.enum(["evasion", "flat"]).nullable(),
  reductionAmount: z.number().nullable(),
  distanceMode: z.enum(["fixed", "fraction_of_speed", "full_speed"]).nullable(),
  distanceFeet: z.number().nullable(),
  fraction: z.number().nullable(),
  trigger: z.string().nullable(),
  provokesOpportunityAttacks: z.boolean().nullable(),
  teleport: z.boolean().nullable(),
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
    .nullable(),
  featCount: z.number().nullable(),
  creatureNames: z.array(z.string()).nullable(),
  creatureChoiceOptions: z.array(z.string()).nullable(),
  creaturePolymorph: z.boolean().nullable(),
  itemOptions: z.array(z.string()).nullable(),
  allowCustom: z.boolean().nullable(),
  notePrompt: z.string().nullable(),
  notePlaceholder: z.string().nullable(),
  noteTarget: z.enum(["feature", "equipment"]).nullable(),
  spellcastingAbility: z
    .enum(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"])
    .nullable(),
  spellcastingAbilityOptions: z
    .array(z.enum(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]))
    .nullable(),
  attunementTotal: z.number().nullable(),
  attunementBonus: z.number().nullable(),
  targetCreatureTypes: z.array(z.string()).nullable(),
  requiresSheetToggle: z.string().nullable(),
  sheetToggleLabel: z.string().nullable(),
  languages: z.array(z.string()).nullable(),
  languageChoiceCount: z.number().nullable(),
  choicePool: z.enum(["standard", "standard_and_rare"]).nullable(),
  spellNames: z.array(z.string()).nullable(),
  unlocksAtClassLevel: z.number().nullable(),
  spellChoiceGrants: z
    .array(
      z.object({
        level: z.number(),
        count: z.number(),
        unlocksAtClassLevel: z.number().nullable(),
      }),
    )
    .nullable(),
  spellChoiceLabel: z.string().nullable(),
  alwaysPrepared: z.boolean().nullable(),
  castAsRitual: z.boolean().nullable(),
  alternateAbility: z
    .enum(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"])
    .nullable(),
  alternateSkills: z.array(z.string()).nullable(),
  alternateSaves: z.array(z.string()).nullable(),
  weaponAbilityAppliesTo: z.enum(["attack", "damage", "both"]).nullable(),
  weaponAbilityScope: z.enum(["all", "melee", "ranged", "finesse", "specific"]).nullable(),
  weaponNames: z.array(z.string()).nullable(),
  treatAsFinesse: z.boolean().nullable(),
  whenDamageDice: z.array(z.string()).nullable(),
  badgeLabel: z.string().nullable(),
  badgeDescription: z.string().nullable(),
  includeUnarmed: z.boolean().nullable(),
  requireFirearm: z.boolean().nullable(),
  fromSaveAbility: z.enum(["any", "STR", "DEX", "CON", "INT", "WIS", "CHA"]).nullable(),
  toSaveAbility: z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"]).nullable(),
  forcedSaveScope: z.enum(["your_spells", "your_features", "all"]).nullable(),
  restoreResourceKey: z.string().nullable(),
  restoreResourceAmount: z.number().nullable(),
  grantResourceKey: z.string().nullable(),
  grantAmount: z.number().nullable(),
  grantAmountByLevel: z
    .array(z.object({ level: z.number(), amount: z.number() }))
    .nullable(),
  expiresEndOfTurn: z.boolean().nullable(),
  usageRestriction: z.string().nullable(),
  triggerOn: z.enum(["hit", "crit"]).nullable(),
  oncePerTurn: z.boolean().nullable(),
  maximizeWeaponDamage: z.boolean().nullable(),
  maximizeWeaponDamageAtLevel: z.number().nullable(),
  spendResourceKey: z.string().nullable(),
  spendResourceAmount: z.number().nullable(),
  failedTriggerOn: z.enum(["fail", "success"]).nullable(),
  rollKind: z.enum(["ability", "skill", "attack", "save"]).nullable(),
  modifierMode: z.enum(["add", "subtract"]).nullable(),
  rollKinds: z.array(z.enum(["ability", "skill", "attack", "save"])).nullable(),
  dieSource: z.enum(["resource_die", "fixed", "ability_modifier"]).nullable(),
  fixedDie: z.string().nullable(),
  dieAbility: z
    .enum(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"])
    .nullable(),
  targetScope: z
    .enum([
      "self",
      "target_creature",
      "allied_creature",
      "targets_in_area",
      "allies_in_area",
      "enemies_in_area",
    ])
    .nullable(),
  useReaction: z.boolean().nullable(),
  bonusFixed: z.number().nullable(),
  automaticBonusMode: z
    .enum(["character_level", "half_character_level_round_down", "none"])
    .nullable(),
  scalingMode: z.enum(["none", "character_level", "half_character_level_round_down"]).nullable(),
  damageTypeOptions: z.array(z.string()).nullable(),
  initiativeMode: z
    .enum(["flat_bonus", "add_proficiency", "ability_modifier", "add_ability_modifier"])
    .nullable(),
  initiativeAbility: z
    .enum(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"])
    .nullable(),
  initiativeFlatBonus: z.number().nullable(),
  telepathyRangeFeet: z.number().nullable(),
  unarmedDie: z.string().nullable(),
  dieByLevel: z.array(z.object({ level: z.number(), die: z.string() })).nullable(),
  dieSides: z.number().nullable(),
  weaponDamageScope: z
    .enum(["all", "melee", "ranged", "unarmed", "weapons", "specific"])
    .nullable(),
  waiveResourceCost: z.boolean().nullable(),
  menuAbilityNames: z.array(z.string()).nullable(),
  menuOptions: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().nullable(),
        resourceCost: z.number().nullable(),
        hitDiceCost: z.number().nullable(),
        unlocksAtLevel: z.number().nullable(),
        actionKind: z.enum(["action", "bonus", "reaction"]).nullable(),
        bonusConfig: z
          .object({
            mode: z.enum(["fixed", "proficiency", "ability_modifier", "die"]),
            fixed: z.number().nullable(),
            ability: z
              .enum(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"])
              .nullable(),
            multiplier: z.number().nullable(),
            minimum: z.number().nullable(),
            dieCount: z.number().nullable(),
            dieScaling: z.enum(["fixed", "by_level", "class_resource"]).nullable(),
            classResourceKey: z.string().nullable(),
          })
          .nullable(),
      }),
    )
    .nullable(),
  extraAttackCount: z.number().nullable(),
  parentPowerNames: z.array(z.string()).nullable(),
  parentMenuOptionNames: z.array(z.string()).nullable(),
  alertSummary: z.string().nullable(),
  appliesToAttackVariants: z.array(z.enum(["attack", "primed", "explode"])).nullable(),
  selectable: z.boolean().nullable(),
  spendHitPoints: z.number().nullable(),
  replacedFeatureNames: z.array(z.string()).nullable(),
  firstUseNoAction: z.boolean().nullable(),
  firstUseNoActionFromLevel: z.number().nullable(),
  amount: z.number().nullable(),
  hitDiceRestoreAmount: z.number().nullable(),
  hitDiceRestoreByLevel: z
    .array(z.object({ level: z.number(), amount: z.number() }))
    .nullable(),
  restoreOnRest: z.enum(["short_rest", "long_rest"]).nullable(),
  amountDice: z.string().nullable(),
  amountScaling: z
    .enum(["character_level", "class_resource_die", "ability_modifier", "proficiency"])
    .nullable(),
  ability: z
    .enum(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"])
    .nullable(),
  thpTrigger: z.enum(["on_activation", "turn_start", "on_use", "on_hit"]).nullable(),
  thpTarget: z.enum(["self", "chosen_creature_in_range", "allies_in_range"]).nullable(),
  rangeFeet: z.number().nullable(),
  expiresOnTriggerEnd: z.boolean().nullable(),
  canHover: z.boolean().nullable(),
  hpBelowFraction: z.number().nullable(),
  blockedByConditions: z.array(z.string()).nullable(),
  reachBonusFeet: z.number().nullable(),
  weaponPropertyFilter: z.array(z.string()).nullable(),
  attackName: z.string().nullable(),
  icon: z.string().nullable(),
  attackProfile: z.enum(["melee", "ranged", "emanation", "force_save"]).nullable(),
  targetMode: z.enum(["single", "multi", "area"]).nullable(),
  areaShape: z
    .enum(["cone", "line", "sphere", "cylinder", "cube", "cone_or_line"])
    .nullable(),
  areaLengthFeet: z.number().nullable(),
  areaWidthFeet: z.number().nullable(),
  damageDice: z.string().nullable(),
  saveAbility: z
    .enum(["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"])
    .nullable(),
  saveHalfDamage: z.boolean().nullable(),
  abilityNames: z.array(z.string()).nullable(),
})

const ClassFeatureAiSchema = z.object({
  level: z.number(),
  name: z.string(),
  description: z.string(),
  prerequisite_rules: z.array(PrerequisiteRuleAiSchema).nullable(),
  isChoice: z.boolean().nullable(),
  choices: ChoiceOptionsAiSchema.nullable(),
  mechanics: z.array(ImportMechanicAiSchema).nullable(),
  basedOnSrdFeature: z.string().nullable(),
})

const SpeciesTraitAiSchema = z.object({
  name: z.string(),
  description: z.string(),
  prerequisite_rules: z.array(PrerequisiteRuleAiSchema).nullable(),
  isChoice: z.boolean().nullable(),
  choices: ChoiceOptionsAiSchema.nullable(),
  mechanics: z.array(ImportMechanicAiSchema).nullable(),
  basedOnSrdFeature: z.string().nullable(),
})

const SpellcastingAiSchema = z.object({
  ability: z.string(),
  cantrips: z.number().nullable(),
  spells_known: z.number().nullable(),
  prepared: z.boolean().nullable(),
  caster_progression: z.enum(["full", "half", "third", "pact"]).nullable(),
  progression: z
    .array(
      z.object({
        level: z.number(),
        cantrips: z.number(),
        prepared: z.number(),
        max_spell_level: z.number(),
      }),
    )
    .nullable(),
  explicit_slot_progression: z
    .array(
      z.object({
        level: z.number(),
        slots: z.array(z.number()),
      }),
    )
    .nullable(),
  point_pool: z
    .object({
      resource_key: z.string(),
      cost_by_level: z.record(z.string(), z.number()),
      base_cost_cap_resource_key: z.string().nullable(),
      metamagic_cost_cap: z.enum(["proficiency_bonus"]).nullable(),
      replaces_spell_slots: z.boolean(),
    })
    .nullable(),
  hit_point_cost_by_level: z.record(z.string(), z.number()).nullable().optional(),
})

const SkillChoicesAiSchema = z.object({
  count: z.number(),
  options: z.array(z.string()),
  fixed: z.array(z.string()).nullable(),
})

const UsesAtLevelAiSchema = z.object({
  level: z.number(),
  count: z.number(),
})

const UsesConfigAiSchema = z.object({
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
  fixedAmount: z.number().nullable(),
  abilityModifier: z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"]).nullable(),
  specialDescription: z.string().nullable(),
  atLevelTable: z.array(UsesAtLevelAiSchema).nullable(),
  atLevelMode: z.enum(["tier", "multiply_level"]).nullable(),
  recharges: z
    .array(
      z.union([
        z.enum(["short_rest", "long_rest"]),
        z.object({
          rest: z.enum(["short_rest", "long_rest"]),
          amount: z.number().nullable(),
          amountFormula: z
            .enum([
              "half_class_level_round_up",
              "half_class_level_round_down",
              "ability_modifier",
              "proficiency_bonus",
            ])
            .nullable(),
          amountFormulaAbility: z
            .enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"])
            .nullable(),
          amountFormulaBonus: z.number().nullable(),
          amountFormulaMinimum: z.number().nullable(),
          maxPerLongRest: z.number().nullable(),
        }),
      ]),
    )
    .nullable(),
  rechargeOverrides: z
    .array(
      z.object({
        atClassLevel: z.number(),
        recharges: z.array(
          z.object({
            rest: z.enum(["short_rest", "long_rest"]),
            amount: z.number().nullable(),
            amountFormula: z
              .enum([
                "half_class_level_round_up",
                "half_class_level_round_down",
                "ability_modifier",
                "proficiency_bonus",
              ])
              .nullable(),
            amountFormulaAbility: z
              .enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"])
              .nullable(),
            amountFormulaBonus: z.number().nullable(),
            amountFormulaMinimum: z.number().nullable(),
            maxPerLongRest: z.number().nullable(),
          }),
        ),
      }),
    )
    .nullable(),
  restoreBySpellSlot: z
    .object({
      minSpellLevel: z.number(),
      restores: z.number(),
    })
    .nullable(),
  useShareKey: z.string().nullable(),
  classResourceKey: z.string().nullable(),
  classResourceAmount: z.number().nullable(),
  dieType: z.enum(["d4", "d6", "d8", "d10", "d12", "d20"]).nullable(),
  dieSidesByLevel: z.array(UsesAtLevelAiSchema).nullable(),
  rechargeOnInitiative: z.union([z.boolean(), z.number()]).nullable(),
  freeUseAfterLevel: z.number().nullable(),
})

const NewToggleAiSchema = z.object({
  key: z.string(),
  name: z.string(),
  grantingFeature: z.string(),
})

const ClassResourceAiSchema = z.object({
  class_name: z.string(),
  subclass_name: z.string().nullable(),
  resource_key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  prerequisite_rules: z.array(PrerequisiteRuleAiSchema).nullable(),
  uses: UsesConfigAiSchema,
})

const ProposedClassResourceAiSchema = ClassResourceAiSchema.extend({
  proposal_id: z.string(),
  definition: z.string(),
})

const AbilityAiSchema = z.object({
  name: z.string(),
  description: z.string(),
  prerequisite_rules: z.array(PrerequisiteRuleAiSchema).nullable(),
  source_type: z
    .enum([
      "class",
      "subclass",
      "species",
      "background",
      "feat",
      "item",
      "compendium",
      "class_feature",
      "subclass_feature",
    ])
    .nullable(),
  source_name: z.string().nullable(),
  level_requirement: z.number().nullable(),
  mechanics: z.array(ImportMechanicAiSchema).nullable(),
  ability_role: z
    .enum([
      "discipline",
      "psionic_power",
      "talent_pool",
      "class_talent",
      "knack",
      "upgrade",
      "weapon_mastery",
      "bomb_formula",
      "discovery",
      "alchemist_bomb",
    ])
    .nullable(),
  casting_time: z.string().nullable(),
  execution: z.string().nullable(),
  eligible_classes: z.array(z.string()).nullable(),
  range: z.string().nullable(),
  components: z.array(z.string()).nullable(),
  duration: z.string().nullable(),
  concentration: z.boolean().nullable(),
  prerequisite: z.string().nullable(),
  repeatable: z.boolean().nullable(),
  source_page: z.number().nullable(),
  isChoice: z.boolean().nullable(),
  choices: ChoiceOptionsAiSchema.nullable(),
  specialization_choices: ChoiceOptionsAiSchema.nullable().describe(
    "One-time Specialization sub-choice when choices already holds Discipline Talents; each option may embed a replacement Alternate Effects HTML table",
  ),
})

const ProposedCustomAbilityAiSchema = AbilityAiSchema.extend({
  proposal_id: z.string(),
  definition: z.string(),
})

const ImportProposalsAiSchema = z.object({
  class_resources: z.array(ProposedClassResourceAiSchema).nullable(),
  custom_abilities: z.array(ProposedCustomAbilityAiSchema).nullable(),
})

const StartingEquipmentGroupAiSchema = z.object({
  description: z
    .string()
    .describe('Choice prompt, e.g. "Choose A or B:" — one group wraps all packages'),
  options: z
    .array(
      z.object({
        label: z.string().describe('Package label, e.g. "A" or "B"'),
        items: z.array(
          z.object({
            name: z.string(),
            quantity: z.number(),
          }),
        ),
      }),
    )
    .describe(
      "Nested packages only — never emit a flat array of {label,items} as starting_equipment_groups itself",
    ),
})

const ClassAiSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  prerequisite_rules: z.array(PrerequisiteRuleAiSchema).nullable(),
  icon: z.string().nullable().optional(),
  creator_url: z.string().max(512).nullable().optional(),
  source: z.string().nullable().optional(),
  card_image_url: z.string().nullable().optional(),
  card_blurb: z.string().max(120).nullable(),
  hit_die: z.number().nullable(),
  primary_ability: z.array(z.string()).nullable(),
  saving_throws: z.array(z.string()).nullable(),
  armor_proficiencies: z.array(z.string()).nullable(),
  weapon_proficiencies: z.array(z.string()).nullable(),
  tool_proficiencies: z.array(z.string()).nullable(),
  skill_choices: SkillChoicesAiSchema.nullable(),
  spellcasting: SpellcastingAiSchema.nullable(),
  features: z.array(ClassFeatureAiSchema).nullable(),
  spell_list: z.array(z.string()).nullable(),
  starting_equipment_groups: z.array(StartingEquipmentGroupAiSchema).nullable(),
  starting_gold: z.number().nullable(),
  new_toggles: z.array(NewToggleAiSchema).nullable(),
})

const SubclassAiSchema = z.object({
  name: z.string(),
  class_name: z.string(),
  source: z.string().nullable(),
  description: z.string().nullable(),
  card_blurb: z.string().max(120).nullable(),
  prerequisite_rules: z.array(PrerequisiteRuleAiSchema).nullable(),
  features: z.array(ClassFeatureAiSchema),
  new_toggles: z.array(NewToggleAiSchema).nullable(),
  spellcasting: SpellcastingAiSchema.nullable(),
})

const SpeciesAiSchema = z.object({
  name: z.string(),
  source: z.string().nullable(),
  card_image_url: z.string().nullable(),
  description: z.string().nullable(),
  prerequisite_rules: z.array(PrerequisiteRuleAiSchema).nullable(),
  creature_type: z.string().nullable(),
  size_options: z.array(z.enum(["Small", "Medium"])).nullable(),
  speed: z.number().nullable(),
  size: z.string().nullable(),
  traits: z.array(SpeciesTraitAiSchema),
})

const FeatAiSchema = z.object({
  name: z.string(),
  source: z.string().nullable(),
  description: z.string().nullable(),
  prerequisite: z.string().nullable(),
  prerequisite_rules: z.array(PrerequisiteRuleAiSchema).nullable(),
  category: z.string().nullable(),
  level_requirement: z.number().nullable().optional(),
  recommended_classes: z.array(z.string()).nullable().optional(),
  isChoice: z.boolean().nullable(),
  choices: ChoiceOptionsAiSchema.nullable(),
  mechanics: z.array(ImportMechanicAiSchema).nullable(),
})

const CreatureAbilityEntryAiSchema = z.object({
  unlock_level_label: z.string().nullable(),
  unlock_level_number: z.number().nullable(),
  name: z.string(),
  tag: z.string().nullable(),
  text: z.string(),
})

const CreatureAbilityScoreAiSchema = z.object({
  score: z.number(),
  mod: z.string(),
  save: z.string(),
})

const CreatureAiSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  creature_type: z.string().nullable(),
  size: z.string().nullable(),
  alignment: z.string().nullable(),
  /** "creature" (fixed CR) or "companion" (owner-scaled). Prefer schema v2.0 fields when known. */
  category: z.enum(["creature", "companion", "monster"]).nullable(),
  cr: z.string().nullable(),
  xp: z.number().nullable(),
  proficiency_bonus: z.string().nullable(),
  scaling: z
    .object({
      scales_with: z.string(),
      notes: z.string(),
    })
    .nullable(),
  ac: z.string().nullable(),
  ac_note: z.string().nullable(),
  initiative_modifier: z.string().nullable(),
  initiative_passive: z.number().nullable(),
  hp: z.string().nullable(),
  hit_dice: z.string().nullable(),
  speed: z
    .object({
      walk: z.number().nullable(),
      fly: z.number().nullable(),
      swim: z.number().nullable(),
      climb: z.number().nullable(),
      burrow: z.number().nullable(),
      notes: z.string().nullable(),
    })
    .nullable(),
  ability_scores: z
    .object({
      str: CreatureAbilityScoreAiSchema,
      dex: CreatureAbilityScoreAiSchema,
      con: CreatureAbilityScoreAiSchema,
      int: CreatureAbilityScoreAiSchema,
      wis: CreatureAbilityScoreAiSchema,
      cha: CreatureAbilityScoreAiSchema,
    })
    .nullable(),
  skills: z.string().nullable(),
  proficiencies: z.string().nullable(),
  gear: z.string().nullable(),
  resistances: z.string().nullable(),
  damage_immunities: z.string().nullable(),
  condition_immunities: z.string().nullable(),
  vulnerabilities: z.string().nullable(),
  senses: z
    .object({
      darkvision: z.number().nullable(),
      blindsight: z.number().nullable(),
      tremorsense: z.number().nullable(),
      truesight: z.number().nullable(),
      passive_perception: z.number().nullable(),
    })
    .nullable(),
  languages: z.string().nullable(),
  traits: z.array(CreatureAbilityEntryAiSchema).nullable(),
  actions: z.array(CreatureAbilityEntryAiSchema).nullable(),
  bonus_actions: z.array(CreatureAbilityEntryAiSchema).nullable(),
  reactions: z.array(CreatureAbilityEntryAiSchema).nullable(),
  legendary_actions: z.array(CreatureAbilityEntryAiSchema).nullable(),
  /** Full stat-block prose fallback when structured fields are incomplete. */
  stat_block_text: z.string().nullable(),
  prerequisite_rules: z.array(PrerequisiteRuleAiSchema).nullable(),
  source: z.string().nullable(),
})

const SpellAiSchema = z.object({
  name: z.string(),
  source: z.string().nullable(),
  level: z.number(),
  school: z.string(),
  casting_time: z.string().nullable(),
  range: z.string().nullable(),
  components: z.array(z.string()).nullable(),
  duration: z.string().nullable(),
  concentration: z.boolean(),
  description: z.string().nullable(),
  prerequisite_rules: z.array(PrerequisiteRuleAiSchema).nullable(),
  classes: z.array(z.string()).nullable(),
})

/** Fixed ability keys so structured output cannot invent typos like "desktop". */
const BackgroundAbilityBonusesAiSchema = z.object({
  strength: z.number().nullable(),
  dexterity: z.number().nullable(),
  constitution: z.number().nullable(),
  intelligence: z.number().nullable(),
  wisdom: z.number().nullable(),
  charisma: z.number().nullable(),
})

const BackgroundAiSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  source: z.string().nullable(),
  prerequisite_rules: z.array(PrerequisiteRuleAiSchema).nullable(),
  skill_proficiencies: z.array(z.string()).nullable(),
  tool_proficiencies: z.array(z.string()).nullable(),
  feat_granted: z.string().nullable(),
  ability_bonuses: BackgroundAbilityBonusesAiSchema.nullable(),
  feature: z.object({ name: z.string(), description: z.string() }).nullable(),
  grants_spells: z.boolean().nullable(),
  granted_spells: z.record(z.string(), z.array(z.string())).nullable(),
  proficiencies: z
    .object({
      tools: z.array(z.string()).nullable(),
      vehicles: z.array(z.string()).nullable(),
      weapons: z.array(z.string()).nullable(),
      armor: z.array(z.string()).nullable(),
      languages: z.array(z.string()).nullable(),
    })
    .nullable(),
  starting_equipment: z
    .array(z.object({ name: z.string(), quantity: z.number() }))
    .nullable(),
  starting_equipment_groups: z.array(StartingEquipmentGroupAiSchema).nullable(),
  starting_gold: z.number().nullable(),
})

const EquipmentWeaponFormAiSchema = z.object({
  name: z.string(),
  damage: z.string().nullable(),
  mastery: z.string().nullable(),
  properties: z.array(z.string()).nullable(),
})

const EquipmentPropertiesAiSchema = z.object({
  damage: z.string().nullable(),
  mastery: z.string().nullable(),
  properties: z.array(z.string()).nullable(),
  ac: z.string().nullable(),
  forms: z.array(EquipmentWeaponFormAiSchema).nullable(),
})

const EquipmentAiSchema = z.object({
  name: z.string(),
  source: z.string().nullable(),
  category: z.string(),
  subcategory: z.string().nullable(),
  description: z.string().nullable(),
  prerequisite_rules: z.array(PrerequisiteRuleAiSchema).nullable(),
  cost: z.object({ amount: z.number(), unit: z.string() }).nullable(),
  weight: z.number().nullable(),
  properties: EquipmentPropertiesAiSchema.nullable(),
  requires_attunement: z.boolean().nullable(),
  magic_item_category: z.string().nullable(),
  rarity: z.string().nullable(),
})

const LanguageAiSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  pool: z.enum(["standard", "rare"]).nullable(),
  typical_speakers: z.string().nullable(),
  script: z.string().nullable(),
  source: z.string().nullable(),
  icon: z.string().nullable(),
})

const CardArtAiSchema = z.object({
  content_type: z.enum([
    "class",
    "subclass",
    "species",
    "background",
    "spell",
    "equipment",
    "ability",
  ]),
  name: z.string(),
  card_image_url: z.string(),
  class_name: z.string().nullable(),
})

const ImportContentAiSchemaBase = z.object({
  species: z.array(SpeciesAiSchema).nullable(),
  classes: z.array(ClassAiSchema).nullable(),
  class_resources: z.array(ClassResourceAiSchema).nullable(),
  subclasses: z.array(SubclassAiSchema).nullable(),
  backgrounds: z.array(BackgroundAiSchema).nullable(),
  spells: z.array(SpellAiSchema).nullable(),
  feats: z.array(FeatAiSchema).nullable(),
  creatures: z.array(CreatureAiSchema).nullable(),
  equipment: z.array(EquipmentAiSchema).nullable(),
  languages: z.array(LanguageAiSchema).nullable(),
  import_proposals: ImportProposalsAiSchema.nullable(),
  card_art: z.array(CardArtAiSchema).nullable(),
})

const ImportContentAiSchemaWithAbilities = ImportContentAiSchemaBase.extend({
  abilities: z.array(AbilityAiSchema).nullable(),
})

export type AiImportContent = z.infer<typeof ImportContentAiSchemaWithAbilities>

/** Zod schema for AI structured extraction (OpenAI strict JSON schema compatible). */
export function buildImportContentAiSchema(options?: {
  includeAbilities?: boolean
  contentTypeHint?: string | null
}) {
  const hint = options?.contentTypeHint?.trim().toLowerCase()
  if (!hint || hint === "all") {
    if (options?.includeAbilities) return ImportContentAiSchemaWithAbilities
    return ImportContentAiSchemaBase
  }

  switch (hint) {
    case "classes":
      return z.object({
        classes: z.array(ClassAiSchema).nullable(),
        subclasses: z.array(SubclassAiSchema).nullable(),
        class_resources: z.array(ClassResourceAiSchema).nullable(),
        spells: z.array(SpellAiSchema).nullable(),
        import_proposals: ImportProposalsAiSchema.nullable(),
      })
    case "subclasses":
      return z.object({
        subclasses: z.array(SubclassAiSchema).nullable(),
        classes: z.array(ClassAiSchema).nullable(),
        spells: z.array(SpellAiSchema).nullable(),
        import_proposals: ImportProposalsAiSchema.nullable(),
      })
    case "species":
      return z.object({
        species: z.array(SpeciesAiSchema).nullable(),
      })
    case "spells":
      return z.object({
        spells: z.array(SpellAiSchema).nullable(),
      })
    case "spell_lists":
      return z.object({
        classes: z.array(ClassAiSchema).nullable(),
        spells: z.array(SpellAiSchema).nullable(),
      })
    case "feats":
      return z.object({
        feats: z.array(FeatAiSchema).nullable(),
      })
    case "creatures":
      return z.object({
        creatures: z.array(CreatureAiSchema).nullable(),
      })
    case "backgrounds":
      return z.object({
        backgrounds: z.array(BackgroundAiSchema).nullable(),
      })
    case "equipment":
      return z.object({
        equipment: z.array(EquipmentAiSchema).nullable(),
      })
    case "languages":
      return z.object({
        languages: z.array(LanguageAiSchema).nullable(),
      })
    case "images":
      return z.object({
        card_art: z.array(CardArtAiSchema).nullable(),
      })
    default:
      if (options?.includeAbilities) return ImportContentAiSchemaWithAbilities
      return ImportContentAiSchemaBase
  }
}

/** Pre-wrapped schema for `Output.object()` / OpenAI strict JSON mode. */
export function buildImportContentAiOutputSchema(options?: {
  includeAbilities?: boolean
  contentTypeHint?: string | null
}) {
  return zodSchema(buildImportContentAiSchema(options) as Parameters<typeof zodSchema>[0])
}

function omitNull<T extends Record<string, unknown>>(row: T): Partial<T> {
  const next: Partial<T> = {}
  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined) continue
    next[key as keyof T] = value as T[keyof T]
  }
  return next
}

function normalizeSkillChoices(
  row: z.infer<typeof SkillChoicesAiSchema> | null | undefined,
): NonNullable<ImportContent["classes"]>[number]["skill_choices"] {
  if (!row?.options?.length || !(row.count > 0)) return undefined
  const fixed = (row.fixed ?? []).map((entry) => entry.trim()).filter(Boolean)
  return {
    count: row.count,
    options: row.options,
    ...(fixed.length ? { fixed } : {}),
  }
}

type ImportChoiceOptions = NonNullable<
  NonNullable<ImportContent["classes"]>[number]["features"][number]["choices"]
>

type PersistedModifierFields = {
  linkedModifiers?: unknown
  modifierRefs?: unknown
  importModifierMeta?: unknown
}

function pickPersistedModifierFields(row: PersistedModifierFields) {
  return omitNull({
    linkedModifiers: Array.isArray(row.linkedModifiers) ? row.linkedModifiers : undefined,
    modifierRefs: Array.isArray(row.modifierRefs) ? row.modifierRefs : undefined,
    importModifierMeta: Array.isArray(row.importModifierMeta) ? row.importModifierMeta : undefined,
  })
}

function normalizeChoiceOptions(
  choices: z.infer<typeof ChoiceOptionsAiSchema> | null | undefined,
): ImportChoiceOptions | undefined {
  if (!choices) return undefined
  return {
    category: choices.category,
    count: choices.count,
    options: choices.options.map((option) =>
      omitNull({
        name: option.name,
        description: option.description,
        prerequisite: option.prerequisite,
        repeatable: option.repeatable,
        ...pickPersistedModifierFields(option as PersistedModifierFields),
      }),
    ) as ImportChoiceOptions["options"],
    ...omitNull({
      optionsSource: choices.optionsSource,
      resourceKey: choices.resourceKey,
      choiceCountByLevel: choices.choiceCountByLevel,
      swappableOnRest: choices.swappableOnRest,
      swapRestType: choices.swapRestType,
    }),
  } as ImportChoiceOptions
}

/** Drop null ability slots from structured-output objects; null/empty → null (legacy). */
function compactBackgroundAbilityBonuses(
  bonuses: z.infer<typeof BackgroundAbilityBonusesAiSchema> | null | undefined,
): Record<string, number> | null {
  if (!bonuses) return null
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(bonuses)) {
    if (typeof value === "number") out[key] = value
  }
  return Object.keys(out).length > 0 ? out : null
}

function normalizeUsesConfig(
  uses: z.infer<typeof UsesConfigAiSchema>,
): NonNullable<ImportContent["class_resources"]>[number]["uses"] {
  const next = omitNull(uses) as unknown as Record<string, unknown>
  if (Array.isArray(next.recharges)) {
    next.recharges = next.recharges
      .map((entry) => {
        // Templates and some LLM output use ["short_rest","long_rest"] instead of [{rest}].
        if (typeof entry === "string") {
          if (entry === "short_rest" || entry === "long_rest") return { rest: entry }
          return null
        }
        if (entry && typeof entry === "object") {
          return omitNull(entry as Record<string, unknown>)
        }
        return null
      })
      .filter(Boolean)
  }
  if (Array.isArray(next.rechargeOverrides)) {
    next.rechargeOverrides = next.rechargeOverrides.map((override) => {
      const cleaned = omitNull(override as Record<string, unknown>)
      if (Array.isArray(cleaned.recharges)) {
        cleaned.recharges = cleaned.recharges.map((entry) =>
          omitNull(entry as Record<string, unknown>),
        )
      }
      return cleaned
    })
  }
  if (next.restoreBySpellSlot && typeof next.restoreBySpellSlot === "object") {
    next.restoreBySpellSlot = omitNull(next.restoreBySpellSlot as Record<string, unknown>)
  }
  return next as NonNullable<ImportContent["class_resources"]>[number]["uses"]
}

function normalizeMechanics(
  mechanics: z.infer<typeof ImportMechanicAiSchema>[] | null | undefined,
): ImportMechanic[] | undefined {
  if (!mechanics?.length) return undefined
  const cleaned: ImportMechanic[] = []
  for (const entry of mechanics) {
    const shallow = omitNull(entry as unknown as Record<string, unknown>)
    if (Array.isArray(shallow.menuOptions)) {
      shallow.menuOptions = shallow.menuOptions.map((option) =>
        omitNull(option as unknown as Record<string, unknown>),
      )
    }
    if (shallow.bonusConfig && typeof shallow.bonusConfig === "object") {
      shallow.bonusConfig = omitNull(
        shallow.bonusConfig as unknown as Record<string, unknown>,
      )
    }
    const parsed = ImportMechanicSchema.safeParse(shallow)
    if (parsed.success) cleaned.push(parsed.data)
  }
  return cleaned.length ? cleaned : undefined
}

function normalizeFeatureLike(
  feature: z.infer<typeof ClassFeatureAiSchema>,
): ImportContent["classes"] extends (infer T)[] | undefined
  ? T extends { features: (infer F)[] }
    ? F
    : never
  : never {
  // AI schema omits linkedModifiers (BYO contract), but Dump Stat / Drive JSON may
  // already carry them — preserve on normalize so parse/import does not strip wiring.
  const next = omitNull({
    level: feature.level,
    name: feature.name,
    description: feature.description,
    prerequisite_rules: feature.prerequisite_rules,
    isChoice: feature.isChoice === true ? true : undefined,
    choices: normalizeChoiceOptions(feature.choices),
    mechanics: normalizeMechanics(feature.mechanics),
    basedOnSrdFeature: feature.basedOnSrdFeature ?? undefined,
    ...pickPersistedModifierFields(feature as PersistedModifierFields),
  })
  return next as ImportContent["classes"] extends (infer T)[] | undefined
    ? T extends { features: (infer F)[] }
      ? F
      : never
    : never
}

function normalizeSpellcasting(
  spellcasting: z.infer<typeof SpellcastingAiSchema> | null | undefined,
): NonNullable<NonNullable<ImportContent["classes"]>[number]["spellcasting"]> | undefined {
  if (!spellcasting) return undefined
  const pointPool = spellcasting.point_pool
    ? omitNull({
        resource_key: spellcasting.point_pool.resource_key,
        cost_by_level: spellcasting.point_pool.cost_by_level,
        base_cost_cap_resource_key: spellcasting.point_pool.base_cost_cap_resource_key,
        metamagic_cost_cap: spellcasting.point_pool.metamagic_cost_cap,
        replaces_spell_slots: spellcasting.point_pool.replaces_spell_slots,
      })
    : undefined
  return omitNull({
    ability: spellcasting.ability,
    cantrips: spellcasting.cantrips,
    spells_known: spellcasting.spells_known,
    prepared: spellcasting.prepared,
    caster_progression: spellcasting.caster_progression,
    progression: spellcasting.progression,
    explicit_slot_progression: spellcasting.explicit_slot_progression,
    point_pool: pointPool,
    hit_point_cost_by_level: spellcasting.hit_point_cost_by_level,
  }) as NonNullable<NonNullable<ImportContent["classes"]>[number]["spellcasting"]>
}

function normalizeClassRow(row: z.infer<typeof ClassAiSchema>): NonNullable<ImportContent["classes"]>[number] {
  const spellcasting = normalizeSpellcasting(row.spellcasting)

  return {
    name: row.name,
    description: row.description,
    prerequisite_rules: row.prerequisite_rules ?? undefined,
    hit_die: row.hit_die ?? 8,
    primary_ability: row.primary_ability,
    features: (row.features ?? []).map(normalizeFeatureLike),
    ...omitNull({
      icon: row.icon,
      creator_url: row.creator_url,
      source: row.source,
      card_image_url: row.card_image_url,
      card_blurb: row.card_blurb,
      saving_throws: row.saving_throws,
      armor_proficiencies: row.armor_proficiencies,
      weapon_proficiencies: row.weapon_proficiencies,
      tool_proficiencies: row.tool_proficiencies,
      skill_choices: normalizeSkillChoices(row.skill_choices),
      spell_list: row.spell_list,
      starting_equipment_groups: row.starting_equipment_groups,
      starting_gold: row.starting_gold,
      new_toggles: row.new_toggles?.length ? row.new_toggles : undefined,
    }),
    ...(spellcasting && Object.keys(spellcasting).length ? { spellcasting } : {}),
  } as NonNullable<ImportContent["classes"]>[number]
}

/** Strip null placeholders from AI output and coerce to ImportContent. */
function normalizeAbilitySourceType(
  sourceType: string | null | undefined,
): NonNullable<ImportContent["abilities"]>[number]["source_type"] {
  if (!sourceType) return null
  if (sourceType === "class_feature") return "class"
  if (sourceType === "subclass_feature") return "subclass"
  const allowed = ["class", "subclass", "species", "background", "feat", "item", "compendium"] as const
  return (allowed as readonly string[]).includes(sourceType)
    ? (sourceType as (typeof allowed)[number])
    : null
}

export function normalizeAiImportContent(raw: AiImportContent): ImportContent {
  const content: ImportContent = {}

  if (raw.species?.length) {
    content.species = raw.species.map((species) => ({
      name: species.name,
      source: species.source,
      card_image_url: species.card_image_url,
      description: species.description,
      prerequisite_rules: species.prerequisite_rules ?? undefined,
      creature_type: species.creature_type,
      size_options: species.size_options,
      speed: species.speed,
      size: species.size,
      traits: species.traits.map((trait) =>
        omitNull({
          name: trait.name,
          description: trait.description,
          prerequisite_rules: trait.prerequisite_rules,
          isChoice: trait.isChoice === true ? true : undefined,
          choices: normalizeChoiceOptions(trait.choices),
          mechanics: normalizeMechanics(trait.mechanics),
          basedOnSrdFeature: trait.basedOnSrdFeature ?? undefined,
        }),
      ),
    })) as NonNullable<ImportContent["species"]>
  }

  if (raw.classes?.length) {
    content.classes = raw.classes.map(normalizeClassRow)
  }

  if (raw.class_resources?.length) {
    content.class_resources = raw.class_resources.map((resource) => {
      const row: NonNullable<ImportContent["class_resources"]>[number] = {
        class_name: resource.class_name,
        resource_key: resource.resource_key,
        name: resource.name,
        uses: normalizeUsesConfig(resource.uses),
      }
      if (resource.description != null) row.description = resource.description
      if (resource.prerequisite_rules?.length) {
        row.prerequisite_rules = resource.prerequisite_rules
      }
      const subclassName = resource.subclass_name?.trim()
      if (subclassName) row.subclass_name = subclassName
      return row
    })
  }

  if (raw.subclasses?.length) {
    content.subclasses = raw.subclasses.map((subclass) => {
      const spellcasting = normalizeSpellcasting(subclass.spellcasting)
      return {
        name: subclass.name,
        class_name: subclass.class_name,
        description: subclass.description,
        prerequisite_rules: subclass.prerequisite_rules ?? undefined,
        features: subclass.features.map(normalizeFeatureLike),
        ...omitNull({
          source: subclass.source,
          card_blurb: subclass.card_blurb,
          new_toggles: subclass.new_toggles?.length ? subclass.new_toggles : undefined,
        }),
        ...(spellcasting ? { spellcasting } : {}),
      }
    })
  }

  if (raw.backgrounds?.length) {
    content.backgrounds = raw.backgrounds.map((background) => {
      const abilityBonuses = compactBackgroundAbilityBonuses(background.ability_bonuses)
      return {
        name: background.name,
        description: background.description,
        skill_proficiencies: background.skill_proficiencies,
        feat_granted: background.feat_granted,
        ability_bonuses: abilityBonuses,
        ...omitNull({
          source: background.source,
          prerequisite_rules: background.prerequisite_rules,
          tool_proficiencies: background.tool_proficiencies,
          feature: background.feature,
          grants_spells: background.grants_spells === true ? true : undefined,
          granted_spells: background.granted_spells,
          proficiencies: background.proficiencies,
          starting_equipment: background.starting_equipment,
          starting_equipment_groups: background.starting_equipment_groups,
          starting_gold: background.starting_gold,
        }),
      }
    }) as NonNullable<ImportContent["backgrounds"]>
  }

  if (raw.spells?.length) {
    content.spells = normalizeSpellImportRows(raw.spells as unknown as Record<string, unknown>[])
  }

  if (raw.feats?.length) {
    content.feats = raw.feats.map((feat) =>
      omitNull({
        name: feat.name,
        source: feat.source,
        description: feat.description,
        prerequisite: feat.prerequisite,
        prerequisite_rules: feat.prerequisite_rules,
        category: feat.category,
        level_requirement: feat.level_requirement,
        recommended_classes: feat.recommended_classes?.length
          ? feat.recommended_classes
          : undefined,
        isChoice: feat.isChoice === true ? true : undefined,
        choices: normalizeChoiceOptions(feat.choices),
        mechanics: normalizeMechanics(feat.mechanics),
      }),
    ) as NonNullable<ImportContent["feats"]>
  }

  if (raw.creatures?.length) {
    content.creatures = raw.creatures.map((creature) => {
      const description = creature.stat_block_text ?? creature.description
      const base = omitNull({
        name: creature.name,
        description,
        creature_type: creature.creature_type,
        size: creature.size,
        alignment: creature.alignment,
        cr: creature.cr,
        prerequisite_rules: creature.prerequisite_rules,
        source: creature.source,
      })

      // Prefer schema v2.0 when the model populated category + combat fields.
      if (creature.category && creature.ac && creature.hp && creature.ability_scores && creature.speed && creature.senses) {
        const category =
          creature.category === "monster" ? "creature" : creature.category
        return omitNull({
          ...base,
          category,
          xp: creature.xp,
          proficiency_bonus: creature.proficiency_bonus,
          scaling: creature.scaling,
          ac: creature.ac,
          ac_note: creature.ac_note,
          initiative_modifier: creature.initiative_modifier,
          initiative_passive: creature.initiative_passive,
          hp: creature.hp,
          hit_dice: creature.hit_dice,
          speed: creature.speed,
          ability_scores: creature.ability_scores,
          skills: creature.skills,
          proficiencies: creature.proficiencies,
          gear: creature.gear,
          resistances: creature.resistances,
          damage_immunities: creature.damage_immunities,
          condition_immunities: creature.condition_immunities,
          vulnerabilities: creature.vulnerabilities,
          senses: creature.senses,
          languages: creature.languages,
          traits: creature.traits,
          actions: creature.actions,
          bonus_actions: creature.bonus_actions,
          reactions: creature.reactions,
          legendary_actions: creature.legendary_actions,
          description: description ?? `${creature.name}`,
        })
      }

      return base
    }) as NonNullable<ImportContent["creatures"]>
  }

  if (raw.equipment?.length) {
    content.equipment = raw.equipment.map((item) =>
      coerceMagicEquipmentImportFields(
        omitNull({
          name: item.name,
          source: item.source,
          category: item.category,
          subcategory: item.subcategory,
          description: item.description,
          prerequisite_rules: item.prerequisite_rules,
          cost: item.cost,
          weight: item.weight,
          properties: item.properties,
          requires_attunement: item.requires_attunement,
          magic_item_category: item.magic_item_category,
          rarity: item.rarity,
        }) as unknown as Record<string, unknown>,
      ),
    ) as NonNullable<ImportContent["equipment"]>
  }

  if (raw.languages?.length) {
    content.languages = raw.languages.map((language) =>
      omitNull({
        name: language.name,
        description: language.description,
        pool: language.pool ?? undefined,
        typical_speakers: language.typical_speakers,
        script: language.script,
        source: language.source,
        icon: language.icon,
      }),
    ) as NonNullable<ImportContent["languages"]>
  }

  if (raw.abilities?.length) {
    content.abilities = raw.abilities.map((ability) => {
      const { ability_role: _abilityRole, source_type: _sourceType, mechanics: _mechanics, ...rest } =
        ability
      return omitNull({
        ...rest,
        source_type: normalizeAbilitySourceType(ability.source_type),
        mechanics: normalizeMechanics(ability.mechanics),
        ability_role: ability.ability_role ?? undefined,
      })
    }) as NonNullable<ImportContent["abilities"]>
  }

  if (raw.import_proposals) {
    const proposals: NonNullable<ImportContent["import_proposals"]> = {}
    if (raw.import_proposals.class_resources?.length) {
      proposals.class_resources = raw.import_proposals.class_resources.map((resource) => {
        const row: NonNullable<
          NonNullable<ImportContent["import_proposals"]>["class_resources"]
        >[number] = {
          proposal_id: resource.proposal_id,
          definition: resource.definition,
          class_name: resource.class_name,
          resource_key: resource.resource_key,
          name: resource.name,
          uses: normalizeUsesConfig(resource.uses),
        }
        if (resource.description != null) row.description = resource.description
        const subclassName = resource.subclass_name?.trim()
        if (subclassName) row.subclass_name = subclassName
        return row
      })
    }
    if (raw.import_proposals.custom_abilities?.length) {
      proposals.custom_abilities = raw.import_proposals.custom_abilities.map((ability) =>
        omitNull({
          proposal_id: ability.proposal_id,
          definition: ability.definition,
          name: ability.name,
          description: ability.description,
          source_type: normalizeAbilitySourceType(ability.source_type),
          source_name: ability.source_name,
          level_requirement: ability.level_requirement,
          ability_role: ability.ability_role ?? undefined,
          casting_time: ability.casting_time ?? undefined,
          execution: ability.execution ?? undefined,
          eligible_classes: ability.eligible_classes ?? undefined,
          range: ability.range ?? undefined,
          components: ability.components ?? undefined,
          duration: ability.duration ?? undefined,
          concentration: ability.concentration ?? undefined,
          prerequisite: ability.prerequisite ?? undefined,
          prerequisite_rules: ability.prerequisite_rules ?? undefined,
          repeatable: ability.repeatable ?? undefined,
          choices: normalizeChoiceOptions(ability.choices),
          specialization_choices: normalizeChoiceOptions(ability.specialization_choices),
        }),
      ) as NonNullable<NonNullable<ImportContent["import_proposals"]>["custom_abilities"]>
    }
    if (proposals.class_resources?.length || proposals.custom_abilities?.length) {
      content.import_proposals = proposals
    }
  }

  if (raw.card_art?.length) {
    content.card_art = raw.card_art
      .map((entry) =>
        omitNull({
          content_type: entry.content_type,
          name: entry.name,
          card_image_url: entry.card_image_url,
          class_name: entry.class_name,
        }),
      )
      .filter(
        (entry): entry is NonNullable<ImportContent["card_art"]>[number] =>
          Boolean(entry.name && entry.card_image_url && entry.content_type),
      )
  }

  return content
}
