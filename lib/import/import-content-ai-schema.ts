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
  attackTarget: z.enum(["all", "melee", "ranged"]).nullable(),
  bonusDice: z.string().nullable(),
  damageType: z.string().nullable(),
  damageTypes: z.array(z.string()).nullable(),
  conditions: z.array(z.string()).nullable(),
  speedType: z.enum(["walk", "fly", "swim", "climb"]).nullable(),
  speedFeet: z.number().nullable(),
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
  classResourceCost: z.number().nullable(),
  classResourceCostMode: z
    .enum(["fixed", "up_to_proficiency_bonus", "up_to_ability_modifier"])
    .nullable(),
  classResourceCostAbility: z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"]).nullable(),
  checkRollMode: z.enum(["advantage", "disadvantage", "bonus"]).nullable(),
  checkCategory: z.enum(["save", "skill", "ability", "attack", "initiative", "death_save"]).nullable(),
  checkAbility: z
    .enum(["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"])
    .nullable(),
  checkSkills: z.array(z.string()).nullable(),
  conditionNote: z.string().nullable(),
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
  spellcastingAbility: z
    .enum(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"])
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
  automaticBonusMode: z
    .enum(["character_level", "half_character_level_round_down", "none"])
    .nullable(),
  scalingMode: z.enum(["none", "character_level", "half_character_level_round_down"]).nullable(),
  damageTypeOptions: z.array(z.string()).nullable(),
  initiativeMode: z.enum(["flat_bonus", "add_proficiency", "ability_modifier"]).nullable(),
  initiativeAbility: z
    .enum(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"])
    .nullable(),
  initiativeFlatBonus: z.number().nullable(),
  telepathyRangeFeet: z.number().nullable(),
  dieByLevel: z.array(z.object({ level: z.number(), die: z.string() })).nullable(),
  waiveResourceCost: z.boolean().nullable(),
  menuAbilityNames: z.array(z.string()).nullable(),
  amount: z.number().nullable(),
  amountDice: z.string().nullable(),
  amountScaling: z.enum(["character_level", "class_resource_die", "ability_modifier"]).nullable(),
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
  masteryProperties: z.array(z.string()).nullable(),
})

const ClassFeatureAiSchema = z.object({
  level: z.number(),
  name: z.string(),
  description: z.string(),
  isChoice: z.boolean().nullable(),
  choices: ChoiceOptionsAiSchema.nullable(),
  mechanics: z.array(ImportMechanicAiSchema).nullable(),
  basedOnSrdFeature: z.string().nullable(),
})

const SpeciesTraitAiSchema = z.object({
  name: z.string(),
  description: z.string(),
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
})

const SkillChoicesAiSchema = z.object({
  count: z.number(),
  options: z.array(z.string()),
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
      z.object({
        rest: z.enum(["short_rest", "long_rest"]),
        amount: z.number().nullable(),
      }),
    )
    .nullable(),
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
  uses: UsesConfigAiSchema,
})

const ProposedClassResourceAiSchema = ClassResourceAiSchema.extend({
  proposal_id: z.string(),
  definition: z.string(),
})

const AbilityAiSchema = z.object({
  name: z.string(),
  description: z.string(),
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
})

const ProposedCustomAbilityAiSchema = AbilityAiSchema.extend({
  proposal_id: z.string(),
  definition: z.string(),
  choices: ChoiceOptionsAiSchema.nullable(),
})

const ImportProposalsAiSchema = z.object({
  class_resources: z.array(ProposedClassResourceAiSchema).nullable(),
  custom_abilities: z.array(ProposedCustomAbilityAiSchema).nullable(),
})

const StartingEquipmentGroupAiSchema = z.object({
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
})

const ClassAiSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  card_blurb: z.string().max(120).nullable(),
  hit_die: z.number().nullable(),
  primary_ability: z.array(z.string()).nullable(),
  saving_throws: z.array(z.string()).nullable(),
  armor_proficiencies: z.array(z.string()).nullable(),
  weapon_proficiencies: z.array(z.string()).nullable(),
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
  description: z.string().nullable(),
  features: z.array(ClassFeatureAiSchema),
  new_toggles: z.array(NewToggleAiSchema).nullable(),
})

const SpeciesAiSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  speed: z.number().nullable(),
  size: z.string().nullable(),
  traits: z.array(SpeciesTraitAiSchema),
})

const FeatAiSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  prerequisite: z.string().nullable(),
  category: z.string().nullable(),
  level_requirement: z.number().nullable().optional(),
  isChoice: z.boolean().nullable(),
  choices: ChoiceOptionsAiSchema.nullable(),
  mechanics: z.array(ImportMechanicAiSchema).nullable(),
})

const SpellAiSchema = z.object({
  name: z.string(),
  level: z.number(),
  school: z.string(),
  casting_time: z.string().nullable(),
  range: z.string().nullable(),
  components: z.array(z.string()).nullable(),
  duration: z.string().nullable(),
  concentration: z.boolean(),
  description: z.string().nullable(),
  classes: z.array(z.string()).nullable(),
})

const BackgroundAiSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  skill_proficiencies: z.array(z.string()).nullable(),
  tool_proficiencies: z.array(z.string()).nullable(),
  feat_granted: z.string().nullable(),
  ability_bonuses: z.record(z.string(), z.number()).nullable(),
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
  category: z.string(),
  subcategory: z.string().nullable(),
  description: z.string().nullable(),
  cost: z.object({ amount: z.number(), unit: z.string() }).nullable(),
  weight: z.number().nullable(),
  properties: EquipmentPropertiesAiSchema.nullable(),
  requires_attunement: z.boolean().nullable(),
  magic_item_category: z.string().nullable(),
  rarity: z.string().nullable(),
})

