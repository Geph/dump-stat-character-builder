import { randomUUID } from "crypto"
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm"
import { getDb, schema } from "./index"
import { serializeRow, serializeRows } from "./serialize"
import type { TableName } from "./schema"
import type { CompendiumTable } from "./tables"
import { isCompendiumTable } from "./tables"

export type Filter =
  | { op: "eq"; column: string; value: unknown }
  | { op: "in"; column: string; values: unknown[] }

export type OrderBy = { column: string; ascending?: boolean }

function getTable(name: CompendiumTable | "characters") {
  return schema.tableMap[name as TableName]
}

function buildWhere(table: ReturnType<typeof getTable>, filters: Filter[]) {
  const conditions = filters.map((f) => {
    const col = (table as unknown as Record<string, unknown>)[f.column]
    if (!col) throw new Error(`Unknown column: ${f.column}`)
    if (f.op === "eq") return eq(col as never, f.value as never)
    return inArray(col as never, f.values as never[])
  })
  return conditions.length ? and(...conditions) : undefined
}

function buildOrder(table: ReturnType<typeof getTable>, orders: OrderBy[]) {
  return orders.map((o) => {
    const col = (table as unknown as Record<string, unknown>)[o.column]
    if (!col) throw new Error(`Unknown column: ${o.column}`)
    return o.ascending === false ? desc(col as never) : asc(col as never)
  })
}

function withIds<T extends Record<string, unknown>>(rows: T[]): (T & { id: string })[] {
  return rows.map((row) => ({
    ...row,
    id: typeof row.id === "string" ? row.id : randomUUID(),
  }))
}

export async function countRows(table: CompendiumTable | "characters", filters: Filter[] = []) {
  const t = getTable(table)
  const db = getDb()
  const where = buildWhere(t, filters)
  const [row] = await db.select({ value: count() }).from(t).where(where)
  return Number(row?.value ?? 0)
}

export async function listRows(
  table: CompendiumTable | "characters",
  options: { filters?: Filter[]; orders?: OrderBy[]; limit?: number } = {},
) {
  const t = getTable(table)
  const db = getDb()
  let query = db.select().from(t).$dynamic()
  const where = buildWhere(t, options.filters ?? [])
  if (where) query = query.where(where)
  const orderBy = buildOrder(t, options.orders ?? [{ column: "name", ascending: true }])
  if (orderBy.length) query = query.orderBy(...orderBy)
  if (options.limit) query = query.limit(options.limit)
  const rows = await query
  return serializeRows(rows as unknown as Record<string, unknown>[])
}

export async function getRowById(table: CompendiumTable | "characters", id: string) {
  const t = getTable(table)
  const db = getDb()
  const [row] = await db.select().from(t).where(eq(t.id, id)).limit(1)
  return row ? serializeRow(row as unknown as Record<string, unknown>) : null
}

export async function insertRows(table: CompendiumTable | "characters", rows: Record<string, unknown>[]) {
  const t = getTable(table)
  const db = getDb()
  const payload = withIds(rows)
  await db.insert(t).values(payload as never[])
  return payload.map(serializeRow)
}

export async function updateRowById(
  table: CompendiumTable | "characters",
  id: string,
  data: Record<string, unknown>,
) {
  const t = getTable(table)
  const db = getDb()
  const { id: _id, created_at: _c, ...rest } = data
  if (table === "characters") {
    ;(rest as unknown as Record<string, unknown>).updated_at = new Date()
  }
  if (table === "custom_abilities") {
    ;(rest as unknown as Record<string, unknown>).updated_at = new Date()
  }
  await db.update(t).set(rest as never).where(eq(t.id, id))
}

export async function deleteRowById(table: CompendiumTable | "characters", id: string) {
  const t = getTable(table)
  const db = getDb()
  await db.delete(t).where(eq(t.id, id))
}

export async function deleteWhere(table: CompendiumTable | "characters", filters: Filter[]) {
  const t = getTable(table)
  const db = getDb()
  const where = buildWhere(t, filters)
  if (!where) throw new Error("Refusing to delete without filters")
  await db.delete(t).where(where)
}

export async function clearTable(table: CompendiumTable | "characters") {
  const t = getTable(table)
  const db = getDb()
  await db.delete(t).where(sql`1=1`)
}

export async function upsertByName(table: CompendiumTable, rows: Record<string, unknown>[]) {
  if (!isCompendiumTable(table)) throw new Error(`Upsert by name not supported for ${table}`)
  const t = getTable(table)
  const db = getDb()
  for (const row of rows) {
    const name = row.name as string
    if (!name) continue
    const [existing] = await db.select().from(t).where(eq(t.name, name)).limit(1)
    const payload = { ...row, id: (existing as { id?: string } | undefined)?.id ?? randomUUID() }
    if (existing) {
      const { id: _id, created_at: _c, ...rest } = payload as Record<string, unknown>
      await db.update(t).set(rest as never).where(eq(t.id, (existing as { id: string }).id))
    } else {
      await db.insert(t).values(payload as never)
    }
  }
}

export async function listRowsIn(
  table: CompendiumTable,
  column: string,
  values: string[],
) {
  if (!values.length) return []
  return listRows(table, { filters: [{ op: "in", column, values }] })
}
