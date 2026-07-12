import type { ImportReport } from "@/lib/import/build-import-report"

export type PersistImportResult = {
  totalImported: number
  breakdown: Record<string, number>
  warnings: string[]
  report?: ImportReport
  /** School labels found on imported spells[] (client merges novel ones into Spells filters). */
  discoveredSpellSchools?: string[]
}
