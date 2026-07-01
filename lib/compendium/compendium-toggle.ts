import { COMMON_MODIFIERS_CATALOG_ID } from "@/lib/compendium/modifier-catalog"
import { SYSTEM_OPTION_CATALOG_IDS } from "@/lib/compendium/system-option-catalogs"
import { compendiumStorageContentType, type CompendiumContentType } from "@/lib/compendium/content-types"
import type { CompendiumTable } from "@/lib/db/tables"
import type { DataClient } from "@/lib/db/client"

export type CompendiumToggleTarget = {
  table: CompendiumTable
  contentType: CompendiumContentType
  id: string
  name: string
}

export const COMPENDIUM_TOGGLE_LABELS: Record<CompendiumContentType, string> = {
  classes: "Class",
  subclasses: "Subclass",
  species: "Species",
  backgrounds: "Background",
  spells: "Spell",
  feats: "Feat",
  equipment: "Equipment",
  magic_items: "Magic Item",
  languages: "Language",
  class_resources: "Class Resource",
  abilities: "Custom Ability",
}

export function contentTypeToTable(contentType: CompendiumContentType): CompendiumTable {
  const storageType = compendiumStorageContentType(contentType)
  return storageType === "abilities" ? "custom_abilities" : storageType
}

export function tableToContentType(table: CompendiumTable): CompendiumContentType {
  return table === "custom_abilities" ? "abilities" : (table as CompendiumContentType)
}

/** System-owned rows that cannot be disabled or cleared with the rest of the section. */
export function isProtectedSystemCompendiumItem(table: CompendiumTable, id: string): boolean {
  if (table !== "custom_abilities") return false
  return (
    id === COMMON_MODIFIERS_CATALOG_ID ||
    SYSTEM_OPTION_CATALOG_IDS.includes(id as (typeof SYSTEM_OPTION_CATALOG_IDS)[number])
  )
}

export function isProtectedSystemCompendiumRow(row: { id?: string; is_system?: boolean | null }): boolean {
  return isProtectedSystemCompendiumItem("custom_abilities", row.id ?? "")
}

function idsInclude(value: unknown, id: string): boolean {
  return Array.isArray(value) && value.some((entry) => entry === id)
}

function stringArrayIncludes(value: unknown, needle: string): boolean {
  return Array.isArray(value) && value.some((entry) => entry === needle)
}

function addDependent(
  dependents: CompendiumToggleTarget[],
  seen: Set<string>,
  table: CompendiumTable,
  rowId: string,
  name: string,
  excludeId?: string,
) {
  if (!rowId || rowId === excludeId) return
  const key = `${table}:${rowId}`
  if (seen.has(key)) return
  seen.add(key)
  dependents.push({
    table,
    contentType: tableToContentType(table),
    id: rowId,
    name,
  })
}

async function addAttachedAbilities(
  db: DataClient,
  attachType: string,
  attachId: string,
  dependents: CompendiumToggleTarget[],
  seen: Set<string>,
) {
  const { data: abilities } = await db.from("custom_abilities").select("id, name, attached_to_type, attached_to_id")
  for (const row of abilities ?? []) {
    if (row.attached_to_type !== attachType) continue
    if (row.attached_to_id !== attachId) continue
    addDependent(dependents, seen, "custom_abilities", row.id as string, row.name as string)
  }
}

