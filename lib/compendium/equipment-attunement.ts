import type { Equipment } from "@/lib/types"
import { isArmorItem, isShieldItem, isWeaponItem } from "@/lib/compendium/combat-stats"
import { propertiesToStringArray } from "@/lib/compendium/equipment-properties"

/** SRD default when no modifier sets a total. */
export const DEFAULT_ATTUNEMENT_SLOTS = 3

export function equipmentRequiresAttunement(item: Equipment): boolean {
  const haystack = [
    ...propertiesToStringArray(item.properties),
    item.description ?? "",
    item.category ?? "",
    item.subcategory ?? "",
  ]
    .join(" ")
    .toLowerCase()
  return haystack.includes("attunement") || haystack.includes("attune")
}

/** Items the sheet can mark equipped or attuned (SRD p. 102). */
export function isSheetEquippableItem(item: Equipment): boolean {
  return (
    isArmorItem(item) ||
    isShieldItem(item) ||
    isWeaponItem(item) ||
    equipmentRequiresAttunement(item)
  )
}

export function isAttunableItem(item: Equipment): boolean {
  return equipmentRequiresAttunement(item)
}
