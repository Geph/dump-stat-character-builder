import { sanitizeImportRowSource } from "@/lib/import/sanitize-import-source"

export type ImportSourceLabel = string

export function normalizeImportMaterialSource(value: unknown, fallback = "Custom"): string {
  if (typeof value !== "string") return fallback
  const trimmed = value.trim()
  const normalized = trimmed.length > 0 ? trimmed.slice(0, 120) : fallback
  return sanitizeImportRowSource(normalized, fallback)
}
