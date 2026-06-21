import { enrichSrdSubclassList } from "@/lib/compendium/enrich-srd-subclasses"
import { enrichSubclassSpellTableFeatures } from "@/lib/compendium/enrich-subclass-spell-features"

/** Apply SRD-style modifier presets and subclass spell-table linking to imported subclass rows. */
export function enrichImportedSubclassRows(
  rows: Record<string, unknown>[],
  classNameById: Map<string, string>,
  spellCatalog: { id: string; name: string }[] = [],
): Record<string, unknown>[] {
  const enriched = enrichSrdSubclassList(rows, classNameById)
  if (spellCatalog.length === 0) return enriched
  return enriched.map((row) => enrichSubclassSpellTableFeatures(row, spellCatalog))
}
