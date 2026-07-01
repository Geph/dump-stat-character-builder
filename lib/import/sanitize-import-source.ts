import { isSrdSource, LEGACY_SRD_SOURCES, SRD_SOURCE } from "@/lib/srd/source"

const SRD_SOURCE_ALIASES = new Set<string>([
  SRD_SOURCE,
  ...LEGACY_SRD_SOURCES,
  "D&D 5.5e SRD",
  "D&D 5e SRD",
  "5E SRD",
  "SRD 5.2.1",
])

/**
 * Imported/homebrew content must never be stored with an SRD source label.
 * Rewrites SRD-like values to the importer-provided fallback label.
 */
export function sanitizeImportRowSource(
  rowSource: unknown,
  importerSource: string,
): string {
  const fallback = normalizeImporterSourceLabel(importerSource)
  if (typeof rowSource !== "string") return fallback
  const trimmed = rowSource.trim()
  if (!trimmed) return fallback
  if (isSrdSource(trimmed) || SRD_SOURCE_ALIASES.has(trimmed)) return fallback
  return trimmed.slice(0, 120)
}

export function normalizeImporterSourceLabel(value: string): string {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed.slice(0, 120) : "Custom"
}
