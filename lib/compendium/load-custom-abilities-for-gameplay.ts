import { filterEnabled } from "@/lib/compendium/compendium-enabled"
import { enrichRowsWithModifierRefs } from "@/lib/compendium/normalize-modifier-refs"
import { SYSTEM_OPTION_CATALOG_IDS } from "@/lib/compendium/system-option-catalogs"
import type { DataClient } from "@/lib/db/client"
import type { CustomAbility } from "@/lib/types"

/**
 * Custom abilities shown in the builder/sheet, plus system option catalogs
 * (Metamagic, Eldritch Invocations, Weapon Mastery Properties) used for feat picks and mastery rules.
 * Call `ensureModifierCatalog` / `loadModifierCatalog` first so catalogs exist.
 */
export async function loadCustomAbilitiesForGameplay(
  db: DataClient,
): Promise<CustomAbility[]> {
  const [builderRes, systemRes] = await Promise.all([
    db.from("custom_abilities").select("*").eq("show_in_builder", true).order("name"),
    db.from("custom_abilities").select("*").in("id", [...SYSTEM_OPTION_CATALOG_IDS]),
  ])

  const byId = new Map<string, Record<string, unknown>>()
  for (const row of builderRes.data ?? []) {
    byId.set(row.id as string, row as Record<string, unknown>)
  }
  for (const row of systemRes.data ?? []) {
    byId.set(row.id as string, row as Record<string, unknown>)
  }

  return filterEnabled(enrichRowsWithModifierRefs([...byId.values()])).filter((ability) => {
    if ((SYSTEM_OPTION_CATALOG_IDS as readonly string[]).includes(ability.id as string)) {
      return true
    }
    return ability.show_in_builder !== false
  }) as CustomAbility[]
}
