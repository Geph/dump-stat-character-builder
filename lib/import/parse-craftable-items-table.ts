import type { CraftableItemEntry } from "@/lib/compendium/characteristic-modifiers"

/** Parse name → Reagent cost → Alchemist level tables from class prose. */
export function parseCraftableItemsTable(text: string): CraftableItemEntry[] {
  const items: CraftableItemEntry[] = []
  const normalized = text.replace(/<[^>]+>/g, "\n")

  for (const line of normalized.split(/\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const pipeParts = trimmed.split(/\|/).map((part) => part.trim())
    if (pipeParts.length >= 3) {
      const itemName = pipeParts[0]
      const cost = parseInt(pipeParts[1], 10)
      const level = parseInt(pipeParts[2], 10)
      if (itemName && Number.isFinite(cost) && Number.isFinite(level)) {
        items.push({ itemName, resourceCost: cost, unlocksAtClassLevel: level, category: "Potion" })
        continue
      }
    }

    const tabMatch = trimmed.match(/^(.+?)\t+(\d+)\t+(\d+)/)
    if (tabMatch) {
      items.push({
        itemName: tabMatch[1].trim(),
        resourceCost: parseInt(tabMatch[2], 10),
        unlocksAtClassLevel: parseInt(tabMatch[3], 10),
        category: "Potion",
      })
      continue
    }

    const proseMatch = trimmed.match(
      /^(.+?)\s+(?:\((\d+)\s+Reagents?\)|costs?\s+(\d+)\s+Reagents?).*?(?:level|Alchemist level)\s+(\d+)/i,
    )
    if (proseMatch) {
      const cost = parseInt(proseMatch[2] ?? proseMatch[3], 10)
      const level = parseInt(proseMatch[4], 10)
      if (Number.isFinite(cost) && Number.isFinite(level)) {
        items.push({
          itemName: proseMatch[1].trim(),
          resourceCost: cost,
          unlocksAtClassLevel: level,
          category: "Potion",
        })
      }
    }
  }

  const byKey = new Map<string, CraftableItemEntry>()
  for (const row of items) {
    byKey.set(row.itemName.toLowerCase(), row)
  }
  return [...byKey.values()]
}
