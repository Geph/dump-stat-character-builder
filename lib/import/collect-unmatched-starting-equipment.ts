import type { ImportContent } from "@/lib/import/content-schema"
import type { Equipment } from "@/lib/types"
import equipmentSeed from "@/lib/srd/seed-data/equipment.json"
import toolsSeed from "@/lib/srd/seed-data/tools.json"

type EquipmentNameRow = Pick<Equipment, "id" | "name">

/** Starting-gear placeholders that resolve via tool proficiency picks, not equipment rows. */
const TOOL_POOL_PLACEHOLDERS = new Set(
  [
    "Artisan's Tools",
    "Artisans Tools",
    "Gaming Set",
    "Musical Instrument",
  ].map((name) => name.toLowerCase()),
)

function seedEquipmentCatalog(): EquipmentNameRow[] {
  return (equipmentSeed as { name: string }[]).map((row, index) => ({
    name: row.name,
    id: `seed_${index}`,
  }))
}

function seedToolCatalog(): EquipmentNameRow[] {
  return (toolsSeed as { name: string }[]).map((row, index) => ({
    name: row.name,
    id: `tool_${index}`,
  }))
}

function normalizeEquipmentNameKey(name: string): string {
  return name.toLowerCase().replace(/['']/g, "'").replace(/\s+/g, " ").trim()
}

/** Collapse common English plurals for catalog lookup (Torches → Torch). */
function equipmentNameLookupKeys(name: string): string[] {
  const key = normalizeEquipmentNameKey(name)
  const keys = new Set<string>([key])
  if (key.endsWith("ies") && key.length > 3) keys.add(`${key.slice(0, -3)}y`)
  if (key.endsWith("ses") && key.length > 3) keys.add(key.slice(0, -2))
  if (key.endsWith("ches") || key.endsWith("shes") || key.endsWith("xes") || key.endsWith("zes")) {
    keys.add(key.slice(0, -2))
  } else if (key.endsWith("s") && !key.endsWith("ss") && key.length > 1) {
    keys.add(key.slice(0, -1))
  }
  return [...keys]
}

/** Word tokens for "Clothes, Traveler's" ↔ "Traveler's Clothes" style reorder. */
function equipmentNameTokens(name: string): string[] {
  return normalizeEquipmentNameKey(name)
    .replace(/,/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
}

function sameEquipmentNameTokens(a: string, b: string): boolean {
  const ta = equipmentNameTokens(a)
  const tb = equipmentNameTokens(b)
  return ta.length > 0 && ta.length === tb.length && ta.every((token, i) => token === tb[i])
}

function isToolPoolPlaceholder(name: string): boolean {
  const key = normalizeEquipmentNameKey(name)
  if (TOOL_POOL_PLACEHOLDERS.has(key)) return true
  // "Artisan's Tools (same as above)" style
  const bare = key.replace(/\s*\([^)]*\)\s*$/g, "").trim()
  return TOOL_POOL_PLACEHOLDERS.has(bare)
}

/** Strict name match for import suggestions (avoid fuzzy false positives). */
function catalogHasEquipmentName(name: string, catalog: EquipmentNameRow[]): boolean {
  if (isToolPoolPlaceholder(name)) return true
  const keys = equipmentNameLookupKeys(name)
  return catalog.some((row) => {
    const rowKeys = equipmentNameLookupKeys(row.name)
    if (keys.some((key) => rowKeys.includes(key))) return true
    return keys.some((key) => sameEquipmentNameTokens(key, normalizeEquipmentNameKey(row.name)))
  })
}

function collectNamedItems(content: ImportContent): { name: string; from: string }[] {
  const items: { name: string; from: string }[] = []

  for (const background of content.backgrounds ?? []) {
    for (const item of background.starting_equipment ?? []) {
      if (item.name?.trim()) items.push({ name: item.name.trim(), from: background.name })
    }
    for (const group of background.starting_equipment_groups ?? []) {
      for (const option of group.options ?? []) {
        for (const item of option.items ?? []) {
          if (item.name?.trim()) {
            items.push({
              name: item.name.trim(),
              from: `${background.name} (${option.label})`,
            })
          }
        }
      }
    }
  }

  for (const cls of content.classes ?? []) {
    for (const group of cls.starting_equipment_groups ?? []) {
      for (const option of group.options ?? []) {
        for (const item of option.items ?? []) {
          if (item.name?.trim()) {
            items.push({
              name: item.name.trim(),
              from: `${cls.name} (${option.label})`,
            })
          }
        }
      }
    }
  }

  return items
}

/** Names referenced by imported starting gear that are not in the equipment/tools catalogs (or this batch). */
export function collectUnmatchedStartingEquipmentNames(
  content: ImportContent,
  catalogEquipment: EquipmentNameRow[] = [...seedEquipmentCatalog(), ...seedToolCatalog()],
): { name: string; sources: string[] }[] {
  const batchNames: EquipmentNameRow[] = (content.equipment ?? []).map((row, index) => ({
    name: row.name,
    id: `batch_${index}`,
  }))
  const catalog = [...catalogEquipment, ...batchNames]

  const byKey = new Map<string, { name: string; sources: Set<string> }>()
  for (const item of collectNamedItems(content)) {
    if (item.name.toLowerCase() === "gold pieces") continue
    if (catalogHasEquipmentName(item.name, catalog)) continue
    const key = normalizeEquipmentNameKey(item.name)
    const existing = byKey.get(key)
    if (existing) {
      existing.sources.add(item.from)
    } else {
      byKey.set(key, { name: item.name, sources: new Set([item.from]) })
    }
  }

  return [...byKey.values()]
    .map((entry) => ({ name: entry.name, sources: [...entry.sources].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
