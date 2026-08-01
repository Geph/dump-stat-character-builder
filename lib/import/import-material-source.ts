import { sanitizeImportRowSource } from "@/lib/import/sanitize-import-source"

export type ImportSourceLabel = string

/** Empty / Auto-detect UI value — rows keep their own `source`, else fall back to Custom. */
export const IMPORT_MATERIAL_SOURCE_AUTO_DETECT = ""

const AUTO_DETECT_ALIASES = new Set([
  "",
  "auto",
  "auto-detect",
  "auto detect",
  "autodetect",
])

export function isImportMaterialSourceAutoDetect(value: unknown): boolean {
  if (typeof value !== "string") return true
  return AUTO_DETECT_ALIASES.has(value.trim().toLowerCase())
}

/**
 * Resolve the importer source label used when a row has no usable `source`.
 * Blank / Auto-detect → `fallback` (default Custom).
 */
export function normalizeImportMaterialSource(value: unknown, fallback = "Custom"): string {
  if (typeof value !== "string" || isImportMaterialSourceAutoDetect(value)) {
    return sanitizeImportRowSource(null, fallback)
  }
  const trimmed = value.trim().slice(0, 120)
  return sanitizeImportRowSource(trimmed, fallback)
}
