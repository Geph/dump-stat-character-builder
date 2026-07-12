import { createClient } from "@/lib/db/client"
import { asCompendiumRows } from "@/lib/data/types"

/** Existing subclass row for optional import prompt matching. */
export type CompendiumSubclassMatchOption = {
  id: string
  name: string
  /** Resolved parent class display name (`classes.name`). */
  className: string
}

/**
 * List subclasses in the compendium with their parent class name.
 * Used by the import UI to optionally lock `subclasses[].name` / `class_name` in the LLM prompt.
 */
export async function listCompendiumSubclassMatchOptions(): Promise<
  CompendiumSubclassMatchOption[]
> {
  const db = createClient()
  const [{ data: subclassRows }, { data: classRows }] = await Promise.all([
    db.from("subclasses").select("id, name, class_id").order("name"),
    db.from("classes").select("id, name"),
  ])

  const classNameById = new Map<string, string>()
  for (const row of asCompendiumRows<{ id?: string; name?: string }>(classRows)) {
    const id = row.id?.trim()
    const name = row.name?.trim()
    if (!id || !name) continue
    classNameById.set(id, name)
  }

  const options: CompendiumSubclassMatchOption[] = []
  for (const row of asCompendiumRows<{
    id?: string
    name?: string
    class_id?: string | null
  }>(subclassRows)) {
    const id = row.id?.trim()
    const name = row.name?.trim()
    if (!id || !name) continue
    const className = (row.class_id ? classNameById.get(row.class_id) : null)?.trim()
    if (!className) continue
    options.push({ id, name, className })
  }

  return options.sort((a, b) => {
    const byClass = a.className.localeCompare(b.className, undefined, { sensitivity: "base" })
    if (byClass !== 0) return byClass
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  })
}
