import { z } from "zod"

/**
 * Creatures import schema v2.0 — precise structured records for Creatures & Companions.
 * Two categories:
 * - "creature": fixed CR/XP/PB and numeric combat stats (MM-style)
 * - "companion": scales with an external caregiver/owner level + PB; formulas stay as text
 *   until resolve time against the owning character.
 *
 * Legacy alias: `"monster"` is accepted and normalized to `"creature"`.
 */

export const CREATURE_IMPORT_SCHEMA_VERSION = "2.0" as const

export const CreatureAbilityEntrySchema = z.object({
  unlock_level_label: z.string().nullable(),
  unlock_level_number: z.number().int().nullable(),
  name: z.string().min(1),
  tag: z.string().nullable(),
  text: z.string(),
})

export const CreatureAbilityScoreSchema = z.object({
  score: z.number(),
  mod: z.string(),
  /** String so companions can hold formulas like "+2 plus PB". */
  save: z.string(),
})

export const CreatureSpeedSchema = z.object({
  walk: z.number().nullable(),
  fly: z.number().nullable(),
  swim: z.number().nullable(),
  climb: z.number().nullable(),
  burrow: z.number().nullable(),
  notes: z.string().nullable(),
})

export const CreatureSensesSchema = z.object({
  darkvision: z.number().nullable(),
  blindsight: z.number().nullable(),
  tremorsense: z.number().nullable(),
  truesight: z.number().nullable(),
  passive_perception: z.number().nullable(),
})

export const CreatureScalingSchema = z.object({
  scales_with: z.string().min(1),
  notes: z.string(),
})

const abilityScoresShape = z.object({
  str: CreatureAbilityScoreSchema,
  dex: CreatureAbilityScoreSchema,
  con: CreatureAbilityScoreSchema,
  int: CreatureAbilityScoreSchema,
  wis: CreatureAbilityScoreSchema,
  cha: CreatureAbilityScoreSchema,
})

/**
 * Strict creature record (schema v2.0). Required fields fail validation loudly via Zod.
 * Branching: category "creature" expects cr/xp/proficiency_bonus; "companion" expects scaling.
 */
export const CreatureImportV2Schema = z
  .object({
    name: z.string().min(1),
    creature_type: z.string().min(1),
    size: z.string().min(1),
    alignment: z.string().min(1),
    category: z.preprocess(
      (val) => (val === "monster" ? "creature" : val),
      z.enum(["creature", "companion"]),
    ),
    cr: z.string().nullable(),
    xp: z.number().nullable(),
    proficiency_bonus: z.string().nullable(),
    scaling: CreatureScalingSchema.nullable(),
    ac: z.string().min(1),
    ac_note: z.string().nullable(),
    initiative_modifier: z.string().nullable(),
    initiative_passive: z.number().nullable(),
    hp: z.string().min(1),
    hit_dice: z.string().nullable(),
    speed: CreatureSpeedSchema,
    ability_scores: abilityScoresShape,
    skills: z.string().nullable(),
    proficiencies: z.string().nullable(),
    gear: z.string().nullable(),
    resistances: z.string().nullable(),
    damage_immunities: z.string().nullable(),
    condition_immunities: z.string().nullable(),
    vulnerabilities: z.string().nullable(),
    senses: CreatureSensesSchema,
    languages: z.string().nullable(),
    traits: z.array(CreatureAbilityEntrySchema).nullable(),
    actions: z.array(CreatureAbilityEntrySchema).nullable(),
    bonus_actions: z.array(CreatureAbilityEntrySchema).nullable(),
    reactions: z.array(CreatureAbilityEntrySchema).nullable(),
    legendary_actions: z.array(CreatureAbilityEntrySchema).nullable(),
    description: z.string(),
    source: z.string().nullable().optional(),
    prerequisite_rules: z
      .array(
        z.object({
          category: z.literal("other"),
          value: z.string(),
        }),
      )
      .nullable()
      .optional(),
  })
  .superRefine((row, ctx) => {
    if (row.category === "creature") {
      if (row.cr == null || !String(row.cr).trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Creature "${row.name}": category "creature" requires cr`,
          path: ["cr"],
        })
      }
      if (row.scaling != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Creature "${row.name}": category "creature" must have scaling: null`,
          path: ["scaling"],
        })
      }
    }
    if (row.category === "companion") {
      if (row.scaling == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Creature "${row.name}": category "companion" requires scaling`,
          path: ["scaling"],
        })
      }
      if (row.cr != null && String(row.cr).trim() && !/^none$/i.test(String(row.cr))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Creature "${row.name}": category "companion" should have cr: null (got ${row.cr})`,
          path: ["cr"],
        })
      }
    }
  })

export const CreatureImportDocumentSchema = z.object({
  schema_version: z.literal(CREATURE_IMPORT_SCHEMA_VERSION),
  creatures: z.array(CreatureImportV2Schema).min(1),
})

export type CreatureAbilityEntry = z.infer<typeof CreatureAbilityEntrySchema>
export type CreatureImportV2 = z.infer<typeof CreatureImportV2Schema>
export type CreatureImportDocument = z.infer<typeof CreatureImportDocumentSchema>
export type CreatureCategory = CreatureImportV2["category"]

/** Legacy prose-only row (AI / paste fallback before structured extraction). */
export const CreatureImportLegacySchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  creature_type: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  alignment: z.string().nullable().optional(),
  cr: z.string().nullable().optional(),
  /** When set without full v2 fields, persist uses this category (companion vs creature). */
  category: z.enum(["creature", "companion"]).nullable().optional(),
  scaling: z
    .object({
      scales_with: z.string(),
      notes: z.string(),
    })
    .nullable()
    .optional(),
  /** Pre-parsed CompanionStatBlockTemplate or opaque record. */
  stat_block: z.record(z.unknown()).nullable().optional(),
  prerequisite_rules: z
    .array(
      z.object({
        category: z.literal("other"),
        value: z.string(),
      }),
    )
    .nullable()
    .optional(),
  source: z.string().nullable().optional(),
})

export type CreatureImportLegacy = z.infer<typeof CreatureImportLegacySchema>

/** ImportContent.creatures[] accepts either a full v2 record or a legacy prose row. */
export const CreatureImportSchema = z.union([CreatureImportV2Schema, CreatureImportLegacySchema])

export type CreatureImportRow = z.infer<typeof CreatureImportSchema>

export function isCreatureImportV2(row: CreatureImportRow): row is CreatureImportV2 {
  return (
    typeof row === "object" &&
    row !== null &&
    "category" in row &&
    (row.category === "creature" ||
      row.category === "companion" ||
      // Legacy alias from early drafts / prompts.
      (row as { category?: string }).category === "monster") &&
    "ability_scores" in row &&
    "ac" in row &&
    typeof (row as CreatureImportV2).ac === "string"
  )
}
