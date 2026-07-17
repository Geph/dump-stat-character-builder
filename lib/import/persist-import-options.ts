import type { ImportSourceLabel } from "@/lib/import/import-material-source"

/** Options for persistImportedContent / persistImportedContentLocal. */
export type PersistImportOptions = {
  /**
   * When importing classes that replace SRD spells/feats (e.g. LaserLlama),
   * resolve name matches to same-source catalog rows first and stamp
   * prefer_same_source_replacements on the imported classes.
   */
  preferSameSourceReplacements?: boolean
}

export function preferredSourceForPersist(
  source: ImportSourceLabel,
  options?: PersistImportOptions,
): string | null {
  if (!options?.preferSameSourceReplacements) return null
  const trimmed = source.trim()
  return trimmed || null
}
