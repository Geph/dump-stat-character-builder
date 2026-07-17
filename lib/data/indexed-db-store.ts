import { COMPENDIUM_TABLES, resolveTable, type CompendiumTable } from "@/lib/db/tables"
import { normalizeBannerUrl, normalizePortraitUrl } from "@/lib/portrait"
import type { DbResult, Filter, OrderBy, QueryBuilder } from "./types"
import type { Character } from "@/lib/types"
import {
  attachClassDetails,
  normalizeCharacterClassRows,
} from "@/lib/character/character-classes"

const DB_NAME = "dump-stat"
/** Bump when COMPENDIUM_TABLES gains a new store (v3: tools, v4: repair pass, v5: creatures). */
const DB_VERSION = 5

const ALL_STORES = [...COMPENDIUM_TABLES, "characters"] as const
type StoreName = CompendiumTable | "characters"

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

function normalizeCharacterSpeed(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (value && typeof value === "object") {
    const walking = (value as { walking?: unknown }).walking
    if (typeof walking === "number" && Number.isFinite(walking)) return walking
  }
  return 30
}

function firstInsertRow(payload: unknown): Record<string, unknown> {
  if (Array.isArray(payload)) {
    return (payload[0] ?? {}) as unknown as Record<string, unknown>
  }
  return (payload ?? {}) as unknown as Record<string, unknown>
}

function applyFilters(rows: Record<string, unknown>[], filters: Filter[]): Record<string, unknown>[] {
  return rows.filter((row) =>
    filters.every((f) => {
      const val = row[f.column]
      if (f.op === "eq") return val === f.value || String(val) === String(f.value)
      if (f.op === "in") return (f.values ?? []).some((v) => v === val || String(v) === String(val))
      return true
    }),
  )
}

function applyOrder(rows: Record<string, unknown>[], orders: OrderBy[]): Record<string, unknown>[] {
  const orderList = orders.length ? orders : [{ column: "name", ascending: true }]
  return [...rows].sort((a, b) => {
    for (const o of orderList) {
      const av = a[o.column]
      const bv = b[o.column]
      if (av == null && bv == null) continue
      if (av == null) return o.ascending === false ? -1 : 1
      if (bv == null) return o.ascending === false ? 1 : -1
      let cmp = 0
      if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv
      } else {
        cmp = String(av).localeCompare(String(bv), undefined, { sensitivity: "base" })
      }
      if (cmp !== 0) return o.ascending === false ? -cmp : cmp
    }
    return 0
  })
}

let dbPromise: Promise<IDBDatabase> | null = null

function createMissingStores(db: IDBDatabase): void {
  for (const store of ALL_STORES) {
    if (!db.objectStoreNames.contains(store)) {
      db.createObjectStore(store, { keyPath: "id" })
    }
  }
}

function listMissingStores(db: IDBDatabase): StoreName[] {
  return ALL_STORES.filter((store) => !db.objectStoreNames.contains(store))
}

function openDbAtVersion(version: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, version)
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"))
    request.onupgradeneeded = () => {
      createMissingStores(request.result)
    }
    request.onsuccess = () => {
      const db = request.result
      const missing = listMissingStores(db)
      if (missing.length > 0) {
        db.close()
        const nextVersion = Math.max(version, db.version) + 1
        openDbAtVersion(nextVersion).then(resolve, reject)
        return
      }
      resolve(db)
    }
  })
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = openDbAtVersion(DB_VERSION).catch((error) => {
    dbPromise = null
    throw error
  })
  return dbPromise
}

async function getAllFromStore(storeName: StoreName): Promise<Record<string, unknown>[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly")
    const store = tx.objectStore(storeName)
    const req = store.getAll()
    req.onsuccess = () => resolve((req.result as unknown as Record<string, unknown>[]) ?? [])
    req.onerror = () => reject(req.error ?? new Error("Read failed"))
  })
}

async function putRows(storeName: StoreName, rows: Record<string, unknown>[]): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite")
    const store = tx.objectStore(storeName)
    for (const row of rows) {
      store.put(row)
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error("Write failed"))
  })
}

async function deleteRow(storeName: StoreName, id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite")
    tx.objectStore(storeName).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error("Delete failed"))
  })
}

async function clearStore(storeName: StoreName): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite")
    tx.objectStore(storeName).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error("Clear failed"))
  })
}

