import type { StartingEquipmentGroup } from "@/lib/types"

export type ParsedStartingEquipment = {
  starting_equipment_groups: StartingEquipmentGroup[]
  starting_gold: number
}

function parseEquipmentItemList(content: string): { name: string; quantity: number }[] {
  const items: { name: string; quantity: number }[] = []
  for (const part of content.split(/,\s*(?![^()]*\))/)) {
    const trimmed = part.trim().replace(/\.$/, "")
    if (!trimmed) continue
    const qtyMatch = trimmed.match(/^(\d+)\s+(.+)$/i)
    if (qtyMatch) {
      items.push({ name: qtyMatch[2].trim(), quantity: parseInt(qtyMatch[1], 10) || 1 })
    } else {
      items.push({ name: trimmed, quantity: 1 })
    }
  }
  return items
}

/** Parse (a)/(b) starting equipment blocks from class description prose. */
export function parseStartingEquipmentFromText(
  raw: string | null | undefined,
): ParsedStartingEquipment {
  if (!raw?.trim()) return { starting_equipment_groups: [], starting_gold: 0 }

  const equipmentSection =
    raw.match(
      /\bStarting\s+Equipment\b[:\s]*([\s\S]*?)(?=\n\s*(?:Multiclassing|Features|Table|Quick Build|Spell List|Archetype|Subclass)\b|\Z)/i,
    )?.[1] ?? raw

  const text = equipmentSection
    .trim()
    .replace(/^_+|_+$/g, "")
    .replace(/^\*+|\*+$/g, "")
    .trim()

  const prefixMatch = text.match(/^(Choose[^:]*):\s*_?\s*(.+)$/is)
  const description = prefixMatch ? prefixMatch[1].trim() : "Choose starting equipment"
  let optionsText = prefixMatch ? prefixMatch[2].trim() : text
  optionsText = optionsText.replace(/^_+\s*/, "")
  const optionStart = optionsText.search(/\([A-Za-z]\)/)
  if (optionStart > 0) optionsText = optionsText.slice(optionStart)

  const options: StartingEquipmentGroup["options"] = []
  let starting_gold = 0

  for (const chunk of optionsText.split(/;\s*(?:or\s+)?/i)) {
    const m = chunk.trim().match(/^\(([A-Z])\)\s*(.+)$/is)
    if (!m) continue
    const letter = m[1]
    const content = m[2].trim().replace(/^or\s+/i, "")
    const gpOnly = content.match(/^(\d+)\s*GP\s*$/i)
    if (gpOnly) {
      const amount = parseInt(gpOnly[1], 10)
      starting_gold = Math.max(starting_gold, amount)
      options.push({
        label: `(${letter}) ${amount} GP`,
        items: [{ name: "Gold Pieces", quantity: amount }],
      })
    } else {
      options.push({
        label: `(${letter}) ${content}`,
        items: parseEquipmentItemList(content),
      })
    }
  }

  return {
    starting_equipment_groups: options.length ? [{ description, options }] : [],
    starting_gold,
  }
}
