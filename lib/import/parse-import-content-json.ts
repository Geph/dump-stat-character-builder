import { buildImportContentSchema } from "@/lib/import/content-schema"
import type { ImportContent } from "@/lib/import/content-schema"
import {
  normalizeAiImportContent,
  type AiImportContent,
} from "@/lib/import/import-content-ai-schema"
import { combineImportContents } from "@/lib/import/merge-import-content"
import { repairLlmJsonText, stripLlmJsonText } from "@/lib/import/strip-llm-json"

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
  const record = value as unknown as Record<string, unknown>
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
  const record = parsed as unknown as Record<string, unknown>
  if (record.type === "import-content" && record.content) return record.content
  if (hasImportContentShape(record)) return record
  const nestedContent = (record as { content?: unknown; data?: unknown }).content
  const nestedData = (record as { content?: unknown; data?: unknown }).data
  if (hasImportContentShape(nestedContent)) return nestedContent
  if (hasImportContentShape(nestedData)) return nestedData
  return record
}

function parseSingleImportContent(candidate: unknown): ImportContent | null {
  if (!hasImportContentShape(candidate)) return null

  const record = candidate as unknown as Record<string, unknown>

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
  // combineImportContents auto-orders libraries before the class chapter.
  return parts.length === 1 ? parts[0] : combineImportContents(parts)
}

function tryJsonParse(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: message }
  }
}

function contentFromParsed(parsed: unknown): ImportContent | null {
  const candidate = unwrapImportJsonCandidate(parsed)
  if (Array.isArray(parsed)) {
    return parseImportContentArray(parsed)
  }
  return parseSingleImportContent(candidate)
}

export type ParseImportContentJsonResult =
  | { ok: true; content: ImportContent }
  | { ok: false; error: string }

/**
 * Parse BYO / LLM structured JSON with a human-readable failure reason.
 * Repairs common Gemini paste issues (raw newlines in strings, trailing commas).
 */
export function parseImportContentJsonDetailed(raw: string): ParseImportContentJsonResult {
  const stripped = stripLlmJsonText(raw)
  if (!stripped) {
    return { ok: false, error: "Paste is empty after removing markdown fences / prose." }
  }

  const candidates = [stripped, repairLlmJsonText(stripped)]
  // Dedupe if repair is a no-op
  const unique = candidates[0] === candidates[1] ? [candidates[0]!] : candidates

  let lastParseError: string | null = null
  for (const text of unique) {
    const parsed = tryJsonParse(text)
    if (!parsed.ok) {
      lastParseError = parsed.error
      continue
    }
    const content = contentFromParsed(parsed.value)
    if (content) return { ok: true, content }
    return {
      ok: false,
      error:
        "JSON parsed, but it is not Dump Stat import-content (expected classes, spells, feats, etc.).",
    }
  }

  const hint = lastParseError?.includes("Bad control character")
    ? " Tip: LLMs often insert raw line breaks inside quoted text — re-copy, or ask the model to escape newlines as \\n."
    : lastParseError?.includes("Unexpected end") || lastParseError?.includes("Unterminated")
      ? " Tip: the paste may be truncated — ask the model for a complete JSON object, or split class vs spells into separate imports."
      : ""

  return {
    ok: false,
    error: `Could not parse import JSON${lastParseError ? ` (${lastParseError})` : ""}.${hint}`,
  }
}

/** Parse BYO / LLM structured JSON into ImportContent for the import pipeline. */
export function parseImportContentJson(raw: string): ImportContent | null {
  const result = parseImportContentJsonDetailed(raw)
  return result.ok ? result.content : null
}

export function looksLikeImportContentJson(raw: string): boolean {
  const trimmed = stripLlmJsonText(raw)
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return false
  return parseImportContentJson(trimmed) !== null
}
