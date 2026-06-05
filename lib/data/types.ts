export type DbResult<T = unknown> = {
  data: T | null
  error: { message: string } | null
  count?: number | null
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
