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
  return groups?.length ? groups : []
}

export function isGoldOnlyOption(
  option: { label: string; items: { name: string; quantity: number }[] },
  startingGold: number,
): boolean {
  if (option.items.length !== 1) return false
  const item = option.items[0]
  if (item.name.toLowerCase() !== "gold pieces") return false
  return startingGold > 0 && item.quantity === startingGold
}

export function findEquipmentByName(name: string, equipment: Equipment[]): Equipment | undefined {
  const normalized = name.toLowerCase().replace(/['']/g, "'").trim()
  const exact = equipment.find((e) => e.name.toLowerCase() === normalized)
  if (exact) return exact

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
): string[] {
  const ids: string[] = []
  for (const item of items) {
    if (item.name.toLowerCase() === "gold pieces") continue
    const match = findEquipmentByName(item.name, equipment)
    if (match && !ids.includes(match.id)) ids.push(match.id)
  }
  return ids
}
