import { ZodError } from "zod"
import {
  CreatureImportDocumentSchema,
  CreatureImportV2Schema,
  type CreatureImportDocument,
  type CreatureImportV2,
} from "@/lib/import/creature-import-v2-schema"

export type CreatureImportValidationError = {
  path: string
  message: string
}

export class CreatureImportValidationException extends Error {
  readonly issues: CreatureImportValidationError[]

  constructor(message: string, issues: CreatureImportValidationError[]) {
    super(message)
    this.name = "CreatureImportValidationException"
    this.issues = issues
  }
}

function formatZodIssues(error: ZodError): CreatureImportValidationError[] {
  return error.issues.map((issue) => ({
    path: issue.path.length ? issue.path.join(".") : "(root)",
    message: issue.message,
  }))
}

function throwOnZod(error: ZodError, context: string): never {
  const issues = formatZodIssues(error)
  const detail = issues
    .slice(0, 12)
    .map((issue) => `  • ${issue.path}: ${issue.message}`)
    .join("\n")
  const more = issues.length > 12 ? `\n  …and ${issues.length - 12} more` : ""
  throw new CreatureImportValidationException(
    `${context} failed validation (${issues.length} issue${issues.length === 1 ? "" : "s"}):\n${detail}${more}`,
    issues,
  )
}

/**
 * Validate a schema v2.0 creatures document. Throws CreatureImportValidationException
 * (loud failure) on missing required fields or type mismatches — never silently coerces.
 */
export function parseCreatureImportDocument(raw: unknown): CreatureImportDocument {
  const parsed = CreatureImportDocumentSchema.safeParse(raw)
  if (!parsed.success) throwOnZod(parsed.error, "Creature import document")
  return parsed.data
}

/** Validate a single v2 creature record. */
export function parseCreatureImportV2(raw: unknown): CreatureImportV2 {
  const parsed = CreatureImportV2Schema.safeParse(raw)
  if (!parsed.success) throwOnZod(parsed.error, "Creature import record")
  return parsed.data
}