const ImportContentAiSchemaBase = z.object({
  species: z.array(SpeciesAiSchema).nullable(),
  classes: z.array(ClassAiSchema).nullable(),
  class_resources: z.array(ClassResourceAiSchema).nullable(),
  subclasses: z.array(SubclassAiSchema).nullable(),
  backgrounds: z.array(BackgroundAiSchema).nullable(),
  spells: z.array(SpellAiSchema).nullable(),
  feats: z.array(FeatAiSchema).nullable(),
  equipment: z.array(EquipmentAiSchema).nullable(),
  import_proposals: ImportProposalsAiSchema.nullable(),
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
    case "backgrounds":
      return z.object({
        backgrounds: z.array(BackgroundAiSchema).nullable(),
      })
    case "equipment":
      return z.object({
        equipment: z.array(EquipmentAiSchema).nullable(),
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

function normalizeUsesConfig(
  uses: z.infer<typeof UsesConfigAiSchema>,
): NonNullable<ImportContent["class_resources"]>[number]["uses"] {
  const next = omitNull(uses) as unknown as Record<string, unknown>
  if (Array.isArray(next.recharges)) {
    next.recharges = next.recharges.map((entry) =>
      omitNull(entry as unknown as Record<string, unknown>),
    )
  }
  return next as NonNullable<ImportContent["class_resources"]>[number]["uses"]
}

function normalizeMechanics(
  mechanics: z.infer<typeof ImportMechanicAiSchema>[] | null | undefined,
): ImportMechanic[] | undefined {
  if (!mechanics?.length) return undefined
  const cleaned: ImportMechanic[] = []
  for (const entry of mechanics) {
    const parsed = ImportMechanicSchema.safeParse(omitNull(entry as unknown as Record<string, unknown>))
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
  const next = omitNull({
    level: feature.level,
    name: feature.name,
    description: feature.description,
    isChoice: feature.isChoice === true ? true : undefined,
    choices: feature.choices ?? undefined,
    mechanics: normalizeMechanics(feature.mechanics),
    basedOnSrdFeature: feature.basedOnSrdFeature ?? undefined,
  })
  return next as ImportContent["classes"] extends (infer T)[] | undefined
    ? T extends { features: (infer F)[] }
      ? F
      : never
    : never
}

function normalizeClassRow(row: z.infer<typeof ClassAiSchema>): NonNullable<ImportContent["classes"]>[number] {
  const spellcasting = row.spellcasting
    ? omitNull({
        ability: row.spellcasting.ability,
        cantrips: row.spellcasting.cantrips ?? undefined,
        spells_known: row.spellcasting.spells_known ?? undefined,
        prepared: row.spellcasting.prepared ?? undefined,
        caster_progression: row.spellcasting.caster_progression ?? undefined,
        progression: row.spellcasting.progression ?? undefined,
        explicit_slot_progression: row.spellcasting.explicit_slot_progression ?? undefined,
      })
    : undefined

  return {
    name: row.name,
    description: row.description,
    hit_die: row.hit_die ?? 8,
    primary_ability: row.primary_ability,
    features: (row.features ?? []).map(normalizeFeatureLike),
    ...omitNull({
      card_blurb: row.card_blurb,
      saving_throws: row.saving_throws,
      armor_proficiencies: row.armor_proficiencies,
      weapon_proficiencies: row.weapon_proficiencies,
      skill_choices: row.skill_choices,
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
      description: species.description,
      speed: species.speed,
      size: species.size,
      traits: species.traits.map((trait) =>
        omitNull({
          name: trait.name,
          description: trait.description,
          isChoice: trait.isChoice === true ? true : undefined,
          choices: trait.choices ?? undefined,
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
      const subclassName = resource.subclass_name?.trim()
      if (subclassName) row.subclass_name = subclassName
      return row
    })
  }

  if (raw.subclasses?.length) {
    content.subclasses = raw.subclasses.map((subclass) => ({
      name: subclass.name,
      class_name: subclass.class_name,
      description: subclass.description,
      features: subclass.features.map(normalizeFeatureLike),
      ...omitNull({
        new_toggles: subclass.new_toggles?.length ? subclass.new_toggles : undefined,
      }),
    }))
  }

  if (raw.backgrounds?.length) {
    content.backgrounds = raw.backgrounds.map((background) => ({
      name: background.name,
      description: background.description,
      skill_proficiencies: background.skill_proficiencies,
      feat_granted: background.feat_granted,
      ability_bonuses: background.ability_bonuses,
      ...omitNull({
        tool_proficiencies: background.tool_proficiencies,
        feature: background.feature,
        grants_spells: background.grants_spells === true ? true : undefined,
        granted_spells: background.granted_spells,
        proficiencies: background.proficiencies,
        starting_equipment: background.starting_equipment,
        starting_gold: background.starting_gold,
      }),
    })) as NonNullable<ImportContent["backgrounds"]>
  }

  if (raw.spells?.length) {
    content.spells = normalizeSpellImportRows(raw.spells as unknown as Record<string, unknown>[])
  }

  if (raw.feats?.length) {
    content.feats = raw.feats.map((feat) =>
      omitNull({
        name: feat.name,
        description: feat.description,
        prerequisite: feat.prerequisite,
        category: feat.category,
        level_requirement: feat.level_requirement,
        isChoice: feat.isChoice === true ? true : undefined,
        choices: feat.choices ?? undefined,
        mechanics: normalizeMechanics(feat.mechanics),
      }),
    ) as NonNullable<ImportContent["feats"]>
  }

  if (raw.equipment?.length) {
    content.equipment = raw.equipment.map((item) =>
      coerceMagicEquipmentImportFields(
        omitNull({
          name: item.name,
          category: item.category,
          subcategory: item.subcategory,
          description: item.description,
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
          repeatable: ability.repeatable ?? undefined,
          choices: ability.choices
            ? {
                category: ability.choices.category,
                count: ability.choices.count,
                options: ability.choices.options.map((option) =>
                  omitNull({
                    name: option.name,
                    description: option.description,
                    prerequisite: option.prerequisite ?? undefined,
                    repeatable: option.repeatable ?? undefined,
                  }),
                ),
              }
            : undefined,
        }),
      ) as NonNullable<NonNullable<ImportContent["import_proposals"]>["custom_abilities"]>
    }
    if (proposals.class_resources?.length || proposals.custom_abilities?.length) {
      content.import_proposals = proposals
    }
  }

  return content
}
