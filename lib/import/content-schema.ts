import { z } from "zod"

export const ChoiceOptionsSchema = z.object({
  category: z.string(),
  count: z.number(),
  options: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
    }),
  ),
})

export const SpeciesTraitSchema = z.object({
  name: z.string(),
  description: z.string(),
  isChoice: z.boolean().optional(),
  choices: ChoiceOptionsSchema.optional(),
})

export const ClassFeatureSchema = z.object({
  level: z.number(),
  name: z.string(),
  description: z.string(),
  isChoice: z.boolean().optional(),
  choices: ChoiceOptionsSchema.optional(),
})

export const SubclassImportSchema = z.object({
  name: z.string(),
  class_name: z.string(),
  description: z.string().nullable(),
  features: z.array(ClassFeatureSchema),
})

export const FeatImportSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  prerequisite: z.string().nullable().optional(),
  category: z
    .enum(["Origin", "General", "Fighting Style", "Epic Boon"])
    .nullable()
    .optional(),
})

export const SpellImportSchema = z.object({
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

export const ClassImportSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  card_blurb: z.string().max(120).nullable().optional(),
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
    })
    .nullable()
    .optional(),
  features: z.array(ClassFeatureSchema),
  spell_list: z.array(z.string()).nullable().optional(),
})

export const BackgroundImportSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  skill_proficiencies: z.array(z.string()).nullable(),
  tool_proficiencies: z.array(z.string()).nullable().optional(),
  feat_granted: z.string().nullable(),
  ability_bonuses: z.record(z.string(), z.number()).nullable(),
  feature: z.object({ name: z.string(), description: z.string() }).nullable().optional(),
  grants_spells: z.boolean().optional(),
  granted_spells: z.record(z.string(), z.array(z.string())).nullable().optional(),
})

export const EquipmentImportSchema = z.object({
  name: z.string(),
  category: z.string(),
  subcategory: z.string().nullable(),
  description: z.string().nullable(),
  cost: z.object({ amount: z.number(), unit: z.string() }).nullable().optional(),
  weight: z.number().nullable().optional(),
  properties: z.record(z.unknown()).nullable().optional(),
})

export const AbilityImportSchema = z.object({
  name: z.string(),
  description: z.string(),
  source_type: z.enum(["class", "subclass", "species", "background", "feat", "item"]).nullable(),
  source_name: z.string().nullable(),
  level_requirement: z.number().nullable(),
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
      }),
    )
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

/** Shared AI extraction schema for PDF and text import routes. */
export function buildImportContentSchema(options?: { includeAbilities?: boolean }) {
  const base = {
    species: z
      .array(
        z.object({
          name: z.string(),
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

export type ImportContent = z.infer<ReturnType<typeof buildImportContentSchema>>

export const CHOICE_EXTRACTION_HINT = `When content requires a player to choose between fixed options (species lineage/ancestry/legacy, fighting style options listed by name, skill from a list, etc.):
- Set isChoice: true on the trait or class feature
- Populate choices with { category, count, options: [{ name, description }] }
- Keep rules text in description; list each selectable option in choices.options
- For feat picks (ASI, Epic Boon, fighting style feats), do NOT use isChoice — link a grant_feat common modifier instead`

export const FEAT_CATEGORY_IMPORT_HINT = `For feats, set category when the source labels them:
- "Origin" for Origin Feats (1st-level background-style feats)
- "Epic Boon" for Epic Boons (19th+ level boons)
- "Fighting Style" for fighting style options
- "General" for other feats (default when unclear)
Do not embed the category name only in description — use the category field.`

export const SUBCLASS_IMPORT_HINT = `For subclasses:
- Set class_name to the exact parent class (e.g. "Druid", "Fighter", "Sorcerer", "Psion")
- Third-party subclass names (Psionic Archetype, Circle, Oath, Patron, etc.) still use the subclasses array
- Include all subclass features with their gain level
- Spell list features should keep HTML tables in description when present`

export const CLASS_RESOURCE_IMPORT_HINT = `For class_resources (custom class pools like Psi Points, Rage, Ki):
- Extract rows when a class level table lists named resource columns (Psi Points, Psi Limit, Rage, etc.)
- Set class_name to the parent class (e.g. "Psion")
- resource_key: lowercase snake_case (e.g. "psi_points", "psi_limit")
- name: display name from the table header (e.g. "Psi Points")
- uses.type should be "at_level" with atLevelMode "tier" and atLevelTable [{ level, count }, ...] from the class table
- Psi Points and similar pools usually recharge on short_rest and long_rest
- Psi Limit / per-activation caps can use type "special" with atLevelTable describing the cap by level
- Also extract class_resources when rules text clearly defines a level-scaling pool even without a full table`

export const CUSTOM_CLASS_IMPORT_HINT = `For homebrew/custom classes (e.g. Psion):
- Put the full class in classes[] with hit_die, proficiencies, and all class features by level
- Put each subclass/archetype/path in subclasses[] with class_name set to the parent class
- Preserve the class level table in class description when present (Psi Points, Psi Limit columns, etc.)
- Disciplines, talents, or invocation-like options with point costs should be class/subclass features; note psi/point costs in description
- Custom spells and feats in spells[] and feats[]; set spell classes to include the custom class name`

export const IMPORT_PROPOSALS_HINT = `For import_proposals (user confirmation before creating compendium entries):
- Identify every class resource pool you find (Psi Points, Psi Limit, Rage, Ki, Sorcery Points, etc.)
- Put each in import_proposals.class_resources[] with proposal_id (snake_case), class_name, resource_key, name, uses, and definition
- definition: 1–3 sentences explaining what the pool is, how it is spent, and typical recharge — shown to the user before import
- Identify custom builder abilities: psionic disciplines, invocation lists, fighting-style pickers, and similar player-chosen option systems
- Put each in import_proposals.custom_abilities[] with proposal_id, name, definition, description, source_type, source_name, level_requirement
- For disciplines with talents, include choices { category, count, options: [{ name, description }] } and mention talent count in definition
- Do NOT also duplicate the same entries in class_resources[] or abilities[] — proposals are reviewed first; table data may still appear in class description`
