import {
  COMMON_MODIFIERS_CATALOG_ID,
  buildCommonModifiersCatalogRow,
  mergeDefaultCatalogEntries,
  normalizeModifierCatalog,
} from "@/lib/compendium/modifier-catalog"

type CatalogDb = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null }>
        single: () => Promise<{ data: Record<string, unknown> | null }>
      }
    }
    insert: (rows: Record<string, unknown>[]) => Promise<unknown>
    update: (patch: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<unknown>
    }
  }
}

export async function ensureModifierCatalog(db: CatalogDb): Promise<void> {
  const { data: existing } = await db
    .from("custom_abilities")
    .select("*")
    .eq("id", COMMON_MODIFIERS_CATALOG_ID)
    .maybeSingle()

  if (!existing) {
    await db.from("custom_abilities").insert([buildCommonModifiersCatalogRow()])
    return
  }

  const catalog = normalizeModifierCatalog(existing.modifier_catalog)
  const merged = mergeDefaultCatalogEntries(catalog)

  if (merged.length !== catalog.length || !existing.is_system) {
    await db
      .from("custom_abilities")
      .update({
        is_system: true,
        show_in_builder: false,
        modifier_catalog: merged,
        updated_at: new Date().toISOString(),
      })
      .eq("id", COMMON_MODIFIERS_CATALOG_ID)
  }
}

export async function loadModifierCatalog(db: CatalogDb) {
  await ensureModifierCatalog(db)
  const { data } = await db
    .from("custom_abilities")
    .select("modifier_catalog")
    .eq("id", COMMON_MODIFIERS_CATALOG_ID)
    .single()

  return normalizeModifierCatalog(data?.modifier_catalog)
}
