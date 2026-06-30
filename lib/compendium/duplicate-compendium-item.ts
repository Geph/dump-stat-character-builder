import type { CompendiumContentType } from "@/lib/compendium/content-types"
import {
  contentTypeToTable,
  isProtectedSystemCompendiumItem,
} from "@/lib/compendium/compendium-toggle"
import type { DataClient } from "@/lib/db/client"

const TABLES_WITH_UNIQUE_NAME = new Set([
  "classes",
  "species",
  "backgrounds",
  "spells",
  "feats",
  "equipment",
  "languages",
])

export function newCompendiumItemId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `cmp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function canDuplicateCompendiumItem(
  contentType: CompendiumContentType,
  id: string,
  row?: { is_system?: boolean | null },
): boolean {
  if (!id || id === "new") return false
  if (isProtectedSystemCompendiumItem(contentTypeToTable(contentType), id)) return false
  if (contentType === "abilities" && row?.is_system) return false
  return true
}

async function rowWithColumnValueExists(
  db: DataClient,
  table: string,
  column: string,
  value: string,
  extra?: { column: string; value: string },
): Promise<boolean> {
  let query = db.from(table).select("id").eq(column, value)
  if (extra) query = query.eq(extra.column, extra.value)
  const { data } = await query.maybeSingle()
  return Boolean(data)
}

async function resolveCopyName(db: DataClient, table: string, originalName: string): Promise<string> {
  const base = originalName.trim() || "Untitled"
  let candidate = `${base} (Copy)`
  let n = 2
  while (await rowWithColumnValueExists(db, table, "name", candidate)) {
    candidate = `${base} (Copy ${n})`
    n += 1
  }
  return candidate
}

async function resolveCopyResourceKey(
  db: DataClient,
  classId: string,
  originalKey: string,
): Promise<string> {
  const base = originalKey.trim() || "resource"
  let candidate = `${base}_copy`.slice(0, 64)
  let n = 2
  while (await rowWithColumnValueExists(db, "class_resources", "resource_key", candidate, {
    column: "class_id",
    value: classId,
  })) {
    const suffix = `_copy_${n}`
    candidate = `${base.slice(0, Math.max(1, 64 - suffix.length))}${suffix}`
    n += 1
  }
  return candidate
}

export type DuplicateCompendiumResult = { id: string } | { error: string }

export async function duplicateCompendiumItem(
  db: DataClient,
  contentType: CompendiumContentType,
  id: string,
): Promise<DuplicateCompendiumResult> {
  if (!canDuplicateCompendiumItem(contentType, id)) {
    return { error: "This item cannot be duplicated." }
  }

  const table = contentTypeToTable(contentType)
  const { data, error } = await db.from(table).select("*").eq("id", id).single()
  if (error || !data) {
    return { error: error?.message ?? "Item not found." }
  }

  const source = data as Record<string, unknown>
  if (contentType === "abilities" && source.is_system) {
    return { error: "System abilities cannot be duplicated." }
  }

  const copy = JSON.parse(JSON.stringify(source)) as Record<string, unknown>
  delete copy.created_at
  delete copy.updated_at
  copy.id = newCompendiumItemId()

  if (TABLES_WITH_UNIQUE_NAME.has(table) && typeof copy.name === "string") {
    copy.name = await resolveCopyName(db, table, copy.name)
  } else if (typeof copy.name === "string" && copy.name.trim()) {
    copy.name = `${copy.name.trim()} (Copy)`
  }

  if (contentType === "abilities") {
    copy.is_system = false
  }

  if (contentType === "class_resources") {
    const classId = String(copy.class_id ?? "")
    if (typeof copy.resource_key === "string") {
      copy.resource_key = await resolveCopyResourceKey(db, classId, copy.resource_key)
    }
  }

  const { error: insertError } = await db.from(table).insert([copy])
  if (insertError) {
    return { error: insertError.message || "Failed to create copy." }
  }

  return { id: copy.id as string }
}
