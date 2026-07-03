export type SheetToggleSourceType = "builtin" | "class_feature" | "magic_item"

export type SheetToggleDefinition = {
  id: string
  label: string
  sourceType: SheetToggleSourceType
  sourceId?: string
  defaultActive?: boolean
}

export const BUILTIN_SHEET_TOGGLES: SheetToggleDefinition[] = [
  { id: "while_raging", label: "Raging", sourceType: "builtin" },
  { id: "below_half_hp", label: "Below half hit points", sourceType: "builtin" },
  { id: "quarry_marked", label: "Quarry marked", sourceType: "builtin" },
]

const builtinById = new Map(BUILTIN_SHEET_TOGGLES.map((entry) => [entry.id, entry]))

export type SheetToggleKey = string

export function isKnownSheetToggleId(id: string): boolean {
  return builtinById.has(id) || id.startsWith("magic_item:")
}

export function getSheetToggleDefinition(id: string): SheetToggleDefinition | null {
  const builtin = builtinById.get(id)
  if (builtin) return builtin

  if (id.startsWith("magic_item:")) {
    const parts = id.split(":")
    const itemId = parts[1] ?? ""
    const effectKey = parts.slice(2).join(":") || "power"
    return {
      id,
      label: effectKey.replace(/_/g, " "),
      sourceType: "magic_item",
      sourceId: itemId,
      defaultActive: false,
    }
  }

  return null
}

export function mergeSheetToggleDefinitions(
  dynamic: SheetToggleDefinition[],
): SheetToggleDefinition[] {
  const seen = new Set(BUILTIN_SHEET_TOGGLES.map((entry) => entry.id))
  const merged = [...BUILTIN_SHEET_TOGGLES]
  for (const entry of dynamic) {
    if (seen.has(entry.id)) continue
    seen.add(entry.id)
    merged.push(entry)
  }
  return merged
}
