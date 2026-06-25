import type { Equipment } from "@/lib/types"
import { isArmorItem, isShieldItem, isWeaponItem } from "@/lib/compendium/combat-stats"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"

export const MAGIC_ITEM_CATEGORIES = [
  "Armor",
  "Potion",
  "Ring",
  "Rod",
  "Scroll",
  "Staff",
  "Wand",
  "Weapon",
  "Wondrous Item",
] as const

export type MagicItemCategory = (typeof MAGIC_ITEM_CATEGORIES)[number]

export const EQUIPMENT_RARITIES = [
  "Common",
  "Uncommon",
  "Rare",
  "Very Rare",
  "Legendary",
  "Artifact",
] as const

export type EquipmentRarity = (typeof EQUIPMENT_RARITIES)[number]

export type BaseEquipmentFilter = "any_melee_weapon" | "any_ranged_weapon" | "any_weapon"

export type EquipmentModifierScope = "wielded" | "worn" | "attuned"

/** When magic effects apply: weapons when wielded, armor/shields when worn, other magic when attuned. */
export function getMagicEffectScope(item: Equipment): EquipmentModifierScope {
  if (isWeaponItem(item)) return "wielded"
  if (isArmorItem(item) || isShieldItem(item)) return "worn"
  return "attuned"
}

export function itemMatchesBaseEquipmentFilter(
  item: Equipment,
  filter: BaseEquipmentFilter,
): boolean {
  if (item.magic_item_category?.trim() || item.rarity?.trim() || item.requires_attunement != null) {
    return false
  }
  if (!isWeaponItem(item)) return false
  if (filter === "any_weapon") return true
  const sub = (item.subcategory ?? "").toLowerCase()
  if (filter === "any_melee_weapon") {
    return sub.includes("melee") || (!sub.includes("ranged") && !sub.includes("firearm"))
  }
  return sub.includes("ranged") || sub.includes("firearm")
}

export function resolveBaseEquipmentId(
  item: Equipment,
  catalog: Equipment[],
  selectedBaseId?: string | null,
): string | null {
  const explicit = selectedBaseId ?? item.selected_base_equipment_id
  if (explicit) {
    return catalog.some((entry) => entry.id === explicit) ? explicit : null
  }

  const ids = item.base_equipment_ids ?? []
  if (ids.length === 1) return ids[0] ?? null
  if (ids.length > 1) return null

  if (item.base_equipment_filter) {
    const match = catalog.find((entry) =>
      itemMatchesBaseEquipmentFilter(entry, item.base_equipment_filter!),
    )
    return match?.id ?? null
  }

  return null
}

export function readMagicEffects(item: Equipment): LinkedModifierInstance[] {
  const raw = item.magic_effects
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (entry): entry is LinkedModifierInstance =>
      !!entry &&
      typeof entry === "object" &&
      typeof (entry as LinkedModifierInstance).instanceId === "string" &&
      typeof (entry as LinkedModifierInstance).catalogRefId === "string",
  )
}
