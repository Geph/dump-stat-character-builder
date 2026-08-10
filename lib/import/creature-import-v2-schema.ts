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

export const CreatureAbilityEntrySchema = z.preprocess(
  (raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw
    const row = { ...(raw as Record<string, unknown>) }
    if (typeof row.text !== "string" && typeof row.description === "string") {
      row.text = row.description
    }
    if (!("unlock_level_label" in row)) row.unlock_level_label = null
    if (!("unlock_level_number" in row)) row.unlock_level_number = null
    if (!("tag" in row)) row.tag = null
    return row
  },
  z.object({
    unlock_level_label: z.string().nullish(),
    unlock_level_number: z.number().int().nullish(),
    name: z.string().min(1),
    tag: z.string().nullish(),
    text: z.string(),
  }),
)

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
    cr: z.string().nullish(),
    xp: z.number().nullish(),
    proficiency_bonus: z.string().nullish(),
    scaling: CreatureScalingSchema.nullish(),
    ac: z.string().min(1),
    ac_note: z.string().nullish(),
    initiative_modifier: z.string().nullish(),
    initiative_passive: z.number().nullish(),
    hp: z.string().min(1),
    hit_dice: z.string().nullish(),
    speed: CreatureSpeedSchema,
    ability_scores: abilityScoresShape,
    skills: z.string().nullish(),
    proficiencies: z.string().nullish(),
    gear: z.string().nullish(),
    resistances: z.string().nullish(),
    damage_immunities: z.string().nullish(),
    condition_immunities: z.string().nullish(),
    vulnerabilities: z.string().nullish(),
    senses: CreatureSensesSchema,
    languages: z.string().nullish(),
    traits: z.array(CreatureAbilityEntrySchema).nullish(),
    actions: z.array(CreatureAbilityEntrySchema).nullish(),
    bonus_actions: z.array(CreatureAbilityEntrySchema).nullish(),
    reactions: z.array(CreatureAbilityEntrySchema).nullish(),
    legendary_actions: z.array(CreatureAbilityEntrySchema).nullish(),
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