async function attachCharacterRelations(
  character: Record<string, unknown>,
  cache: Map<StoreName, Record<string, unknown>[]>,
): Promise<Record<string, unknown>> {
  const out = { ...character }
  const getStore = async (name: StoreName) => {
    if (!cache.has(name)) cache.set(name, await getAllFromStore(name))
    return cache.get(name)!
  }

  const classRows = normalizeCharacterClassRows(character as unknown as Character)
  if (classRows.length) {
    const classes = await getStore("classes")
    const subclasses = await getStore("subclasses")
    const classIds = [...new Set(classRows.map((row) => row.class_id))]
    const allClasses = classes.filter((row) => classIds.includes(row.id as string))
    const subclassIds = classRows
      .map((row) => row.subclass_id)
      .filter(Boolean) as string[]
    const allSubclasses = subclasses.filter((row) => subclassIds.includes(row.id as string))
    out.class_list = attachClassDetails(
      classRows,
      allClasses as never,
      allSubclasses as never,
    )

    const primaryId = (character.class_id as string | null) ?? classRows[0]?.class_id
    if (primaryId) {
      out.classes = allClasses.find((row) => row.id === primaryId) ?? out.classes
      const primaryRow = classRows.find((row) => row.class_id === primaryId)
      if (primaryRow?.subclass_id) {
        out.subclasses =
          allSubclasses.find((row) => row.id === primaryRow.subclass_id) ?? out.subclasses
      }
    }
  } else if (character.class_id) {
    const classes = await getStore("classes")
    const cls = classes.find((r) => r.id === character.class_id)
    if (cls) out.classes = cls
  }

  if (character.species_id) {
    const species = await getStore("species")
    const sp = species.find((r) => r.id === character.species_id)
    if (sp) out.species = sp
  }
  if (character.background_id) {
    const backgrounds = await getStore("backgrounds")
    const bg = backgrounds.find((r) => r.id === character.background_id)
    if (bg) out.backgrounds = bg
  }
  if (!classRows.length && character.subclass_id) {
    const subclasses = await getStore("subclasses")
    const sub = subclasses.find((r) => r.id === character.subclass_id)
    if (sub) out.subclasses = sub
  }
  return out
}

async function upsertByName(
  storeName: CompendiumTable,
  rows: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  const existing = await getAllFromStore(storeName)
  const byName = new Map(existing.map((r) => [String(r.name), r]))
  const saved: Record<string, unknown>[] = []
  const now = new Date().toISOString()

  for (const row of rows) {
    const name = row.name as string
    if (!name) continue
    const prev = byName.get(name)
    const payload: Record<string, unknown> = {
      ...row,
      id: (prev?.id as string) ?? (row.id as string) ?? newId(),
      created_at: prev?.created_at ?? now,
      updated_at: now,
    }
    byName.set(name, payload)
    saved.push(payload)
  }

  await putRows(storeName, saved)
  return saved
}

class IndexedDbQueryBuilder implements QueryBuilder {
  private filters: Filter[] = []
  private orders: OrderBy[] = []
  private limitN?: number
  private countOnly = false
  private singleRow = false
  private embedRelations = false
  private mode: "select" | "insert" | "update" | "delete" | "upsert" = "select"
  private payload?: unknown
  private upsertOptions?: { onConflict?: string }

  constructor(private table: string) {}

  select(_columns = "*", options?: { count?: "exact"; head?: boolean }) {
    if (this.mode === "insert" || this.mode === "update") {
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

      const storeName = resolved

      if (this.mode === "insert") {
        const rows = (this.payload as unknown as Record<string, unknown>[]).map((row) => {
          const now = new Date().toISOString()
          return {
            ...row,
            id: (row.id as string) ?? newId(),
            created_at: row.created_at ?? now,
            updated_at: now,
          }
        })
        await putRows(storeName, rows)
        return { data: rows, error: null }
      }

      if (this.mode === "upsert") {
        const conflict = this.upsertOptions?.onConflict ?? "name"
        if (conflict !== "name") {
          return { data: null, error: { message: `Unsupported upsert conflict: ${conflict}` } }
        }
        const saved = await upsertByName(storeName, this.payload as unknown as Record<string, unknown>[])
        return { data: saved, error: null }
      }

      if (this.mode === "update") {
        const id = this.filters.find((f): f is Extract<import("@/lib/data/types").Filter, { op: "eq" }> => f.op === "eq" && f.column === "id")?.value as string
        if (!id) return { data: null, error: { message: "Update requires .eq('id', ...)" } }
        const all = await getAllFromStore(storeName)
        const existing = all.find((r) => r.id === id)
        if (!existing) return { data: null, error: { message: "Not found" } }
        const patch = { ...(this.payload as unknown as Record<string, unknown>) }
        delete patch.id
        delete patch.created_at
        const updated = {
          ...existing,
          ...patch,
          id,
          updated_at: new Date().toISOString(),
        }
        await putRows(storeName, [updated])
        return { data: updated, error: null }
      }

      if (this.mode === "delete") {
        const id = this.filters.find((f): f is Extract<import("@/lib/data/types").Filter, { op: "eq" }> => f.op === "eq" && f.column === "id")?.value as string
        if (id) {
          await deleteRow(storeName, id)
          return { data: null, error: null }
        }
        const all = await getAllFromStore(storeName)
        const toDelete = applyFilters(all, this.filters)
        for (const row of toDelete) {
          await deleteRow(storeName, row.id as string)
        }
        return { data: null, error: null }
      }

      let rows = await getAllFromStore(storeName)
      rows = applyFilters(rows, this.filters)
      if (this.countOnly) {
        return { data: null, error: null, count: rows.length }
      }
      rows = applyOrder(rows, this.orders)
      if (this.limitN != null) rows = rows.slice(0, this.limitN)
      if (this.singleRow) {
        const row = rows[0] ?? null
        return { data: row, error: row ? null : { message: "Not found" } }
      }
      return { data: rows, error: null, count: rows.length }
    } catch (e) {
      return {
        data: null,
        error: { message: e instanceof Error ? e.message : "IndexedDB request failed" },
      }
    }
  }

