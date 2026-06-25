import type { Equipment } from "@/lib/types"
import { isArmorItem, isShieldItem, isWeaponItem } from "@/lib/compendium/combat-stats"
import {
  EQUIPMENT_RARITIES,
  MAGIC_ITEM_CATEGORIES,
} from "@/lib/compendium/equipment-magic"
import { propertiesToStringArray } from "@/lib/compendium/equipment-properties"

/** SRD default when no modifier sets a total. */
export const DEFAULT_ATTUNEMENT_SLOTS = 3

const MAGIC_ITEM_CATEGORY_SET = new Set(
  MAGIC_ITEM_CATEGORIES.map((category) => category.toLowerCase()),
)

const RARITY_KEYWORDS = EQUIPMENT_RARITIES.map((rarity) => rarity.toLowerCase())

function descriptionHaystack(item: Equipment): string {
  return [
    ...propertiesToStringArray(item.properties),
    item.description ?? "",
    item.category ?? "",
    item.subcategory ?? "",
    item.rarity ?? "",
    item.magic_item_category ?? "",
  ]
    .join(" ")
    .toLowerCase()
}

export function equipmentRequiresAttunement(item: Equipment): boolean {
  if (item.requires_attunement === true) return true
  if (item.requires_attunement === false) return false
  const haystack = descriptionHaystack(item)
  return haystack.includes("requires attunement") || haystack.includes("require attunement")
}

export function isMagicItem(item: Equipment): boolean {
  if (item.magic_item_category?.trim()) return true
  if (item.rarity?.trim()) return true
  if (item.requires_attunement != null) return true

  const haystack = descriptionHaystack(item)
  if (haystack.includes("magic item")) return true
  if (RARITY_KEYWORDS.some((rarity) => haystack.includes(rarity))) return true

  const category = (item.magic_item_category ?? item.subcategory ?? item.category ?? "")
    .trim()
    .toLowerCase()
  if (MAGIC_ITEM_CATEGORY_SET.has(category)) {
    // Wondrous Item subcategory on mundane gear is rare; category alone is not enough.
    if (category === "wondrous item") return true
    if (equipmentRequiresAttunement(item)) return true
    if (RARITY_KEYWORDS.some((rarity) => haystack.includes(rarity))) return true
  }

  return equipmentRequiresAttunement(item)
}

/** Wear/wield is blocked until the item is attuned. */
export function mustAttuneBeforeEquip(item: Equipment): boolean {
  return isMagicItem(item) && (isArmorItem(item) || isShieldItem(item) || isWeaponItem(item))
}

/** Items the sheet can mark equipped or attuned (SRD p. 102). */
export function isSheetEquippableItem(item: Equipment): boolean {
  return (
    isArmorItem(item) ||
    isShieldItem(item) ||
    isWeaponItem(item) ||
    isMagicItem(item)
  )
}

export function isAttunableItem(item: Equipment): boolean {
  return isMagicItem(item)
}