/** Find compendium rows that directly reference the item being disabled. */
export async function findCompendiumDependents(
  db: DataClient,
  contentType: CompendiumContentType,
  id: string,
): Promise<CompendiumToggleTarget[]> {
  const table = contentTypeToTable(contentType)
  const dependents: CompendiumToggleTarget[] = []
  const seen = new Set<string>()

  if (table === "classes") {
    const { data: cls } = await db.from("classes").select("name").eq("id", id).single()
    const className = typeof cls?.name === "string" ? cls.name : null

    const { data: subclasses } = await db.from("subclasses").select("id, name").eq("class_id", id)
    for (const row of subclasses ?? []) {
      addDependent(dependents, seen, "subclasses", row.id as string, row.name as string, id)
    }

    const { data: resources } = await db.from("class_resources").select("id, name").eq("class_id", id)
    for (const row of resources ?? []) {
      addDependent(dependents, seen, "class_resources", row.id as string, row.name as string, id)
    }

    const { data: feats } = await db.from("feats").select("id, name, prerequisite_class_ids")
    for (const row of feats ?? []) {
      if (idsInclude(row.prerequisite_class_ids, id)) {
        addDependent(dependents, seen, "feats", row.id as string, row.name as string, id)
      }
    }

    if (className) {
      const { data: spells } = await db.from("spells").select("id, name, classes")
      for (const row of spells ?? []) {
        if (stringArrayIncludes(row.classes, className)) {
          addDependent(dependents, seen, "spells", row.id as string, row.name as string, id)
        }
      }
    }

    await addAttachedAbilities(db, "class", id, dependents, seen)
    return dependents.sort((a, b) => a.name.localeCompare(b.name))
  }

  if (table === "species") {
    const { data: feats } = await db.from("feats").select("id, name, prerequisite_species_ids")
    for (const row of feats ?? []) {
      if (idsInclude(row.prerequisite_species_ids, id)) {
        addDependent(dependents, seen, "feats", row.id as string, row.name as string, id)
      }
    }
    await addAttachedAbilities(db, "species", id, dependents, seen)
    return dependents.sort((a, b) => a.name.localeCompare(b.name))
  }

  if (table === "backgrounds") {
    const { data: feats } = await db.from("feats").select("id, name, prerequisite_background_ids")
    for (const row of feats ?? []) {
      if (idsInclude(row.prerequisite_background_ids, id)) {
        addDependent(dependents, seen, "feats", row.id as string, row.name as string, id)
      }
    }
    await addAttachedAbilities(db, "background", id, dependents, seen)
    return dependents.sort((a, b) => a.name.localeCompare(b.name))
  }

  if (table === "feats") {
    const { data: feats } = await db.from("feats").select("id, name, prerequisite_feat_ids")
    for (const row of feats ?? []) {
      if (idsInclude(row.prerequisite_feat_ids, id)) {
        addDependent(dependents, seen, "feats", row.id as string, row.name as string, id)
      }
    }
    await addAttachedAbilities(db, "feat", id, dependents, seen)
    return dependents.sort((a, b) => a.name.localeCompare(b.name))
  }

  if (table === "spells") {
    await addAttachedAbilities(db, "spell", id, dependents, seen)
    return dependents.sort((a, b) => a.name.localeCompare(b.name))
  }

  if (table === "equipment") {
    const { data: item } = await db.from("equipment").select("name, category").eq("id", id).single()
    const { data: abilities } = await db.from("custom_abilities").select("id, name, attached_to_type, attached_to_id")
    for (const row of abilities ?? []) {
      if (row.attached_to_type !== "equipment") continue
      const attachedId = row.attached_to_id as string
      if (
        attachedId === id ||
        attachedId === item?.name ||
        attachedId === item?.category
      ) {
        addDependent(dependents, seen, "custom_abilities", row.id as string, row.name as string, id)
      }
    }
    return dependents.sort((a, b) => a.name.localeCompare(b.name))
  }

  if (table === "custom_abilities") {
    await addAttachedAbilities(db, "ability", id, dependents, seen)
    return dependents.sort((a, b) => a.name.localeCompare(b.name))
  }

  return dependents
}

export async function setCompendiumItemsEnabled(
  db: DataClient,
  targets: CompendiumToggleTarget[],
  enabled: boolean,
): Promise<void> {
  const filtered = enabled
    ? targets
    : targets.filter((target) => !isProtectedSystemCompendiumItem(target.table, target.id))

  for (const target of filtered) {
    const { error } = await db.from(target.table).update({ enabled }).eq("id", target.id)
    if (error) throw new Error(error.message ?? "Failed to update item")
  }
}
