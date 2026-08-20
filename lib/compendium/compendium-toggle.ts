import { COMMON_MODIFIERS_CATALOG_ID } from "@/lib/compendium/modifier-catalog"
import { SYSTEM_OPTION_CATALOG_IDS } from "@/lib/compendium/system-option-catalogs"
import { isCompendiumItemEnabled } from "@/lib/compendium/compendium-enabled"
import type { CompendiumContentType } from "@/lib/compendium/content-types"
import type { CompendiumTable } from "@/lib/db/tables"
import type { DataClient } from "@/lib/db/client"
import { asCompendiumRow, asCompendiumRows } from "@/lib/data/types"
import { prerequisiteMentionsName } from "@/lib/compendium/prerequisite-match"

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
  creatures: "Creature",
  equipment: "Equipment",
  magic_items: "Magic Item",
  languages: "Language",
  tools: "Tool",
  class_resources: "Class Resource",
  abilities: "Custom Ability",
}

export function contentTypeToTable(contentType: CompendiumContentType): CompendiumTable {
  if (contentType === "abilities") return "custom_abilities"
  if (contentType === "magic_items") return "equipment"
  return contentType
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
  if (isProtectedSystemCompendiumItem(table, rowId)) return
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

function normalizeAttachKey(value: string): string {
  return value.trim().toLowerCase()
}

function toAttachKeySet(keys: readonly string[]): Set<string> {
  const out = new Set<string>()
  for (const key of keys) {
    const normalized = normalizeAttachKey(key)
    if (normalized) out.add(normalized)
  }
  return out
}

async function addAttachedAbilities(
  db: DataClient,
  attachType: string,
  attachKeys: string | readonly string[],
  dependents: CompendiumToggleTarget[],
  seen: Set<string>,
) {
  const keySet = toAttachKeySet(typeof attachKeys === "string" ? [attachKeys] : [...attachKeys])
  if (!keySet.size) return

  const { data: abilities } = await db
    .from("custom_abilities")
    .select("id, name, attached_to_type, attached_to_id, eligible_classes")
  for (const row of asCompendiumRows(abilities)) {
    if (row.attached_to_type !== attachType) continue
    const attachedId = typeof row.attached_to_id === "string" ? row.attached_to_id : ""
    if (!attachedId || !keySet.has(normalizeAttachKey(attachedId))) continue
    addDependent(dependents, seen, "custom_abilities", row.id as string, row.name as string)
  }
}

async function addEligibleClassAbilities(
  db: DataClient,
  classNames: readonly string[],
  dependents: CompendiumToggleTarget[],
  seen: Set<string>,
) {
  const wanted = toAttachKeySet(classNames)
  if (!wanted.size) return

  const { data: abilities } = await db
    .from("custom_abilities")
    .select("id, name, eligible_classes")
  for (const row of asCompendiumRows(abilities)) {
    if (!Array.isArray(row.eligible_classes)) continue
    const matches = row.eligible_classes.some(
      (entry) => typeof entry === "string" && wanted.has(normalizeAttachKey(entry)),
    )
    if (!matches) continue
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
    const clsRow = asCompendiumRow(cls)
    const className = typeof clsRow?.name === "string" ? clsRow.name : null

    const { data: subclasses } = await db.from("subclasses").select("id, name").eq("class_id", id)
    for (const row of asCompendiumRows(subclasses)) {
      addDependent(dependents, seen, "subclasses", row.id as string, row.name as string, id)
    }

    const { data: resources } = await db.from("class_resources").select("id, name").eq("class_id", id)
    for (const row of asCompendiumRows(resources)) {
      addDependent(dependents, seen, "class_resources", row.id as string, row.name as string, id)
    }

    const { data: feats } = await db
      .from("feats")
      .select("id, name, prerequisite, prerequisite_class_ids")
    for (const row of asCompendiumRows(feats)) {
      const byId = idsInclude(row.prerequisite_class_ids, id)
      const byText =
        !!className &&
        prerequisiteMentionsName(
          typeof row.prerequisite === "string" ? row.prerequisite : null,
          className,
        )
      if (byId || byText) {
        addDependent(dependents, seen, "feats", row.id as string, row.name as string, id)
      }
    }

    if (className) {
      // Spells listing this class stay in the catalog on clear/delete (multi-class lists).
      // Disable still offers them so the builder can hide class-tied spells together.
      const { data: spells } = await db.from("spells").select("id, name, classes")
      for (const row of asCompendiumRows(spells)) {
        if (stringArrayIncludes(row.classes, className)) {
          addDependent(dependents, seen, "spells", row.id as string, row.name as string, id)
        }
      }
    }

    await addAttachedAbilities(db, "class", className ? [id, className] : [id], dependents, seen)
    for (const row of asCompendiumRows(subclasses)) {
      const subclassKeys = [row.id as string]
      if (typeof row.name === "string" && row.name.trim()) subclassKeys.push(row.name.trim())
      await addAttachedAbilities(db, "subclass", subclassKeys, dependents, seen)
    }
    if (className) {
      await addEligibleClassAbilities(db, [className], dependents, seen)
    }
    return dependents.sort((a, b) => a.name.localeCompare(b.name))
  }

  if (table === "subclasses") {
    const { data: subclass } = await db.from("subclasses").select("name").eq("id", id).single()
    const subclassRow = asCompendiumRow(subclass)
    const subclassName = typeof subclassRow?.name === "string" ? subclassRow.name : null
    await addAttachedAbilities(
      db,
      "subclass",
      subclassName ? [id, subclassName] : [id],
      dependents,
      seen,
    )
    return dependents.sort((a, b) => a.name.localeCompare(b.name))
  }

  if (table === "species") {
    const { data: species } = await db.from("species").select("name").eq("id", id).single()
    const speciesRow = asCompendiumRow(species)
    const speciesName = typeof speciesRow?.name === "string" ? speciesRow.name : null

    const { data: feats } = await db
      .from("feats")
      .select("id, name, prerequisite, prerequisite_species_ids")
    for (const row of asCompendiumRows(feats)) {
      const byId = idsInclude(row.prerequisite_species_ids, id)
      const byText =
        !!speciesName &&
        prerequisiteMentionsName(
          typeof row.prerequisite === "string" ? row.prerequisite : null,
          speciesName,
        )
      if (byId || byText) {
        addDependent(dependents, seen, "feats", row.id as string, row.name as string, id)
      }
    }
    await addAttachedAbilities(
      db,
      "species",
      speciesName ? [id, speciesName] : [id],
      dependents,
      seen,
    )
    return dependents.sort((a, b) => a.name.localeCompare(b.name))
  }

  if (table === "backgrounds") {
    const { data: feats } = await db.from("feats").select("id, name, prerequisite_background_ids")
    for (const row of asCompendiumRows(feats)) {
      if (idsInclude(row.prerequisite_background_ids, id)) {
        addDependent(dependents, seen, "feats", row.id as string, row.name as string, id)
      }
    }
    await addAttachedAbilities(db, "background", id, dependents, seen)
    return dependents.sort((a, b) => a.name.localeCompare(b.name))
  }

  if (table === "feats") {
    const { data: feats } = await db.from("feats").select("id, name, prerequisite_feat_ids")
    for (const row of asCompendiumRows(feats)) {
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
    const itemRow = asCompendiumRow(item)
    const { data: abilities } = await db.from("custom_abilities").select("id, name, attached_to_type, attached_to_id")
    for (const row of asCompendiumRows(abilities)) {
      if (row.attached_to_type !== "equipment") continue
      const attachedId = row.attached_to_id as string
      if (
        attachedId === id ||
        attachedId === itemRow?.name ||
        attachedId === itemRow?.category
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

/** Related entries that are currently disabled (candidates for batch re-enable). */
export async function findDisabledCompendiumDependents(
  db: DataClient,
  contentType: CompendiumContentType,
  id: string,
): Promise<CompendiumToggleTarget[]> {
  const dependents = await findCompendiumDependents(db, contentType, id)
  const byTable = new Map<CompendiumTable, CompendiumToggleTarget[]>()

  for (const dependent of dependents) {
    if (isProtectedSystemCompendiumItem(dependent.table, dependent.id)) continue
    const list = byTable.get(dependent.table) ?? []
    list.push(dependent)
    byTable.set(dependent.table, list)
  }

  const disabled: CompendiumToggleTarget[] = []
  for (const [table, targets] of byTable) {
    const { data, error } = await db
      .from(table)
      .select("id, enabled")
      .in(
        "id",
        targets.map((target) => target.id),
      )
    if (error) throw new Error(error.message ?? "Failed to load dependents")

    for (const row of asCompendiumRows(data)) {
      if (!isCompendiumItemEnabled(row as { enabled?: boolean | number | null })) {
        const match = targets.find((target) => target.id === row.id)
        if (match) disabled.push(match)
      }
    }
  }

  return disabled.sort((a, b) => a.name.localeCompare(b.name))
}

export function mergeCompendiumToggleTargets(
  groups: readonly CompendiumToggleTarget[][],
  exclude?: ReadonlySet<string>,
): CompendiumToggleTarget[] {
  const seen = new Set<string>()
  const out: CompendiumToggleTarget[] = []
  for (const group of groups) {
    for (const target of group) {
      const key = `${target.table}:${target.id}`
      if (exclude?.has(key) || seen.has(key)) continue
      seen.add(key)
      out.push(target)
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

export function groupCompendiumToggleTargets(
  targets: readonly CompendiumToggleTarget[],
): { contentType: CompendiumContentType; label: string; names: string[] }[] {
  const byType = new Map<CompendiumContentType, string[]>()
  for (const target of targets) {
    const list = byType.get(target.contentType) ?? []
    list.push(target.name)
    byType.set(target.contentType, list)
  }
  return [...byType.entries()]
    .map(([contentType, names]) => ({
      contentType,
      label: COMPENDIUM_TOGGLE_LABELS[contentType],
      names: [...names].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export async function findCompendiumDependentsForTargets(
  db: DataClient,
  targets: readonly CompendiumToggleTarget[],
): Promise<CompendiumToggleTarget[]> {
  const groups = await Promise.all(
    targets.map((target) => findCompendiumDependents(db, target.contentType, target.id)),
  )
  const exclude = new Set(targets.map((target) => `${target.table}:${target.id}`))
  return mergeCompendiumToggleTargets(groups, exclude)
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
