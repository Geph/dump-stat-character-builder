import { itemMatchesBaseEquipmentFilter } from "@/lib/compendium/equipment-magic"
import { isMagicItem } from "@/lib/compendium/equipment-attunement"
import { resolveEffectiveEquipment } from "@/lib/compendium/resolve-effective-equipment"
import type { Equipment } from "@/lib/types"

export type EquipmentBaseSelections = Record<string, string>

export function getSelectedBaseId(
  item: Equipment,
  baseSelections: EquipmentBaseSelections,
): string | null {
  return baseSelections[item.id] ?? item.selected_base_equipment_id ?? null
}

export function getBaseSelectionOptions(item: Equipment, catalog: Equipment[]): Equipment[] {
  const ids = item.base_equipment_ids ?? []
  if (ids.length > 0) {
    const byId = new Map(catalog.map((entry) => [entry.id, entry]))
    return ids.map((id) => byId.get(id)).filter((entry): entry is Equipment => Boolean(entry))
  }
  if (item.base_equipment_filter) {
    return catalog.filter((entry) => itemMatchesBaseEquipmentFilter(entry, item.base_equipment_filter!))
  }
  return []
}

export function needsBaseSelection(
  item: Equipment,
  catalog: Equipment[],
  baseSelections: EquipmentBaseSelections = {},
): boolean {
  if (getSelectedBaseId(item, baseSelections)) return false
  const options = getBaseSelectionOptions(item, catalog)
  if (options.length > 1) return true
  if (item.base_equipment_filter && options.length > 0) return true
  return false
}

export function resolveCharacterEquipment(
  item: Equipment,
  catalog: Equipment[],
  baseSelections: EquipmentBaseSelections = {},
): Equipment {
  const selectedBaseId = getSelectedBaseId(item, baseSelections)
  const options = getBaseSelectionOptions(item, catalog)
  const inferredBaseId =
    selectedBaseId ??
    (options.length === 1 ? options[0]?.id ?? null : null) ??
    (item.base_equipment_ids?.length === 1 ? item.base_equipment_ids[0] ?? null : null)

  return resolveEffectiveEquipment(item, catalog, {
    selectedBaseId: inferredBaseId,
  })
}

export function formatBaseSelectionLabel(item: Equipment): string | null {
  if (item.base_equipment_filter) {
    return item.base_equipment_filter.replace(/_/g, " ")
  }
  const count = item.base_equipment_ids?.length ?? 0
  if (count > 1) return `${count} base options`
  return null
}

export function magicItemSummaryLine(item: Equipment, resolved?: Equipment | null): string | null {
  const target = resolved ?? item
  if (target.damage) return `Damage ${target.damage}${target.damage_type ? ` ${target.damage_type}` : ""}`
  if (target.armor_class != null) return `AC ${target.armor_class}`
  const props = target.properties
  if (props && typeof props === "object" && !Array.isArray(props)) {
    const ac = (props as Record<string, unknown>).ac
    if (typeof ac === "string" || typeof ac === "number") return `AC ${ac}`
    const damage = (props as Record<string, unknown>).damage
    if (typeof damage === "string") return `Damage ${damage}`
  }
  if (isMagicItem(item) && item.rarity) return item.rarity
  return null
}
