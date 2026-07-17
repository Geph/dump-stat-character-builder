import { buildCreaturePersistRows } from "@/lib/import/map-creature-import-v2"
import { parseCreatureImportDocument } from "@/lib/import/load-creature-import-v2"
import { SRD_SOURCE, withSrdCreatorUrlList } from "@/lib/srd/source"
import creaturesDocument from "@/lib/srd/seed-data/creatures.json"

/**
 * Map the bundled SRD creatures v2.0 document onto creatures-table persist rows.
 */
export function buildSrdCreatureSeedRows(): Record<string, unknown>[] {
  const doc = parseCreatureImportDocument(creaturesDocument)
  const rows = buildCreaturePersistRows(doc.creatures, SRD_SOURCE)
  return withSrdCreatorUrlList(
    rows.map((row) => ({
      ...row,
      source: SRD_SOURCE,
    })) as unknown as Record<string, unknown>[],
  )
}