  private async executeCharacters(): Promise<DbResult> {
    const cache = new Map<StoreName, Record<string, unknown>[]>()

    if (this.mode === "insert") {
      const payload = firstInsertRow(this.payload)
      const id = newId()
      const now = new Date().toISOString()
      const row: Record<string, unknown> = {
        ...payload,
        id,
        speed: normalizeCharacterSpeed(payload.speed),
        portrait_url: normalizePortraitUrl(payload.portrait_url),
        banner_url: normalizeBannerUrl(payload.banner_url),
        created_at: now,
        updated_at: now,
      }
      await putRows("characters", [row])
      const withRelations = await attachCharacterRelations(row, cache)
      return { data: withRelations, error: null }
    }

    if (this.mode === "update") {
      const id = this.filters.find((f): f is Extract<import("@/lib/data/types").Filter, { op: "eq" }> => f.op === "eq" && f.column === "id")?.value as string
      if (!id) return { data: null, error: { message: "Update requires .eq('id', ...)" } }
      const all = await getAllFromStore("characters")
      const existing = all.find((r) => r.id === id)
      if (!existing) return { data: null, error: { message: "Not found" } }
      const data = { ...(this.payload as unknown as Record<string, unknown>) }
      delete data.id
      delete data.created_at
      const row: Record<string, unknown> = {
        ...existing,
        ...data,
        id,
        speed: normalizeCharacterSpeed(data.speed ?? existing.speed),
        portrait_url: normalizePortraitUrl(data.portrait_url ?? existing.portrait_url),
        banner_url: normalizeBannerUrl(data.banner_url ?? existing.banner_url),
        updated_at: new Date().toISOString(),
      }
      await putRows("characters", [row])
      const withRelations = await attachCharacterRelations(row, cache)
      return { data: withRelations, error: null }
    }

    if (this.mode === "delete") {
      const id = this.filters.find((f): f is Extract<import("@/lib/data/types").Filter, { op: "eq" }> => f.op === "eq" && f.column === "id")?.value as string
      if (!id) return { data: null, error: { message: "Delete requires .eq('id', ...)" } }
      await deleteRow("characters", id)
      return { data: null, error: null }
    }

    let rows = await getAllFromStore("characters")
    rows = applyFilters(rows, this.filters)
    rows = applyOrder(rows, this.orders.length ? this.orders : [{ column: "created_at", ascending: false }])

    const characterId = this.filters.find((f): f is Extract<import("@/lib/data/types").Filter, { op: "eq" }> => f.op === "eq" && f.column === "id")?.value as
      | string
      | undefined

    if (this.singleRow || (this.embedRelations && characterId)) {
      const row = rows.find((r) => r.id === characterId) ?? rows[0] ?? null
      if (!row) return { data: null, error: { message: "Not found" } }
      const withRelations = await attachCharacterRelations(row, cache)
      return { data: withRelations, error: null }
    }

    const withRelations = await Promise.all(rows.map((r) => attachCharacterRelations(r, cache)))
    return { data: withRelations, error: null }
  }
}

export function createIndexedDbClient() {
  return {
    from(table: string) {
      return new IndexedDbQueryBuilder(table)
    },
  }
}

export async function clearIndexedDbStore(storeName: StoreName): Promise<void> {
  await clearStore(storeName)
}

export async function clearAllIndexedDbStores(): Promise<void> {
  for (const store of ALL_STORES) {
    await clearStore(store)
  }
}

export async function isIndexedDbEmpty(): Promise<boolean> {
  for (const store of ALL_STORES) {
    const rows = await getAllFromStore(store)
    if (rows.length > 0) return false
  }
  return true
}

export async function getIndexedDbRowCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  for (const store of ALL_STORES) {
    const rows = await getAllFromStore(store)
    const key = store === "custom_abilities" ? "abilities" : store
    counts[key] = rows.length
  }
  return counts
}

export { getAllFromStore, putRows, upsertByName, deleteRow as deleteIndexedDbRow }
