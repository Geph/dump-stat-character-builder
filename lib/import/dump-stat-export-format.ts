import { normalizeCharacteristics } from "@/lib/compendium/characteristic-modifiers"

export const DUMP_STAT_EXPORT_TYPE = "dump-stat-export" as const

export const EXPORT_ITEM_TYPES = [
  "dnd-class",
  "dnd-subclass",
  "dnd-species",
  "dnd-background",
  "dnd-spell",
  "dnd-feat",
  "dnd-creature",
  "dnd-equipment",
  "dnd-class-resource",
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

export const TAB_TO_EXPORT_TYPE: Record<string, ExportItemType> = {
  classes: "dnd-class",
  subclasses: "dnd-subclass",
  species: "dnd-species",
  backgrounds: "dnd-background",
  spells: "dnd-spell",
  feats: "dnd-feat",
  creatures: "dnd-creature",
  equipment: "dnd-equipment",
  magic_items: "dnd-equipment",
  class_resources: "dnd-class-resource",
  abilities: "dnd-ability",
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

function stripExportMeta(data: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (!STRIP_FIELDS.has(key)) next[key] = value
  }
  return next
}

export function parseDumpStatExportJson(raw: string): DumpStatExportItem[] | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (typeof parsed !== "object" || parsed === null) return null

  const record = parsed as unknown as Record<string, unknown>

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

export function rowToExportItem(tab: string, row: Record<string, unknown>): DumpStatExportItem | null {
  const exportType = TAB_TO_EXPORT_TYPE[tab]
  if (!exportType) return null

  const data = stripExportMeta({ ...row })

  if (exportType === "dnd-feat") {
    data.characteristics = normalizeCharacteristics(data.benefits, null)
    delete data.benefits
  }

  if (exportType === "dnd-ability") {
    data.characteristics = normalizeCharacteristics(data.characteristics, data.uses as import("@/lib/types").UsesConfig | null | undefined)
  }

  if (exportType === "dnd-species") {
    data.characteristics = normalizeCharacteristics(data.characteristics, null)
  }

  return { type: exportType, version: 1, data }
}
