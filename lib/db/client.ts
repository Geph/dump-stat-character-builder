/**
 * Browser-side data client (Supabase-compatible subset).
 * Talks to /api/data/* and /api/characters — never connects to MySQL directly.
 */

import { resolveTable } from "./tables"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbResult<T = any> = { data: T | null; error: { message: string } | null; count?: number | null }

function apiError(json: { error?: unknown }, fallback: string): { message: string } {
  const raw = json?.error
  if (typeof raw === "string" && raw.trim()) return { message: raw }
  if (raw && typeof raw === "object" && "message" in raw) {
    const nested = (raw as { message?: unknown }).message
    if (typeof nested === "string" && nested.trim()) return { message: nested }
  }
  return { message: fallback }
}

type Filter = { op: "eq" | "in"; column: string; value?: unknown; values?: unknown[] }

class QueryBuilder implements PromiseLike<DbResult> {
  private filters: Filter[] = []
  private orders: { column: string; ascending?: boolean }[] = []
  private limitN?: number
  private countOnly = false
  private singleRow = false
  private embedRelations = false
  private mode: "select" | "insert" | "update" | "delete" | "upsert" = "select"
  private payload?: unknown
  private upsertOptions?: { onConflict?: string }
  private returnInserted = false

  constructor(private table: string) {}

  select(_columns = "*", options?: { count?: "exact"; head?: boolean }) {
    if (this.mode === "insert" || this.mode === "update") {
      this.returnInserted = true
      return this
    }
    this.mode = "select"
    if (options?.count === "exact" && options?.head) this.countOnly = true
    if (typeof _columns === "string" && _columns.includes("classes (")) {
      this.embedRelations = true
    }
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending })
    return this
  }

  limit(n: number) {
    this.limitN = n
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ op: "eq", column, value })
    return this
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ op: "in", column, values })
    return this
  }

  single() {
    this.singleRow = true
    return this
  }

  maybeSingle() {
    return this.single()
  }

  insert(rows: unknown[]) {
    this.mode = "insert"
    this.payload = rows
    return this
  }

  update(data: unknown) {
    this.mode = "update"
    this.payload = data
    return this
  }

  upsert(rows: unknown[], options?: { onConflict?: string }) {
    this.mode = "upsert"
    this.payload = rows
    this.upsertOptions = options
    return this
  }

  delete() {
    this.mode = "delete"
    return this
  }

  then<TResult1 = DbResult, TResult2 = never>(
    onfulfilled?: ((value: DbResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected)
  }

  private async execute(): Promise<DbResult> {
    try {
      const resolved = resolveTable(this.table)
      if (!resolved) {
        return { data: null, error: { message: `Unknown table: ${this.table}` } }
      }

      if (resolved === "characters") {
        return this.executeCharacters()
      }

      const apiTable = resolved

      if (this.mode === "insert") {
        const res = await fetch(`/api/data/${apiTable}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: this.payload }),
        })
        const json = await res.json()
        if (!res.ok) return { data: null, error: apiError(json, "Insert failed") }
        return { data: json.data ?? null, error: null }
      }

      if (this.mode === "upsert") {
        const res = await fetch(`/api/data/${apiTable}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rows: this.payload,
            upsert: true,
            onConflict: this.upsertOptions?.onConflict ?? "name",
          }),
        })
        const json = await res.json()
        if (!res.ok) return { data: null, error: apiError(json, "Upsert failed") }
        return { data: json.data ?? null, error: null }
      }

      if (this.mode === "update") {
        const id = this.filters.find((f) => f.op === "eq" && f.column === "id")?.value as string
        if (!id) return { data: null, error: { message: "Update requires .eq('id', ...)" } }
        const res = await fetch(`/api/data/${apiTable}/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.payload),
        })
        const json = await res.json()
        if (!res.ok) return { data: null, error: apiError(json, "Update failed") }
        return { data: json.data ?? null, error: null }
      }

      if (this.mode === "delete") {
        const id = this.filters.find((f) => f.op === "eq" && f.column === "id")?.value as string
        if (id) {
          const res = await fetch(`/api/data/${apiTable}/${id}`, { method: "DELETE" })
          const json = await res.json()
          if (!res.ok) return { data: null, error: apiError(json, "Delete failed") }
          return { data: null, error: null }
        }
        const res = await fetch(`/api/data/${apiTable}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filters: this.filters }),
        })
        const json = await res.json()
        if (!res.ok) return { data: null, error: apiError(json, "Delete failed") }
        return { data: null, error: null }
      }

      const params = new URLSearchParams()
      if (this.countOnly) params.set("countOnly", "1")
      if (this.limitN) params.set("limit", String(this.limitN))
      if (this.singleRow) params.set("single", "1")
      this.orders.forEach((o, i) => {
        params.set(i === 0 ? "order" : `order${i + 1}`, o.column)
        if (o.ascending === false) params.set(i === 0 ? "orderDir" : `orderDir${i + 1}`, "desc")
      })
      this.filters.forEach((f, i) => {
        if (f.op === "eq") params.set(`eq_${f.column}`, String(f.value))
        if (f.op === "in") params.set(`in_${f.column}`, (f.values ?? []).join(","))
      })

      const res = await fetch(`/api/data/${apiTable}?${params}`)
      const json = await res.json()
      if (!res.ok) {
        return { data: null, error: apiError(json, "Query failed"), count: null }
      }
      if (this.countOnly) {
        return { data: null, error: null, count: json.count ?? 0 }
      }
      return { data: json.data ?? null, error: null, count: json.count ?? null }
    } catch (e) {
      return {
        data: null,
        error: { message: e instanceof Error ? e.message : "Request failed" },
      }
    }
  }

  private async executeCharacters(): Promise<DbResult> {
    if (this.mode === "insert") {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.payload),
      })
      const json = await res.json()
      if (!res.ok) return { data: null, error: apiError(json, "Insert failed") }
      return { data: json.data ?? null, error: null }
    }

    if (this.mode === "update") {
      const id = this.filters.find((f) => f.op === "eq" && f.column === "id")?.value as string
      if (!id) return { data: null, error: { message: "Update requires .eq('id', ...)" } }
      const res = await fetch(`/api/characters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.payload),
      })
      const json = await res.json()
      if (!res.ok) return { data: null, error: apiError(json, "Update failed") }
      return { data: json.data ?? null, error: null }
    }

    if (this.mode === "delete") {
      const id = this.filters.find((f) => f.op === "eq" && f.column === "id")?.value as string
      const res = await fetch(`/api/characters/${id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) return { data: null, error: apiError(json, "Delete failed") }
      return { data: null, error: null }
    }

    const characterId = this.filters.find((f) => f.op === "eq" && f.column === "id")?.value as
      | string
      | undefined
    if (this.singleRow || (this.embedRelations && characterId)) {
      const res = await fetch(`/api/characters/${characterId}`)
      const json = await res.json()
      if (!res.ok) return { data: null, error: apiError(json, "Not found") }
      return { data: json.data ?? null, error: null }
    }

    const res = await fetch("/api/characters")
    const json = await res.json()
    if (!res.ok) return { data: null, error: apiError(json, "Query failed") }
    return { data: json.data ?? [], error: null }
  }
}

export function createClient() {
  return {
    from(table: string) {
      return new QueryBuilder(table)
    },
  }
}
