import { createClient } from "@/lib/db/client"
import { COMPENDIUM_TABLES } from "@/lib/db/tables"
import { asCompendiumRows } from "@/lib/data/types"
import { isSrdSource } from "@/lib/srd/source"

/** Built-in catalog / modifier labels that should never be reused as import source. */
const EXCLUDED_IMPORT_MATCH_SOURCES = new Set(["system"])

function isExcludedImportMatchSource(name: string): boolean {
  return isSrdSource(name) || EXCLUDED_IMPORT_MATCH_SOURCES.has(name.trim().toLowerCase())
}

/**
 * Collect unique homebrew/imported source labels from row-like objects.
 * Excludes SRD and System. Case-insensitive dedupe; preserves first-seen casing.
 */
export function collectNonSrdSourceLabels(
  rows: Array<{ source?: string | null } | null | undefined>,
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const row of rows) {
    if (!row || typeof row.source !== "string") continue
    const name = row.source.trim()
    if (!name || isExcludedImportMatchSource(name)) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
}

/** Distinct source labels already on imported/homebrew compendium rows (excludes SRD and System). */
export async function listImportedCompendiumSources(): Promise<string[]> {
  const db = createClient()
  const batches = await Promise.all(
    COMPENDIUM_TABLES.map(async (table) => {
      const { data } = await db.from(table).select("source")
      return asCompendiumRows<{ source?: string | null }>(data)
    }),
  )
  return collectNonSrdSourceLabels(batches.flat())
}
