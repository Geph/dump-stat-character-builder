import { canClearCompendiumViaApi } from "@/lib/config/deploy-mode"
import { clearIndexedDbStore } from "@/lib/data/indexed-db-store"
import { createClient } from "@/lib/db/client"
import { COMPENDIUM_TABLES, type CompendiumTable } from "@/lib/db/tables"
import { ensureModifierCatalog } from "@/lib/compendium/ensure-modifier-catalog"
import { resetSpellSchoolsToDefault } from "@/lib/compendium/schools-of-magic"

export const CLEAR_COMPENDIUM_API_PATH = "/api/compendium/clear-all"

export type ClearEntireCompendiumResult = {
  cleared: readonly CompendiumTable[]
}

/**
 * Wipes every compendium table. Characters, parties, and snapshots are left alone —
 * they keep their stored ids and will show as missing content until the user re-seeds.
 */
export async function clearEntireCompendium(): Promise<ClearEntireCompendiumResult> {
  if (canClearCompendiumViaApi()) {
    const response = await fetch(CLEAR_COMPENDIUM_API_PATH, { method: "POST" })
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null
      throw new Error(data?.error ?? "Failed to clear the compendium")
    }
  } else {
    for (const table of COMPENDIUM_TABLES) {
      await clearIndexedDbStore(table)
    }
    // The system modifier catalog is a compendium row the app cannot run without.
    await ensureModifierCatalog(createClient())
  }

  resetSpellSchoolsToDefault()
  return { cleared: COMPENDIUM_TABLES }
}
