import type { Equipment } from "@/lib/types"
import { propertiesToStringArray } from "@/lib/compendium/equipment-properties"
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

  return rows
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
          item.damage ?? "",
          item.damage_type ?? "",
        ]
          .join(" ")
          .toLowerCase()
        return haystack.includes(trimmed)
      })

  return [...filtered].sort((a, b) => a.name.localeCompare(b.name))
}
