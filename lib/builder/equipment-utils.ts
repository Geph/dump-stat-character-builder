import { normalizeStartingEquipmentGroups } from "@/lib/compendium/normalize-class-data"
import type { DndClass, Equipment } from "@/lib/types"

export type StartingEquipmentGroup = {
  description: string
  options: {
    label: string
    items: { name: string; quantity: number }[]
  }[]
}

export function getStartingEquipmentGroups(
  dndClass: DndClass | null | undefined,
): StartingEquipmentGroup[] {
  const groups = (dndClass as DndClass & { starting_equipment_groups?: StartingEquipmentGroup[] })
    ?.starting_equipment_groups
  return normalizeStartingEquipmentGroups(groups)
}

export function isGoldOnlyOption(
  option: { label: string; items: { name: string; quantity: number }[] },
  startingGold: number,
): boolean {
  const items = option.items ?? []
  if (items.length !== 1) return false
  const item = items[0]
  if (item.name.toLowerCase() !== "gold pieces") return false
  return startingGold > 0 && item.quantity === startingGold
}

/** "Martial Weapon" / "any simple weapon" style category lines. */
export function equipmentCategoryKind(name: string): "martial" | "simple" | null {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, " ")
  if (/^(any\s+)?martial\s+weapons?$/.test(normalized)) return "martial"
  if (/^(any\s+)?simple\s+weapons?$/.test(normalized)) return "simple"
  return null
}

function isMartialWeapon(item: Equipment): boolean {
  return /weapon/i.test(item.category ?? "") && /martial/i.test(String(item.subcategory ?? ""))
}

function isSimpleWeapon(item: Equipment): boolean {
  return /weapon/i.test(item.category ?? "") && /simple/i.test(String(item.subcategory ?? ""))
}

