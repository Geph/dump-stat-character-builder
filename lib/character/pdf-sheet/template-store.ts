/**
 * Browser-local library of the user's own fillable character sheet PDFs.
 *
 * The sheets people print are third-party or publisher PDFs, so the app never ships
 * them: the user imports the files they already own once, and they are kept in a
 * dedicated IndexedDB database on their machine.
 */

import { countMappableFields } from "./field-aliases"
import { readSheetPdfFieldNames } from "./fill-sheet-pdf"
import { describeSheetTemplate, type SheetTemplateKind } from "./template-matching"

const DB_NAME = "dump-stat-sheet-templates"
const DB_VERSION = 1
const STORE = "templates"

export type SheetTemplateSummary = {
  id: string
  fileName: string
  addedAt: string
  byteLength: number
  fieldCount: number
  /** How many of our canonical sheet keys this template can accept. */
  mappableFieldCount: number
  classNames: string[]
  kind: SheetTemplateKind
}

type StoredSheetTemplate = SheetTemplateSummary & { bytes: ArrayBuffer }

export class SheetTemplateError extends Error {}

function openTemplateDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new SheetTemplateError("Sheet templates need a browser with IndexedDB."))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new SheetTemplateError("Cannot open template storage."))
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openTemplateDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const request = run(tx.objectStore(STORE))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new SheetTemplateError("Template storage failed."))
    })
  } finally {
    db.close()
  }
}

function toSummary(row: StoredSheetTemplate): SheetTemplateSummary {
  const { bytes: _bytes, ...summary } = row
  return summary
}

function newTemplateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export async function listSheetTemplates(): Promise<SheetTemplateSummary[]> {
  const rows = await withStore<StoredSheetTemplate[]>("readonly", (store) => store.getAll())
  return rows
    .map(toSummary)
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.fileName.localeCompare(b.fileName))
}

export async function getSheetTemplateBytes(id: string): Promise<ArrayBuffer | null> {
  const row = await withStore<StoredSheetTemplate | undefined>("readonly", (store) => store.get(id))
  return row?.bytes ?? null
}

export async function deleteSheetTemplate(id: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(id) as IDBRequest<undefined>)
}

export async function clearSheetTemplates(): Promise<void> {
  await withStore("readwrite", (store) => store.clear() as IDBRequest<undefined>)
}

/**
 * Read a PDF the user picked, verify it has a usable AcroForm, and store it.
 * Re-importing a file with the same name replaces the previous copy.
 */
export async function importSheetTemplate(
  file: File,
  knownClassNames: readonly string[],
): Promise<SheetTemplateSummary> {
  const bytes = await file.arrayBuffer()

  let fieldNames: string[]
  try {
    fieldNames = await readSheetPdfFieldNames(bytes)
  } catch {
    throw new SheetTemplateError(`${file.name} could not be read as a PDF.`)
  }
  if (fieldNames.length === 0) {
    throw new SheetTemplateError(
      `${file.name} has no fillable form fields — use the "fillable" version of the sheet.`,
    )
  }

  const mappableFieldCount = countMappableFields(fieldNames)
  if (mappableFieldCount === 0) {
    throw new SheetTemplateError(
      `${file.name} has form fields, but none of them match a known character sheet field.`,
    )
  }

  const existing = await listSheetTemplates()
  const previous = existing.find((row) => row.fileName === file.name)
  const descriptor = describeSheetTemplate(previous?.id ?? newTemplateId(), file.name, knownClassNames)

  const row: StoredSheetTemplate = {
    id: descriptor.id,
    fileName: file.name,
    addedAt: new Date().toISOString(),
    byteLength: bytes.byteLength,
    fieldCount: fieldNames.length,
    mappableFieldCount,
    classNames: descriptor.classNames,
    kind: descriptor.kind,
    bytes,
  }

  await withStore("readwrite", (store) => store.put(row) as IDBRequest<IDBValidKey>)
  return toSummary(row)
}
