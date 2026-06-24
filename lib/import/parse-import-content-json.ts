import { buildImportContentSchema } from "@/lib/import/content-schema"
import type { ImportContent } from "@/lib/import/content-schema"
import {
  normalizeAiImportContent,
  type AiImportContent,
} from "@/lib/import/import-content-ai-schema"
import { combineImportContents } from "@/lib/import/merge-import-content"
import { stripLlmJsonText } from "@/lib/import/strip-llm-json"

const IMPORT_CONTENT_KEYS = [
  "species",
  "classes",
  "class_resources",
  "subclasses",
  "backgrounds",
  "spells",
  "feats",
  "equipment",
  "abilities",
  "import_proposals",
] as const

function hasImportContentShape(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return IMPORT_CONTENT_KEYS.some((key) => key in record)
}

function countImportRows(content: ImportContent): number {
  return (
    (content.species?.length ?? 0) +
    (content.classes?.length ?? 0) +
    (content.class_resources?.length ?? 0) +
    (content.subclasses?.length ?? 0) +
    (content.backgrounds?.length ?? 0) +
    (content.spells?.length ?? 0) +
    (content.feats?.length ?? 0) +
    (content.equipment?.length ?? 0) +
    (content.abilities?.length ?? 0) +
    (content.import_proposals?.class_resources?.length ?? 0) +
    (content.import_proposals?.custom_abilities?.length ?? 0)
  )
}

function unwrapImportJsonCandidate(parsed: unknown): unknown {
  if (typeof parsed !== "object" || parsed === null) return parsed
  const record = parsed as Record<string, unknown>
  if (record.type === "import-content" && record.content) return record.content
  if (hasImportContentShape(record)) return record
  if (hasImportContentShape(record.content)) return record.content
  if (hasImportContentShape(record.data)) return record.data
  return record
}

function parseSingleImportContent(candidate: unknown): ImportContent | null {
  if (!hasImportContentShape(candidate)) return null

  const record = candidate as Record<string, unknown>

  try {
    const normalized = normalizeAiImportContent(record as AiImportContent)
    if (countImportRows(normalized) > 0) return normalized
  } catch {
    // fall through to strict schema
  }

  const schema = buildImportContentSchema({ includeAbilities: true })
  const result = schema.safeParse(record)
  if (!result.success || countImportRows(result.data) === 0) return null
  return result.data
}

function parseImportContentArray(parsed: unknown[]): ImportContent | null {
  const parts: ImportContent[] = []
  for (const item of parsed) {
    const candidate = unwrapImportJsonCandidate(item)
    const content = parseSingleImportContent(candidate)
    if (content) parts.push(content)
  }
  if (!parts.length) return null
  return parts.length === 1 ? parts[0] : combineImportContents(parts)
}

/** Parse BYO / LLM structured JSON into ImportContent for the import pipeline. */
export function parseImportContentJson(raw: string): ImportContent | null {
  const trimmedText = stripLlmJsonText(raw)
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmedText)
  } catch {
    return null
  }

  const candidate = unwrapImportJsonCandidate(parsed)
  if (Array.isArray(parsed)) {
    return parseImportContentArray(parsed)
  }
  return parseSingleImportContent(candidate)
}

export function looksLikeImportContentJson(raw: string): boolean {
  const trimmed = stripLlmJsonText(raw)
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return false
  return parseImportContentJson(trimmed) !== null
}
