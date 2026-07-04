export type SheetToggleSourceType = "builtin" | "class_feature" | "magic_item"

export type SheetToggleDefinition = {
  id: string
  label: string
  sourceType: SheetToggleSourceType
  sourceId?: string
  defaultActive?: boolean
  /** When set, activating this toggle deactivates other toggles in the same group. */
  exclusiveGroup?: string
}

export const BUILTIN_SHEET_TOGGLES: SheetToggleDefinition[] = [
  { id: "while_raging", label: "Raging", sourceType: "builtin" },
  { id: "reckless_attack", label: "Attacking Recklessly", sourceType: "builtin" },
  { id: "form_of_dread", label: "Form of Dread", sourceType: "builtin" },
  { id: "vow_of_enmity", label: "Vow of Enmity", sourceType: "builtin" },
  { id: "peerless_athlete_active", label: "Peerless Athlete", sourceType: "builtin" },
  { id: "living_legend_active", label: "Living Legend", sourceType: "builtin" },
  { id: "tides_of_chaos_active", label: "Tides of Chaos", sourceType: "builtin" },
  { id: "below_half_hp", label: "Below half hit points", sourceType: "builtin" },
  { id: "quarry_marked", label: "Quarry marked", sourceType: "builtin" },
  { id: "in_combat_or_high_stakes", label: "In combat / high-stakes", sourceType: "builtin" },
]

export const PRIMORDIAL_ASPECT_TOGGLES: SheetToggleDefinition[] = [
  {
    id: "primordial_aspect_cold",
    label: "Primordial Aspect: Cold",
    sourceType: "class_feature",
    exclusiveGroup: "primordial_aspect",
  },
  {
    id: "primordial_aspect_fire",
    label: "Primordial Aspect: Fire",
    sourceType: "class_feature",
    exclusiveGroup: "primordial_aspect",
  },
  {
    id: "primordial_aspect_lightning",
    label: "Primordial Aspect: Lightning",
    sourceType: "class_feature",
    exclusiveGroup: "primordial_aspect",
  },
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

const definitionIndex = (definitions: SheetToggleDefinition[]): Map<string, SheetToggleDefinition> =>
  new Map(definitions.map((entry) => [entry.id, entry]))

/**
 * Toggle on/off with optional exclusive-group deactivation.
 * Returns the next active toggle id list.
 */
export function applySheetToggleChange(
  activeIds: readonly string[],
  toggleId: string,
  definitions: SheetToggleDefinition[],
): string[] {
  const byId = definitionIndex(definitions)
  const def = byId.get(toggleId)
  const isActive = activeIds.includes(toggleId)

  if (isActive) {
    return activeIds.filter((id) => id !== toggleId)
  }

  let next = [...activeIds, toggleId]
  const group = def?.exclusiveGroup
  if (group) {
    next = next.filter((id) => {
      if (id === toggleId) return true
      return byId.get(id)?.exclusiveGroup !== group
    })
  }
  return next
}
