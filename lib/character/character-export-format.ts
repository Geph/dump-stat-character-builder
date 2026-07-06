import { DUMP_STAT_EXPORT_TYPE } from "@/lib/import/dump-stat-export-format"

export const CHARACTER_EXPORT_TYPE = "dnd-character" as const
export const CHARACTER_EXPORT_VERSION = 1

const STRIP_FROM_EXPORT = new Set([
  "id",
  "local_id",
  "created_at",
  "updated_at",
  "classes",
  "species",
  "backgrounds",
  "subclasses",
])

const STRIP_FROM_IMPORT = new Set([...STRIP_FROM_EXPORT])

export type CharacterExportRefs = {
  class?: string
  subclass?: string
  species?: string
  background?: string
}

export type CharacterExportItem = {
  type: typeof CHARACTER_EXPORT_TYPE
  version: number
  exportedAt?: string
  refs?: CharacterExportRefs
  data: Record<string, unknown>
}

export type CharacterBulkExport = {
  type: typeof DUMP_STAT_EXPORT_TYPE
  version: number
  section: "characters"
  exportedAt?: string
  items: CharacterExportItem[]
}

function isCharacterExportItem(value: unknown): value is CharacterExportItem {
  if (typeof value !== "object" || value === null) return false
  const item = value as CharacterExportItem
  return (
    item.type === CHARACTER_EXPORT_TYPE &&
    typeof item.version === "number" &&
    typeof item.data === "object" &&
    item.data !== null
  )
}

function slugifyCharacterName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "character"
}

export function characterExportFilename(name: string): string {
  return `${slugifyCharacterName(name)}-character.json`
}

export function downloadJsonFile(payload: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function characterRowToExportItem(row: Record<string, unknown>): CharacterExportItem {
  const data: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (!STRIP_FROM_EXPORT.has(key)) data[key] = value
  }

  const refs: CharacterExportRefs = {}
  const cls = row.classes as { name?: string } | undefined
  const subclass = row.subclasses as { name?: string } | undefined
  const species = row.species as { name?: string } | undefined
  const background = row.backgrounds as { name?: string } | undefined
  if (cls?.name) refs.class = cls.name
  if (subclass?.name) refs.subclass = subclass.name
  if (species?.name) refs.species = species.name
  if (background?.name) refs.background = background.name

  return {
    type: CHARACTER_EXPORT_TYPE,
    version: CHARACTER_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    ...(Object.keys(refs).length > 0 ? { refs } : {}),
    data,
  }
}

export function buildCharactersBulkExport(items: CharacterExportItem[]): CharacterBulkExport {
  return {
    type: DUMP_STAT_EXPORT_TYPE,
    version: 1,
    section: "characters",
    exportedAt: new Date().toISOString(),
    items,
  }
}

export function parseCharacterExportJson(raw: string): CharacterExportItem[] | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (typeof parsed !== "object" || parsed === null) return null
  const record = parsed as unknown as Record<string, unknown>

  if (record.type === DUMP_STAT_EXPORT_TYPE && Array.isArray(record.items)) {
    const items = record.items.filter(isCharacterExportItem)
    return items.length > 0 ? items : null
  }

  if (isCharacterExportItem(parsed)) {
    return [parsed]
  }

  if (Array.isArray(parsed)) {
    const items = parsed.filter(isCharacterExportItem)
    return items.length > 0 ? items : null
  }

  return null
}

export function prepareCharacterImportRow(item: CharacterExportItem): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(item.data)) {
    if (!STRIP_FROM_IMPORT.has(key)) row[key] = value
  }

  if (typeof row.name !== "string" || !row.name.trim()) {
    throw new Error("Character export is missing a name.")
  }
  row.name = row.name.trim()

  if (typeof row.level !== "number" || !Number.isFinite(row.level) || row.level < 1) {
    row.level = 1
  }

  for (const score of [
    "strength",
    "dexterity",
    "constitution",
    "intelligence",
    "wisdom",
    "charisma",
  ] as const) {
    if (typeof row[score] !== "number" || !Number.isFinite(row[score])) {
      row[score] = 10
    }
  }

  if (typeof row.proficiency_bonus !== "number" || !Number.isFinite(row.proficiency_bonus)) {
    row.proficiency_bonus = Math.max(2, 2 + Math.floor((row.level as number - 1) / 4))
  }

  if (!Array.isArray(row.equipment_ids)) row.equipment_ids = []
  if (!Array.isArray(row.spell_ids)) row.spell_ids = []
  if (!Array.isArray(row.feat_ids)) row.feat_ids = []
  if (typeof row.experience !== "number" || !Number.isFinite(row.experience)) row.experience = 0
  if (typeof row.gold !== "number" || !Number.isFinite(row.gold)) row.gold = 0

  return row
}

export function downloadCharacterExport(
  item: CharacterExportItem | CharacterExportItem[],
  filename?: string,
): void {
  const items = Array.isArray(item) ? item : [item]
  if (items.length === 1) {
    const name = typeof items[0].data.name === "string" ? items[0].data.name : "character"
    downloadJsonFile(items[0], filename ?? characterExportFilename(name))
    return
  }
  downloadJsonFile(buildCharactersBulkExport(items), filename ?? "characters-export.json")
}
