import {
  COMMON_MODIFIERS_CATALOG_ID,
  buildCommonModifiersCatalogRow,
  mergeDefaultCatalogEntries,
  normalizeModifierCatalog,
} from "@/lib/compendium/modifier-catalog"
import { ensureSystemOptionCatalogs } from "@/lib/compendium/system-option-catalogs"
import { createClient } from "@/lib/db/client"
import { asCompendiumRow, asCompendiumRows, castCompendiumRow } from "@/lib/data/types"

type CatalogDb = ReturnType<typeof createClient>

export async function ensureModifierCatalog(db: CatalogDb): Promise<void> {
  const { data: existing } = await db
    .from("custom_abilities")
    .select("*")
    .eq("id", COMMON_MODIFIERS_CATALOG_ID)
    .maybeSingle()

  const existingRow = existing as unknown as Record<string, unknown> | null

  if (!existingRow) {
    await db.from("custom_abilities").insert([buildCommonModifiersCatalogRow()])
    return
  }

  const catalog = normalizeModifierCatalog(existingRow.modifier_catalog)
  const merged = mergeDefaultCatalogEntries(catalog)

  if (merged.length !== catalog.length || !existingRow.is_system) {
    await db
      .from("custom_abilities")
      .update({
        is_system: true,
        show_in_builder: false,
        modifier_catalog: merged,
      })
      .eq("id", COMMON_MODIFIERS_CATALOG_ID)
  }

  await ensureSystemOptionCatalogs(db)
}

export async function loadModifierCatalog(db: CatalogDb) {
  await ensureModifierCatalog(db)
  const { data } = await db
    .from("custom_abilities")
    .select("modifier_catalog")
    .eq("id", COMMON_MODIFIERS_CATALOG_ID)
    .single()

  const row = data as unknown as Record<string, unknown> | null
  return mergeDefaultCatalogEntries(normalizeModifierCatalog(row?.modifier_catalog))
}
