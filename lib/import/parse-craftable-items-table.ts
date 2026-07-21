import type { CraftableItemEntry } from "@/lib/compendium/characteristic-modifiers"

/** Parse name → Reagent cost → Alchemist level tables from class prose. */
export function parseCraftableItemsTable(text: string): CraftableItemEntry[] {
  const items: CraftableItemEntry[] = []
  const normalized = text.replace(/<[^>]+>/g, "\n")

  let sectionLevel: number | null = null
  for (const line of normalized.split(/\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const levelHeader = trimmed.match(
      /^(?:alchemist\s+)?level\s+(\d+)\b/i,
    )
    if (levelHeader) {
      sectionLevel = parseInt(levelHeader[1]!, 10)
      continue
    }

    const pipeParts = trimmed.split(/\|/).map((part) => part.trim())
    if (pipeParts.length >= 3) {
      const itemName = pipeParts[0]
      const cost = parseInt(pipeParts[1]!, 10)
      const level = parseInt(pipeParts[2]!, 10)
      if (itemName && Number.isFinite(cost) && Number.isFinite(level)) {
        items.push({ itemName, resourceCost: cost, unlocksAtClassLevel: level, category: "Potion" })
        continue
      }
    }

    const tabMatch = trimmed.match(/^(.+?)\t+(\d+)\t+(\d+)/)
    if (tabMatch) {
      items.push({
        itemName: tabMatch[1]!.trim(),
        resourceCost: parseInt(tabMatch[2]!, 10),
        unlocksAtClassLevel: parseInt(tabMatch[3]!, 10),
        category: "Potion",
      })
      continue
    }

    const proseMatch = trimmed.match(
      /^(.+?)\s+(?:\((\d+)\s+Reagents?\)|costs?\s+(\d+)\s+Reagents?).*?(?:level|Alchemist level)\s+(\d+)/i,
    )
    if (proseMatch) {
      const cost = parseInt(proseMatch[2] ?? proseMatch[3]!, 10)
      const level = parseInt(proseMatch[4]!, 10)
      if (Number.isFinite(cost) && Number.isFinite(level)) {
        items.push({
          itemName: proseMatch[1]!.trim(),
          resourceCost: cost,
          unlocksAtClassLevel: level,
          category: "Potion",
        })
        continue
      }
    }

    // HTML two-column tables become alternating "Potion name" / "N" lines under a level header.
    if (sectionLevel != null && !/^(?:potion|reagents?|poison)$/i.test(trimmed)) {
      const costOnly = trimmed.match(/^(\d+)\s*(?:reagents?)?$/i)
      if (costOnly && items.length) {
        const last = items[items.length - 1]!
        if (last.unlocksAtClassLevel === sectionLevel && last.resourceCost === 0) {
          last.resourceCost = parseInt(costOnly[1]!, 10)
          continue
        }
      }
      if (
        !/^\d+$/.test(trimmed) &&
        /^(?:potion|philter|oil|elixir|sovereign|universal|bottled)\b/i.test(trimmed)
      ) {
        items.push({
          itemName: trimmed,
          resourceCost: 0,
          unlocksAtClassLevel: sectionLevel,
          category: "Potion",
        })
      }
    }
  }

  const byKey = new Map<string, CraftableItemEntry>()
  for (const row of items) {
    if (!row.itemName || !Number.isFinite(row.resourceCost) || row.resourceCost <= 0) continue
    byKey.set(row.itemName.toLowerCase(), row)
  }
  return [...byKey.values()]
}
