export type DbResult<T = unknown> = {
  data: T | null
  error: { message: string } | null
  count?: number | null
}

/** Compendium row shape returned from select queries before normalization. */
export type CompendiumRow = Record<string, unknown>

export function asCompendiumRows<T extends CompendiumRow = CompendiumRow>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : []
}

export function asCompendiumRow<T extends CompendiumRow = CompendiumRow>(data: unknown): T | null {
  if (data === null || data === undefined) return null
  return typeof data === "object" ? (data as T) : null
}

/** Safe cast from a compendium row to a typed entity (no runtime check). */
export function castCompendiumRow<T>(row: CompendiumRow): T {
  return row as unknown as T
}

export function filterEqValue(filters: Filter[], column: string): unknown {
  for (const entry of filters) {
    if (entry.op === "eq" && entry.column === column) return entry.value
  }
  return undefined
}

export type Filter =
  | { op: "eq"; column: string; value: unknown }
  | { op: "in"; column: string; values: unknown[] }

export type OrderBy = { column: string; ascending?: boolean }

export interface DataClient {
  from(table: string): QueryBuilder
}

export interface QueryBuilder extends PromiseLike<DbResult> {
  select(columns?: string, options?: { count?: "exact"; head?: boolean }): QueryBuilder
  order(column: string, options?: { ascending?: boolean }): QueryBuilder
  limit(n: number): QueryBuilder
  eq(column: string, value: unknown): QueryBuilder
  in(column: string, values: unknown[]): QueryBuilder
  single(): QueryBuilder
  maybeSingle(): QueryBuilder
  insert(rows: unknown[]): QueryBuilder
  update(data: unknown): QueryBuilder
  upsert(rows: unknown[], options?: { onConflict?: string }): QueryBuilder
  delete(): QueryBuilder
}
