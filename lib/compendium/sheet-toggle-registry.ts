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
  { id: "while_wild_shape", label: "Wild Shape", sourceType: "builtin" },
  { id: "while_innate_sorcery_active", label: "Innate Sorcery", sourceType: "builtin" },
  { id: "reckless_attack", label: "Attacking Recklessly", sourceType: "builtin" },
  { id: "form_of_dread", label: "Form of Dread", sourceType: "builtin" },
  { id: "vow_of_enmity", label: "Vow of Enmity", sourceType: "builtin" },
  { id: "peerless_athlete_active", label: "Peerless Athlete", sourceType: "builtin" },
  { id: "living_legend_active", label: "Living Legend", sourceType: "builtin" },
  { id: "tides_of_chaos_active", label: "Tides of Chaos", sourceType: "builtin" },
  { id: "dragon_wings_active", label: "Dragon Wings", sourceType: "builtin" },
  { id: "below_half_hp", label: "Bloodied", sourceType: "builtin" },
  { id: "while_dancing", label: "Dancing", sourceType: "builtin" },
  { id: "quarry_marked", label: "Quarry marked", sourceType: "builtin" },
]

/** Feature-specific toggles resolvable by id but not shown on every character sheet. */
export const OPTIONAL_SHEET_TOGGLES: SheetToggleDefinition[] = [
  { id: "in_combat_or_high_stakes", label: "In combat / high-stakes", sourceType: "class_feature" },
  { id: "first_turn_of_combat", label: "First turn of combat", sourceType: "class_feature" },
  { id: "while_concentrating", label: "Concentrating", sourceType: "class_feature" },
  { id: "while_flying", label: "Flying", sourceType: "class_feature" },
  { id: "physical_surge_active", label: "Physical Surge", sourceType: "class_feature" },
  {
    id: "self_medication_active",
    label: "Self-Medication (after healing potion)",
    sourceType: "class_feature",
  },
  {
    id: "counter_discharge_active",
    label: "Counter-Discharge (vs this spell)",
    sourceType: "class_feature",
  },
]

export const EDITOR_SHEET_TOGGLE_OPTIONS: SheetToggleDefinition[] = [
  ...BUILTIN_SHEET_TOGGLES,
  ...OPTIONAL_SHEET_TOGGLES,
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

/** Active Guardian Tactics option — exclusive; set when you Use Block / Challenge / Grasp. */
export const GUARDIAN_TACTICS_TOGGLES: SheetToggleDefinition[] = [
  {
    id: "guardian_tactics_block",
    label: "Guardian Tactics: Block",
    sourceType: "class_feature",
    exclusiveGroup: "guardian_tactics",
  },
  {
    id: "guardian_tactics_challenge",
    label: "Guardian Tactics: Challenge",
    sourceType: "class_feature",
    exclusiveGroup: "guardian_tactics",
  },
  {
    id: "guardian_tactics_grasp",
    label: "Guardian Tactics: Grasp",
    sourceType: "class_feature",
    exclusiveGroup: "guardian_tactics",
  },
]

export function guardianTacticsToggleIdForOption(optionName: string): string | null {
  const n = optionName.toLowerCase().replace(/[^a-z]+/g, " ").trim()
  if (n === "block" || n.includes("block")) return "guardian_tactics_block"
  if (n === "challenge" || n.includes("challenge")) return "guardian_tactics_challenge"
  if (n === "grasp" || n.includes("grasp")) return "guardian_tactics_grasp"
  return null
}

/** Converts a class/subclass's declared new_toggles into sheet toggle definitions. */
export function sheetToggleDefinitionsFromNewToggles(
  declarations: readonly { key: string; name: string; grantingFeature?: string | null }[] | null | undefined,
): SheetToggleDefinition[] {
  if (!declarations?.length) return []
  return declarations
    .filter((entry) => entry.key && entry.name)
    .map((entry) => ({
      id: entry.key,
      label: entry.name,
      sourceType: "class_feature" as const,
      sourceId: entry.grantingFeature ?? undefined,
    }))
}

const builtinById = new Map(BUILTIN_SHEET_TOGGLES.map((entry) => [entry.id, entry]))
const optionalById = new Map(OPTIONAL_SHEET_TOGGLES.map((entry) => [entry.id, entry]))

export type SheetToggleKey = string

export function isKnownSheetToggleId(id: string): boolean {
  return builtinById.has(id) || optionalById.has(id) || id.startsWith("magic_item:")
}

export function getSheetToggleDefinition(id: string): SheetToggleDefinition | null {
  const builtin = builtinById.get(id)
  if (builtin) return builtin

  const optional = optionalById.get(id)
  if (optional) return optional

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
