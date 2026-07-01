import {
  deleteIndexedDbRow,
  getAllFromStore,
  putRows,
  upsertByName,
} from "@/lib/data/indexed-db-store"
import type { Filter } from "@/lib/db/repository"
import type { CompendiumTable } from "@/lib/db/tables"
import {
  buildImportCollisions,
  type ImportCollision,
  type ImportCollisionKind,
} from "@/lib/import/import-collisions"
import type { ImportContent } from "@/lib/import/content-schema"

const COLLISION_TABLES: ImportCollisionKind[] = [
  "class",
  "feat",
  "species",
  "spell",
  "background",
  "ability",
]

const TABLE_BY_KIND: Record<ImportCollisionKind, CompendiumTable> = {
  class: "classes",
  feat: "feats",
  species: "species",
  spell: "spells",
  background: "backgrounds",
  ability: "custom_abilities",
}

function applyFilters(rows: Record<string, unknown>[], filters: Filter[]): Record<string, unknown>[] {
  return rows.filter((row) =>
    filters.every((f) => {
      const val = row[f.column]
      if (f.op === "eq") return val === f.value || String(val) === String(f.value)
      if (f.op === "in") {
        return (f.values ?? []).some((v) => v === val || String(v) === String(val))
      }
      return true
    }),
  )
}

async function listRowsLocal(
  table: CompendiumTable,
  options: { filters?: Filter[] } = {},
): Promise<Record<string, unknown>[]> {
  const rows = await getAllFromStore(table)
  return applyFilters(rows, options.filters ?? [])
}

async function deleteWhereLocal(table: CompendiumTable, filters: Filter[]): Promise<void> {
  if (!filters.length) throw new Error("Refusing to delete without filters")
  const rows = await listRowsLocal(table, { filters })
  for (const row of rows) {
    if (typeof row.id === "string") {
      await deleteIndexedDbRow(table, row.id)
    }
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

async function insertRowsLocal(
  table: CompendiumTable,
  rows: Record<string, unknown>[],
): Promise<void> {
  const now = new Date().toISOString()
  await putRows(
    table,
    rows.map((row) => ({
      ...row,
      id: typeof row.id === "string" ? row.id : newId(),
      created_at: row.created_at ?? now,
      updated_at: now,
    })),
  )
}

export async function fetchExistingForImportCollisionsLocal(): Promise<
  Partial<Record<ImportCollisionKind, { name: string; source?: string | null }[]>>
> {
  const result: Partial<Record<ImportCollisionKind, { name: string; source?: string | null }[]>> =
    {}

  await Promise.all(
    COLLISION_TABLES.map(async (kind) => {
      const table = TABLE_BY_KIND[kind]
      const rows = await getAllFromStore(table)
      result[kind] = rows.map((row) => ({
        name: String(row.name ?? ""),
        source: (row.source as string | null | undefined) ?? null,
      }))
    }),
  )

  return result
}

export async function detectImportCollisionsLocal(content: ImportContent): Promise<ImportCollision[]> {
  const existingByKind = await fetchExistingForImportCollisionsLocal()
  return buildImportCollisions(content, existingByKind)
}

export {
  listRowsLocal,
  deleteWhereLocal,
  insertRowsLocal,
}
