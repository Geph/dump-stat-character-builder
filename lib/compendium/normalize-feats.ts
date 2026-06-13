import { enrichSrdFeatRow } from "@/lib/compendium/enrich-srd-feats"
import { isSrdSource } from "@/lib/srd/source"

/** Normalize stored feat rows; SRD feats receive linked common modifier presets when missing. */
export function enrichFeatsList<
  T extends {
    name: string
    source?: string | null
    linkedModifiers?: unknown
    linked_modifiers?: unknown
    modifierRefs?: unknown
    modifier_refs?: unknown
  },
>(rows: T[]): T[] {
  return rows.map((row) => {
    if (!isSrdSource(row.source)) return row
    return enrichSrdFeatRow(row as Record<string, unknown>) as T
  })
}
