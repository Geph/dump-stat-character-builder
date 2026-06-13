import { extractUsesConfig, normalizeCharacteristics } from "@/lib/compendium/characteristic-modifiers"
import { normalizeBackgroundRow } from "@/lib/compendium/normalize-backgrounds"
import type { CompendiumTable } from "@/lib/db/tables"
import type { DumpStatExportItem, ExportItemType } from "@/lib/import/dump-stat-export-format"
import { normalizeEquipmentRows } from "@/lib/import/normalize-equipment"
import {
  deleteIndexedDbRow,
  getAllFromStore,
  putRows,
  upsertByName,
} from "./indexed-db-store"

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
  "dnd-class-resource": "class_resources",
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
    const classes = await getAllFromStore("classes")
    if (classes.some((c) => c.id === classId)) return classId
  }

  const className = data.class_name ?? data.className
  if (typeof className === "string" && className.trim()) {
    const classes = await getAllFromStore("classes")
    const match = classes.find((c) => c.name === className.trim())
    if (match?.id) return match.id as string
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

  if (exportType === "dnd-background") {
    return normalizeBackgroundRow(row)
  }

  return row
}

export type ImportDumpStatResult = {
  count: number
  breakdown: Record<string, number>
}

export async function importDumpStatExportItemsLocal(
  items: DumpStatExportItem[],
  source = "Dump Stat Export",
): Promise<ImportDumpStatResult> {
  const breakdown: Record<string, number> = {}
  let totalImported = 0

  const classes = items.filter((item) => item.type === "dnd-class")
  const subclasses = items.filter((item) => item.type === "dnd-subclass")
  const classResources = items.filter((item) => item.type === "dnd-class-resource")
  const others = items.filter(
    (item) =>
      item.type !== "dnd-class" &&
      item.type !== "dnd-subclass" &&
      item.type !== "dnd-class-resource",
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

    const existing = await getAllFromStore("subclasses")
    for (const prev of existing) {
      if (prev.name === row.name && prev.source === source) {
        await deleteIndexedDbRow("subclasses", prev.id as string)
      }
    }
    await putRows("subclasses", [{
      ...row,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }])
    breakdown.subclasses = (breakdown.subclasses ?? 0) + 1
    totalImported += 1
  }

  for (const item of classResources) {
    const classId = await resolveClassId(item.data)
    if (!classId) continue
    const row = rowForTable(item.type, item.data, source)
    if (!row || typeof row.resource_key !== "string" || !row.resource_key.trim()) continue
    row.class_id = classId
    delete row.class_name
    delete row.className

    const existing = await getAllFromStore("class_resources")
    for (const prev of existing) {
      if (prev.class_id === classId && prev.resource_key === row.resource_key) {
        await deleteIndexedDbRow("class_resources", prev.id as string)
      }
    }
    await putRows("class_resources", [{
      ...row,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }])
    breakdown.class_resources = (breakdown.class_resources ?? 0) + 1
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
