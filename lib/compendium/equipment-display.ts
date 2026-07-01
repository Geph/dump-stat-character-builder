import type { Equipment } from "@/lib/types"
import { propertiesToStringArray } from "@/lib/compendium/equipment-properties"
import { equipmentRequiresAttunement, isMagicItem } from "@/lib/compendium/equipment-attunement"
import {
  getArmorAcText,
  getWeaponDamageText,
  getWeaponMastery,
  getWeaponRangeText,
  isArmorItem,
  isShieldItem,
  isWeaponItem,
} from "@/lib/compendium/combat-stats"

export type EquipmentDetailRow = {
  label: string
  value: string
}

export function formatEquipmentCost(cost: Equipment["cost"]): string | null {
  if (!cost) return null
  return `${cost.amount} ${cost.unit}`
}

export function formatEquipmentWeight(weight: number | null | undefined): string | null {
  if (weight == null) return null
  return `${weight} lb.`
}

export function getEquipmentDetailRows(item: Equipment): EquipmentDetailRow[] {
  const rows: EquipmentDetailRow[] = []

  if (item.category) rows.push({ label: "Category", value: item.category })
  if (item.subcategory) rows.push({ label: "Type", value: item.subcategory })

  const cost = formatEquipmentCost(item.cost)
  if (cost) rows.push({ label: "Cost", value: cost })

  const weight = formatEquipmentWeight(item.weight)
  if (weight) rows.push({ label: "Weight", value: weight })

  if (isArmorItem(item) || isShieldItem(item)) {
    const ac = getArmorAcText(item)
    if (ac) rows.push({ label: "Armor Class", value: ac })
    if (item.stealth_disadvantage) {
      rows.push({ label: "Stealth", value: "Disadvantage" })
    }
  }

  if (isWeaponItem(item)) {
    const damage = getWeaponDamageText(item)
    if (damage) rows.push({ label: "Damage", value: damage })
    if (item.damage_type) rows.push({ label: "Damage Type", value: item.damage_type })
    const range = getWeaponRangeText(item)
    if (range) rows.push({ label: "Range", value: range })
    const mastery = getWeaponMastery(item)
    if (mastery) rows.push({ label: "Mastery", value: mastery })
  }

  const propertyTags = propertiesToStringArray(item.properties)
  if (propertyTags.length > 0) {
    rows.push({ label: "Properties", value: propertyTags.join(", ") })
  }

  if (item.source) rows.push({ label: "Source", value: item.source })

  if (isMagicItem(item)) {
    if (item.rarity) rows.push({ label: "Rarity", value: item.rarity })
    if (item.magic_item_category) {
      rows.push({ label: "Magic Type", value: item.magic_item_category })
    }
    if (item.requires_attunement != null) {
      rows.push({
        label: "Attunement",
        value: item.requires_attunement ? "Required" : "Not required",
      })
    } else if (equipmentRequiresAttunement(item)) {
      rows.push({ label: "Attunement", value: "Required" })
    }
    if (item.base_equipment_filter) {
      rows.push({
        label: "Base filter",
        value: item.base_equipment_filter.replace(/_/g, " "),
      })
    } else if (item.base_equipment_ids?.length) {
      rows.push({
        label: "Base items",
        value: `${item.base_equipment_ids.length} linked base(s)`,
      })
    }
  }

  return rows
}

export function splitEquipmentByKind(items: Equipment[]): {
  mundane: Equipment[]
  magic: Equipment[]
} {
  const mundane: Equipment[] = []
  const magic: Equipment[] = []
  for (const item of items) {
    if (isMagicItem(item)) magic.push(item)
    else mundane.push(item)
  }
  return { mundane, magic }
}

export function filterEquipmentByMagicKind(
  items: Equipment[],
  kind: "all" | "magic" | "mundane",
): Equipment[] {
  if (kind === "all") return items
  return items.filter((item) => (kind === "magic" ? isMagicItem(item) : !isMagicItem(item)))
}

export function filterEquipmentByMagicCategory(
  items: Equipment[],
  category: string,
): Equipment[] {
  if (category === "all") return items
  const needle = category.toLowerCase()
  return items.filter(
    (item) => (item.magic_item_category ?? "").toLowerCase() === needle,
  )
}

export function getMagicItemCategoryOptions(items: Equipment[]): string[] {
  const values = new Set<string>()
  for (const item of items) {
    if (item.magic_item_category) values.add(item.magic_item_category)
  }
  return [...values].sort((a, b) => a.localeCompare(b))
}

export function filterEquipmentList(items: Equipment[], query: string): Equipment[] {
  const trimmed = query.trim().toLowerCase()
  const filtered = !trimmed
    ? items
    : items.filter((item) => {
        const haystack = [
          item.name,
          item.category,
          item.subcategory ?? "",
          item.description ?? "",
          item.rarity ?? "",
          item.magic_item_category ?? "",
          item.base_equipment_filter?.replace(/_/g, " ") ?? "",
        ]
          .join(" ")
          .toLowerCase()
        return haystack.includes(trimmed)
      })

  return [...filtered].sort((a, b) => a.name.localeCompare(b.name))
}
