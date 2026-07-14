import { createClient } from "@/lib/db/client"
import { asCompendiumRows } from "@/lib/data/types"

/** Existing class row for optional import prompt matching (parent class for subclasses). */
export type CompendiumClassMatchOption = {
  id: string
  name: string
}

/**
 * List classes in the compendium.
 * Used by the import UI to optionally lock `subclasses[].class_name` in the LLM prompt.
 */
export async function listCompendiumClassMatchOptions(): Promise<CompendiumClassMatchOption[]> {
  const db = createClient()
  const { data: classRows } = await db.from("classes").select("id, name").order("name")

  const options: CompendiumClassMatchOption[] = []
  for (const row of asCompendiumRows<{ id?: string; name?: string }>(classRows)) {
    const id = row.id?.trim()
    const name = row.name?.trim()
    if (!id || !name) continue
    options.push({ id, name })
  }

  return options.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
}
