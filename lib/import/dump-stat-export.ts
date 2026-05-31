import { extractUsesConfig, normalizeCharacteristics } from "@/lib/compendium/characteristic-modifiers"
import type { CompendiumTable } from "@/lib/db/tables"
import {
  deleteWhere,
  getRowById,
  insertRows,
  listRows,
  upsertByName,
} from "@/lib/db/repository"
import { normalizeEquipmentRows } from "@/lib/import/normalize-equipment"

export const DUMP_STAT_EXPORT_TYPE = "dump-stat-export" as const

export const EXPORT_ITEM_TYPES = [
  "dnd-class",
  "dnd-subclass",
  "dnd-species",
  "dnd-background",
  "dnd-spell",
  "dnd-feat",
  "dnd-equipment",
  "dnd-ability",
] as const

export type ExportItemType = (typeof EXPORT_ITEM_TYPES)[number]

export type DumpStatExportItem = {
  type: ExportItemType
  version: number
  data: Record<string, unknown>
}

export type DumpStatBulkExport = {
  type: typeof DUMP_STAT_EXPORT_TYPE
  version: number
  section?: string
  exportedAt?: string
  items: DumpStatExportItem[]
}

const EXPORT_TYPE_TO_TABLE: Record<ExportItemType, CompendiumTable> = {
  "dnd-class": "classes",
  "dnd-subclass": "subclasses",
  "dnd-species": "species",
  "dnd-background": "backgrounds",
  "dnd-spell": "spells",
  "dnd-feat": "feats",
  "dnd-equipment": "equipment",
  "dnd-ability": "custom_abilities",
}

const STRIP_FIELDS = new Set(["id", "created_at", "updated_at", "creator_url"])

function isExportItemType(value: unknown): value is ExportItemType {
  return typeof value === "string" && (EXPORT_ITEM_TYPES as readonly string[]).includes(value)
}

function isDumpStatExportItem(value: unknown): value is DumpStatExportItem {
  if (typeof value !== "object" || value === null) return false
  const item = value as DumpStatExportItem
  return isExportItemType(item.type) && typeof item.data === "object" && item.data !== null
}

export function parseDumpStatExportJson(raw: string): DumpStatExportItem[] | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (typeof parsed !== "object" || parsed === null) return null

  const record = parsed as Record<string, unknown>

  if (record.type === DUMP_STAT_EXPORT_TYPE && Array.isArray(record.items)) {
    return record.items.filter(isDumpStatExportItem)
  }

  if (isDumpStatExportItem(parsed)) {
    return [parsed]
  }

  if (Array.isArray(parsed)) {
    const items = parsed.filter(isDumpStatExportItem)
    return items.length > 0 ? items : null
  }

  return null
}

function stripExportMeta(data: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (!STRIP_FIELDS.has(key)) next[key] = value
  }
  return next
}

async function resolveClassId(
  data: Record<string, unknown>,
): Promise<string | null> {
  const classId = data.class_id
  if (typeof classId === "string" && classId) {
    const existing = await getRowById("classes", classId)
    if (existing) return classId
  }

  const className = data.class_name ?? data.className
  if (typeof className === "string" && className.trim()) {
    const matches = await listRows("classes", {
      filters: [{ op: "eq", column: "name", value: className.trim() }],
      limit: 1,
    })
    if (matches[0]?.id) return matches[0].id as string
  }

  return null
}

function rowForTable(
  exportType: ExportItemType,
  data: Record<string, unknown>,
  source: string,
): Record<string, unknown> | null {
  const cleaned = stripExportMeta(data)
  if (!cleaned.name || typeof cleaned.name !== "string") return null

  const row: Record<string, unknown> = {
    ...cleaned,
    source: cleaned.source || source,
  }

  if (exportType === "dnd-feat") {
    const characteristics = cleaned.characteristics ?? cleaned.benefits
    row.benefits = normalizeCharacteristics(characteristics, null)
    delete row.characteristics
  }

  if (exportType === "dnd-ability") {
    const characteristics = normalizeCharacteristics(cleaned.characteristics, cleaned.uses)
    row.characteristics = characteristics
    row.uses = extractUsesConfig(characteristics)
    if (row.show_in_builder == null) row.show_in_builder = true
  }

  if (exportType === "dnd-species") {
    row.characteristics = normalizeCharacteristics(cleaned.characteristics, null)
  }

  return row
}

