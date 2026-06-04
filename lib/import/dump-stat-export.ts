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
import type { DumpStatExportItem, ExportItemType } from "@/lib/import/dump-stat-export-format"

export type { DumpStatExportItem, ExportItemType } from "@/lib/import/dump-stat-export-format"
export { parseDumpStatExportJson } from "@/lib/import/dump-stat-export-format"

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

function stripExportMeta(data: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (!STRIP_FIELDS.has(key)) next[key] = value
  }
  return next
}

async function resolveClassId(data: Record<string, unknown>): Promise<string | null> {
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
