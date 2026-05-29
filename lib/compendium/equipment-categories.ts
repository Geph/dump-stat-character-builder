/** Equipment types for compendium folders and custom-ability attachment. */
export const EQUIPMENT_CATEGORY_ORDER = [
  "Weapon",
  "Armor",
  "Adventuring Gear",
  "Tool",
  "Mount",
  "Vehicle",
  "Trade Good",
] as const

export function groupEquipmentByCategory<T extends { category?: string | null; name: string }>(
  items: T[],
): { category: string; items: T[] }[] {
  const byCat = new Map<string, T[]>()
  for (const item of items) {
    const cat = item.category?.trim() || "Other"
    const list = byCat.get(cat) ?? []
    list.push(item)
    byCat.set(cat, list)
  }

  const ordered: { category: string; items: T[] }[] = []
  for (const cat of EQUIPMENT_CATEGORY_ORDER) {
    const list = byCat.get(cat)
    if (list?.length) {
      ordered.push({
        category: cat,
        items: [...list].sort((a, b) => a.name.localeCompare(b.name)),
      })
      byCat.delete(cat)
    }
  }

  const rest = [...byCat.entries()].sort(([a], [b]) => a.localeCompare(b))
  for (const [category, list] of rest) {
    ordered.push({
      category,
      items: [...list].sort((a, b) => a.name.localeCompare(b.name)),
    })
  }

  return ordered
}