export type ImportDumpStatResult = {
  count: number
  breakdown: Record<string, number>
}

export async function importDumpStatExportItems(
  items: DumpStatExportItem[],
  source = "Dump Stat Export",
): Promise<ImportDumpStatResult> {
  const breakdown: Record<string, number> = {}
  let totalImported = 0

  const classes = items.filter((item) => item.type === "dnd-class")
  const subclasses = items.filter((item) => item.type === "dnd-subclass")
  const others = items.filter(
    (item) => item.type !== "dnd-class" && item.type !== "dnd-subclass",
  )

  for (const item of classes) {
    const row = rowForTable(item.type, item.data, source)
    if (!row) continue
    await upsertByName("classes", [row])
    breakdown.classes = (breakdown.classes ?? 0) + 1
    totalImported += 1
  }

  for (const item of subclasses) {
    const classId = await resolveClassId(item.data)
    if (!classId) continue
    const row = rowForTable(item.type, item.data, source)
    if (!row) continue
    row.class_id = classId
    delete row.class_name
    delete row.className
    await deleteWhere("subclasses", [
      { op: "eq", column: "name", value: row.name as string },
      { op: "eq", column: "source", value: source },
    ])
    await insertRows("subclasses", [row])
    breakdown.subclasses = (breakdown.subclasses ?? 0) + 1
    totalImported += 1
  }

  const grouped = new Map<CompendiumTable, Record<string, unknown>[]>()
  for (const item of others) {
    const table = EXPORT_TYPE_TO_TABLE[item.type]
    const row = rowForTable(item.type, item.data, source)
    if (!row) continue
    const list = grouped.get(table) ?? []
    list.push(row)
    grouped.set(table, list)
  }

  for (const [table, rows] of grouped) {
    if (table === "equipment") {
      const equipment = normalizeEquipmentRows(rows)
      await upsertByName(table, equipment)
      breakdown.equipment = equipment.length
      totalImported += equipment.length
      continue
    }

    await upsertByName(table, rows)
    const key = table === "custom_abilities" ? "abilities" : table
    breakdown[key] = rows.length
    totalImported += rows.length
  }

  return { count: totalImported, breakdown }
}

export function buildBulkExportJson(
  section: string,
  items: DumpStatExportItem[],
): DumpStatBulkExport {
  return {
    type: DUMP_STAT_EXPORT_TYPE,
    version: 1,
    section,
    exportedAt: new Date().toISOString(),
    items,
  }
}

export const TAB_TO_EXPORT_TYPE: Record<string, ExportItemType> = {
  classes: "dnd-class",
  subclasses: "dnd-subclass",
  species: "dnd-species",
  backgrounds: "dnd-background",
  spells: "dnd-spell",
  feats: "dnd-feat",
  equipment: "dnd-equipment",
  abilities: "dnd-ability",
}

export function rowToExportItem(tab: string, row: Record<string, unknown>): DumpStatExportItem | null {
  const exportType = TAB_TO_EXPORT_TYPE[tab]
  if (!exportType) return null

  const data = stripExportMeta({ ...row })

  if (exportType === "dnd-feat") {
    data.characteristics = normalizeCharacteristics(data.benefits, null)
    delete data.benefits
  }

  if (exportType === "dnd-ability") {
    data.characteristics = normalizeCharacteristics(data.characteristics, data.uses)
  }

  if (exportType === "dnd-species") {
    data.characteristics = normalizeCharacteristics(data.characteristics, null)
  }

  return { type: exportType, version: 1, data }
}
