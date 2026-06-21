import { normalizeStartingEquipmentGroups } from "@/lib/compendium/normalize-class-data"
import type { Background, StartingEquipmentGroup } from "@/lib/types"

function parseItemList(text: string): { name: string; quantity: number }[] {
  const items: { name: string; quantity: number }[] = []
  let rest = text.trim()
  if (!rest) return items

  const gpMatch = rest.match(/,\s*(\d+)\s*GP\s*$/i)
  if (gpMatch) {
    items.push({ name: "Gold Pieces", quantity: parseInt(gpMatch[1], 10) })
    rest = rest.slice(0, gpMatch.index).trim()
  } else if (/^(\d+)\s*GP$/i.test(rest)) {
    const onlyGp = rest.match(/^(\d+)\s*GP$/i)!
    return [{ name: "Gold Pieces", quantity: parseInt(onlyGp[1], 10) }]
  }

  if (!rest) return items

  const parts = rest.split(/,\s+(?![^()]*\))/).map((p) => p.trim()).filter(Boolean)
  for (const part of parts) {
    const qtyMatch = part.match(/^(.+?)\s*\((\d+)\s+sheets?\)$/i)
    if (qtyMatch) {
      items.push({ name: qtyMatch[1].trim(), quantity: parseInt(qtyMatch[2], 10) })
      continue
    }
    const leadingQty = part.match(/^(\d+)\s+(.+)$/)
    if (leadingQty) {
      items.push({ name: leadingQty[2].trim(), quantity: parseInt(leadingQty[1], 10) })
      continue
    }
    items.push({ name: part, quantity: 1 })
  }
  return items
}

function parseLegacyEquipmentString(raw: string): StartingEquipmentGroup[] {
  const text = raw
    .replace(/^_Choose A or B:_\s*/i, "")
    .replace(/\*+/g, "")
    .trim()
  if (!text) return []

  const segments = text.split(/\s*;\s*or\s*\(?/i).map((s) => s.trim()).filter(Boolean)
  if (segments.length <= 1) {
    const items = parseItemList(text.replace(/^\([AB]\)\s*/i, ""))
    if (!items.length) return []
    return [
      {
        description: "Choose your background starting equipment package:",
        options: [{ label: "A", items }],
      },
    ]
  }

  const options = segments.map((segment, index) => {
    const cleaned = segment.replace(/^\([AB]\)\)?\s*/i, "").replace(/^\)\s*/, "").trim()
    const label = String.fromCharCode(65 + index)
    return { label, items: parseItemList(cleaned) }
  })

  return [
    {
      description: "Choose one background starting equipment package:",
      options,
    },
  ]
}

/** Resolve background equipment choice groups from structured data or legacy SRD text. */
export function getBackgroundStartingEquipmentGroups(
  background: Background | null | undefined,
): StartingEquipmentGroup[] {
  if (!background) return []
  if (background.starting_equipment_groups?.length) {
    return normalizeStartingEquipmentGroups(background.starting_equipment_groups)
  }
  if (background.starting_equipment?.length) {
    return [
      {
        description: "Background starting equipment:",
        options: [{ label: "Standard", items: background.starting_equipment }],
      },
    ]
  }
  if (typeof background.equipment === "string" && background.equipment.trim()) {
    return parseLegacyEquipmentString(background.equipment)
  }
  return []
}

export function getBackgroundStartingGold(background: Background | null | undefined): number {
  if (!background) return 0
  if (background.starting_gold != null && background.starting_gold > 0) {
    return background.starting_gold
  }
  const groups = getBackgroundStartingEquipmentGroups(background)
  const goldOption = groups[0]?.options.find((opt) =>
    opt.items.length === 1 && opt.items[0].name.toLowerCase() === "gold pieces",
  )
  return goldOption?.items[0]?.quantity ?? 0
}
