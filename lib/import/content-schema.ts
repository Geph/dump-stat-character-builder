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
  bonusDice: z.string().optional(),
  damageType: z.string().optional(),
  damageTypes: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
  speedType: z.enum(["walk", "fly", "swim", "climb"]).optional(),
  speedFeet: z.number().optional(),
  visionRangeFeet: z.number().optional(),
  usesFixed: z.number().optional(),
  usesAbility: z.enum(USES_ABILITY_CODES).optional(),
  usesRecharge: z.enum(["short_rest", "long_rest", "both"]).optional(),
  checkRollMode: z.enum(["advantage", "disadvantage"]).optional(),
  checkCategory: z.enum(["save", "skill", "ability", "attack", "initiative"]).optional(),
  checkAbility: z.enum(SAVE_ABILITY_NAMES).optional(),
  checkSkills: z.array(z.string()).optional(),
  featCategories: z
    .array(
      z.enum([
        "Origin",
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
})

export type ImportMechanic = z.infer<typeof ImportMechanicSchema>

export const ChoiceOptionsSchema = z.object({
  category: z.string(),
  count: z.number(),
  options: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      prerequisite: z.string().nullable().optional(),
      repeatable: z.boolean().optional(),
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
    .optional(),
  resourceKey: z.string().nullable().optional(),
  swappableOnRest: z.boolean().optional(),
  swapRestType: z.enum(["short", "long"]).optional(),
})

export const SpeciesTraitSchema = z.object({
  name: z.string(),
  description: z.string(),
  isChoice: z.boolean().optional(),
  choices: ChoiceOptionsSchema.optional(),
  mechanics: z.array(ImportMechanicSchema).optional(),
})

export const ClassFeatureSchema = z.object({
  level: z.number(),
  name: z.string(),
  description: z.string(),
  isChoice: z.boolean().optional(),
  choices: ChoiceOptionsSchema.optional(),
  mechanics: z.array(ImportMechanicSchema).optional(),
  psionic_augments: z.unknown().optional(),
  sheetDisplay: z
    .object({
      abilitiesActions: z.boolean().optional(),
      combatActions: z.boolean().optional(),
      featuresTab: z.boolean().optional(),
    })
    .optional(),
})

export const SubclassImportSchema = z.object({
  name: z.string(),
  class_name: z.string(),
  description: z.string().nullable(),
  card_image_url: z.string().nullable().optional(),
  features: z.array(ClassFeatureSchema),
})

export const FeatImportSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  prerequisite: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  level_requirement: z.number().nullable().optional(),
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
  spellcasting: z
    .object({
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
    .nullable()
    .optional(),
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
- Omit chapter running heads, page numbers, nav ribbons, and d6 Ideals/Bonds/Flaws/Personality Trait tables from descriptions.`

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
  source_type: z.enum(["class", "subclass", "species", "background", "feat", "item"]).nullable(),
  source_name: z.string().nullable(),
  level_requirement: z.number().nullable(),
  companion_stat_block: z.record(z.unknown()).nullable().optional(),
  psionic_augments: z.unknown().optional(),
  casting_time: z.string().nullable().optional(),
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
})

export const ClassResourceImportSchema = z.object({
  class_name: z.string(),
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
- For feat picks (ASI, Epic Boon, fighting style feats), do NOT use isChoice — use grant_feat via description phrasing and/or mechanics[] (see Common Modifier wiring)`

export const FEAT_CATEGORY_IMPORT_HINT = `For feats, set category when the source labels them:
- "Origin" for Origin Feats (1st-level background-style feats)
- "Epic Boon" for Epic Boons (19th+ level boons)
- "Fighting Style" for fighting style options
- "Planar Pact" for Planar Pact feats (mutually exclusive pact feats like Fey Pact, Infernal Pact)
- "General" for other feats (default when unclear)
Do not embed the category name only in description — use the category field.
When the header says "Planar Pact Feat", set category to "Planar Pact" and put prerequisite text in prerequisite (not only in description).`

export const SUBCLASS_IMPORT_HINT = `For subclasses:
- Set class_name to the exact parent class (e.g. "Druid", "Fighter", "Sorcerer", "KibblesTasty Psion")
- Third-party subclass names (Psionic Archetype, Circle, Oath, Patron, etc.) still use the subclasses array
- Include all subclass features with their gain level
- Spell list features should keep HTML tables in description when present`

export const CLASS_RESOURCE_IMPORT_HINT = `For class_resources (custom class pools like Psi Points, Rage, Ki, Risk Dice):
- Extract rows when a class level table lists named resource columns (Psi Points, Psi Limit, Rage, Risk Dice, etc.)
- Set class_name to the parent class (e.g. "KibblesTasty Psion")
- resource_key: lowercase snake_case (e.g. "psi_points", "psi_limit")
- name: display name from the table header (e.g. "Psi Points")
- uses.type should be "at_level" with atLevelMode "tier" and atLevelTable [{ level, count }, ...] from the class table
- **Spendable pools** (Rage, Ki, Psi Points, Exploit Dice, etc.): include recharges (short_rest and/or long_rest)
- **Counters and caps** (Exploits Known, Psi Limit, Hexes Known, Ritual Level): use type "special" with atLevelTable and no recharges — these render as static caps, not depleting pools
- **Weapon Mastery** table columns do NOT become class_resources — wire the tier table into the Weapon Mastery feature's choices.choiceCountByLevel instead
- Also extract class_resources when rules text clearly defines a level-scaling pool even without a full table`

export const CUSTOM_CLASS_IMPORT_HINT = `For homebrew/custom classes (e.g. KibblesTasty Psion, Gunslinger):
- Put the full class in classes[] with hit_die, proficiencies, and all class features by level
- Put each subclass/archetype/path in subclasses[] with class_name set to the parent class
- Do NOT embed the class level progression table in classes[].description — only flavor and rules prose; table data becomes features[] and class_resources[]
- Extract starting_equipment_groups when an Equipment block lists choice groups (a)/(b)/(c) and fixed items; mirror { description, options: [{ label, items: [{ name, quantity }] }] }
- Disciplines, talents, or invocation-like options with point costs should be class/subclass features; note psi/point costs in description
- Custom spells and feats in spells[] and feats[]; set spell classes to include the custom class name`

export const IMPORT_PROPOSALS_HINT = `For import_proposals (user confirmation before creating compendium entries):
- Identify every class resource pool you find (Psi Points, Psi Limit, Rage, Ki, Sorcery Points, etc.)
- Put each in import_proposals.class_resources[] with proposal_id (snake_case), class_name, resource_key, name, uses, and definition
- definition: 1–3 sentences explaining what the pool is, how it is spent, and typical recharge — shown to the user before import
- Identify custom builder abilities: psionic disciplines, invocation lists, fighting-style pickers, and similar player-chosen option systems
- Put each in import_proposals.custom_abilities[] with proposal_id, name, definition, description, source_type, source_name, level_requirement, prerequisite (freeform), repeatable (when the knack can be learned multiple times), ability_role: "knack" for class Knack options (one proposal row per Knack — do not bundle into a single choices catalog)
- For knack pools, put a class feature with choices { category: "Knack", count: 1, resourceKey: "knacks_known", optionsSource: "class_knacks", swappableOnRest: true } — individual Knacks are separate custom_abilities rows
- For Inventor-style upgrades, put generic unrestricted upgrades as one custom_abilities proposal per upgrade option (ability_role: "upgrade", repeatable per option). Wire the class feature with choices { category: "Upgrade", resourceKey: "upgrades", optionsSource: "class_upgrades" }. Subclass-only upgrade lists stay deferred.
- For disciplines with talents, include choices { category, count, options: [{ name, description, prerequisite?, repeatable? }] } and mention talent count in definition
- Do NOT also duplicate the same entries in class_resources[] or abilities[] — proposals are reviewed first; omit level tables from class description`
