import { enrichSrdSubclassList } from "@/lib/compendium/enrich-srd-subclasses"
import type { NamedSourceRow } from "@/lib/compendium/prefer-same-source"

/** Apply SRD-style modifier presets and subclass spell-table linking to imported subclass rows. */
export function enrichImportedSubclassRows(
  rows: Record<string, unknown>[],
  classNameById: Map<string, string>,
  spellCatalog: NamedSourceRow[] = [],
  preferredSource?: string | null,
): Record<string, unknown>[] {
  return enrichSrdSubclassList(rows, classNameById, spellCatalog, preferredSource)
}