export function equipmentForCategory(
  kind: "martial" | "simple",
  equipment: Equipment[],
): Equipment[] {
  return equipment
    .filter((row) => (kind === "martial" ? isMartialWeapon(row) : isSimpleWeapon(row)))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function packageOptionLetter(label: string, index: number): string {
  const trimmed = label.trim()
  const match = trimmed.match(/^([A-Za-z])\b/)
  if (match) return match[1]!.toUpperCase()
  return String.fromCharCode(65 + index)
}

/**
 * Collapse a run of single martial/simple weapon package options into one
 * category choice (e.g. many "Option C" swords → one "Martial Weapon" pick).
 */
export function collapseWeaponCategoryPackageOptions(
  options: { label: string; items: { name: string; quantity: number }[] }[],
  equipment: Equipment[],
): { label: string; items: { name: string; quantity: number }[] }[] {
  if (!options.length) return options
  const martialNames = new Set(equipmentForCategory("martial", equipment).map((row) => row.name.toLowerCase()))
  const simpleNames = new Set(equipmentForCategory("simple", equipment).map((row) => row.name.toLowerCase()))

  const result: { label: string; items: { name: string; quantity: number }[] }[] = []
  let index = 0
  while (index < options.length) {
    const option = options[index]!
    const items = option.items ?? []
    const single = items.length === 1 ? items[0]!.name.trim() : ""
    const kind =
      equipmentCategoryKind(single) ??
      (martialNames.has(single.toLowerCase())
        ? "martial"
        : simpleNames.has(single.toLowerCase())
          ? "simple"
          : null)

    if (!kind || items.length !== 1) {
      result.push(option)
      index += 1
      continue
    }

    const letter = packageOptionLetter(option.label, index)
    let end = index + 1
    while (end < options.length) {
      const next = options[end]!
      const nextItems = next.items ?? []
      if (nextItems.length !== 1) break
      if (packageOptionLetter(next.label, end) !== letter) break
      const nextName = nextItems[0]!.name.trim()
      const nextKind =
        equipmentCategoryKind(nextName) ??
        (martialNames.has(nextName.toLowerCase())
          ? "martial"
          : simpleNames.has(nextName.toLowerCase())
            ? "simple"
            : null)
      if (nextKind !== kind) break
      end += 1
    }

    if (end - index === 1 && equipmentCategoryKind(single)) {
      result.push(option)
    } else if (end - index >= 1) {
      result.push({
        label: letter,
        items: [
          {
            name: kind === "martial" ? "Martial Weapon" : "Simple Weapon",
            quantity: items[0]?.quantity ?? 1,
          },
        ],
      })
    }
    index = end
  }
  return result
}

export function findEquipmentByName(name: string, equipment: Equipment[]): Equipment | undefined {
  const normalized = name.toLowerCase().replace(/['']/g, "'").trim()
  const exact = equipment.find((e) => e.name.toLowerCase() === normalized)
  if (exact) return exact

  const singular = normalized.replace(/ies$/, "y").replace(/s$/, "")
  if (singular !== normalized) {
    const bySingular = equipment.find((e) => e.name.toLowerCase() === singular)
    if (bySingular) return bySingular
  }

  const parenMatch = name.match(/^(.+?)\s*\((.+)\)$/)
  if (parenMatch) {
    const variant = equipment.find((e) =>
      e.name.toLowerCase().includes(parenMatch[2].toLowerCase()),
    )
    if (variant) return variant
    const base = equipment.find((e) =>
      e.name.toLowerCase().includes(parenMatch[1].toLowerCase()),
    )
    if (base) return base
  }

  const possessive = normalized.replace(/'s\b/g, "")
  return equipment.find((e) => {
    const en = e.name.toLowerCase()
    return en === possessive || en.includes(normalized) || normalized.includes(en)
  })
}

export function resolvePackageEquipmentIds(
  items: { name: string; quantity: number }[],
  equipment: Equipment[],
  categoryPicks: Record<string, string> = {},
  pickKeyPrefix = "",
): string[] {
  const ids: string[] = []
  items.forEach((item, index) => {
    if (item.name.toLowerCase() === "gold pieces") return
    const category = equipmentCategoryKind(item.name)
    if (category) {
      const pickedId = categoryPicks[`${pickKeyPrefix}${index}`]
      if (pickedId && !ids.includes(pickedId)) ids.push(pickedId)
      return
    }
    const match = findEquipmentByName(item.name, equipment)
    if (match && !ids.includes(match.id)) ids.push(match.id)
  })
  return ids
}

/** Sum GP bundled in a starting equipment package (excluding resolved item rows). */
export function sumPackageGoldPieces(
  items: { name: string; quantity: number }[] | undefined,
): number {
  if (!items?.length) return 0
  return items
    .filter((item) => item.name.toLowerCase() === "gold pieces")
    .reduce((sum, item) => sum + item.quantity, 0)
}

export function computeStartingCharacterGold(options: {
  inGoldShoppingMode: boolean
  goldRemaining: number
  classOption: { items: { name: string; quantity: number }[] } | null
  backgroundOption: { items: { name: string; quantity: number }[] } | null
}): number {
  if (options.inGoldShoppingMode) return Math.max(0, options.goldRemaining)
  return (
    sumPackageGoldPieces(options.classOption?.items) +
    sumPackageGoldPieces(options.backgroundOption?.items)
  )
}

export function getEquipmentCostGp(item: Equipment): number {
  if (!item.cost) return 0
  const unit = item.cost.unit?.toLowerCase() ?? "gp"
  if (unit === "cp") return item.cost.amount / 100
  if (unit === "sp") return item.cost.amount / 10
  if (unit === "ep") return item.cost.amount / 2
  if (unit === "pp") return item.cost.amount * 10
  return item.cost.amount
}

export function sumEquipmentGoldCost(ids: string[], equipment: Equipment[]): number {
  let total = 0
  for (const id of ids) {
    const item = equipment.find((e) => e.id === id)
    if (item) total += getEquipmentCostGp(item)
  }
  return total
}

export function formatEquipmentCost(item: Equipment): string | null {
  if (!item.cost) return null
  return `${item.cost.amount} ${item.cost.unit?.toUpperCase() ?? "GP"}`
}

