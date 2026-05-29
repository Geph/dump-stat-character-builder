export type EquipmentCost = { amount: number; unit: string }

export function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim()
}

export function parseEquipmentCost(raw: string | null | undefined): EquipmentCost | null {
  if (!raw) return null
  const cleaned = stripHtml(raw).trim()
  if (!cleaned || /^—$|^-$|^varies$/i.test(cleaned)) return null
  const m = cleaned.match(/^([\d.]+)\s*(GP|SP|CP|PP|EP)$/i)
  if (!m) return null
  return { amount: parseFloat(m[1]), unit: m[2].toUpperCase() }
}

/** Strip markdown headers, HTML, and trailing "(5 SP)" cost from equipment names. */
export function parseEquipmentNameAndCost(name: string): {
  name: string
  cost: EquipmentCost | null
} {
  let cleaned = stripHtml(name)
    .replace(/^#+\s*/, "")
    .trim()

  const parenCost = cleaned.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
  if (parenCost) {
    return {
      name: parenCost[1].trim(),
      cost: parseEquipmentCost(parenCost[2]),
    }
  }

  return { name: cleaned, cost: null }
}

export function parseEquipmentWeight(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw
  if (typeof raw !== "string") return null
  const cleaned = stripHtml(raw)
  if (!cleaned || /^—$|^-$|^varies$/i.test(cleaned)) return null
  const m = cleaned.match(/([\d.]+)\s*lb\.?/i)
  return m ? parseFloat(m[1]) : null
}

function cleanProperties(props: unknown): Record<string, unknown> {
  if (!props || typeof props !== "object" || Array.isArray(props)) {
    return {}
  }

  const p = { ...(props as Record<string, unknown>) }

  if (typeof p.damage === "string") {
    p.damage = stripHtml(p.damage)
  }

  if (Array.isArray(p.properties)) {
    p.properties = p.properties
      .map((entry) => (typeof entry === "string" ? stripHtml(entry) : entry))
      .filter(
        (entry) =>
          typeof entry === "string" &&
          entry.length > 0 &&
          !/^<\/?t[dh]r]?>/i.test(entry) &&
          !/^<\/?tr>$/i.test(entry),
      )
  }

  if (typeof p.mastery === "string") {
    const mastery = stripHtml(p.mastery)
    p.mastery = mastery && mastery !== "—" ? mastery : null
  }

  if (typeof p.ac === "string") {
    p.ac = stripHtml(p.ac)
  }

  return p
}

export function normalizeEquipmentRow(
  row: Record<string, unknown>,
): Record<string, unknown> | null {
  if (!row.name || typeof row.name !== "string") return null

  const { name, cost: costFromName } = parseEquipmentNameAndCost(row.name)
  if (!name || /^(item|name|armor|weight|cost)$/i.test(name)) return null
  if (/^<\/?t[dhr][^>]*>$/i.test(name)) return null

  let cost: EquipmentCost | null = costFromName
  if (row.cost && typeof row.cost === "object" && row.cost !== null && "unit" in row.cost) {
    cost = row.cost as EquipmentCost
  } else if (typeof row.cost === "string") {
    cost = parseEquipmentCost(row.cost)
  }

  const description =
    typeof row.description === "string"
      ? stripHtml(row.description).replace(/^#+\s*/, "").trim() || null
      : (row.description as string | null) ?? null

  return {
    ...row,
    name,
    cost,
    weight: parseEquipmentWeight(row.weight),
    properties: cleanProperties(row.properties),
    description,
  }
}

/** Dedupe by name; merge descriptions and fill missing cost/weight. */
export function normalizeEquipmentRows(
  rows: Record<string, unknown>[],
): Record<string, unknown>[] {
  const byName = new Map<string, Record<string, unknown>>()

  for (const row of rows) {
    const normalized = normalizeEquipmentRow(row)
    if (!normalized) continue

    const key = (normalized.name as string).toLowerCase()
    const existing = byName.get(key)
    if (!existing) {
      byName.set(key, normalized)
      continue
    }

    if (!existing.description && normalized.description) {
      existing.description = normalized.description
    }
    if (!existing.cost && normalized.cost) {
      existing.cost = normalized.cost
    }
    if ((existing.weight == null || existing.weight === 0) && normalized.weight) {
      existing.weight = normalized.weight
    }
  }

  return [...byName.values()]
}
