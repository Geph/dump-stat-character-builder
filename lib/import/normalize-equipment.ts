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

  if (Array.isArray(p.forms)) {
    p.forms = p.forms
      .filter((form) => form && typeof form === "object")
      .map((form) => {
        const entry = { ...(form as Record<string, unknown>) }
        if (typeof entry.name === "string") entry.name = stripHtml(entry.name)
        if (typeof entry.damage === "string") entry.damage = stripHtml(entry.damage)
        if (typeof entry.mastery === "string") entry.mastery = stripHtml(entry.mastery)
        if (Array.isArray(entry.properties)) {
          entry.properties = entry.properties
            .map((prop) => (typeof prop === "string" ? stripHtml(prop) : prop))
            .filter((prop): prop is string => typeof prop === "string" && prop.length > 0)
        }
        return entry
      })
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

function coerceStringArray(value: unknown): string[] | null {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (Array.isArray(parsed)) {
        return parsed.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
      }
    } catch {
      return trimmed.split(/[,;]/).map((entry) => entry.trim()).filter(Boolean)
    }
  }
  return null
}

function coerceBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value !== 0
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (/^(true|yes|required|1)$/.test(normalized)) return true
    if (/^(false|no|none|0|not required)$/.test(normalized)) return false
  }
  return null
}

function coerceMagicFields(row: Record<string, unknown>): Record<string, unknown> {
  const next = { ...row }

  if ("requires_attunement" in next) {
    const attune = coerceBoolean(next.requires_attunement)
    if (attune != null) next.requires_attunement = attune
  }

  if ("base_equipment_ids" in next) {
    const ids = coerceStringArray(next.base_equipment_ids)
    if (ids) next.base_equipment_ids = ids
  }

  if (typeof next.base_equipment_filter === "string") {
    next.base_equipment_filter = next.base_equipment_filter.trim() || null
  }

  if (typeof next.magic_item_category === "string") {
    next.magic_item_category = next.magic_item_category.trim() || null
  }

  if (typeof next.rarity === "string") {
    next.rarity = next.rarity.trim() || null
  }

  if (Array.isArray(next.magic_effects)) {
    next.magic_effects = next.magic_effects.filter(
      (entry) => entry && typeof entry === "object" && !Array.isArray(entry),
    )
  }

  return next
}

function inferWeaponSubcategory(row: Record<string, unknown>): string | null {
  const existing = typeof row.subcategory === "string" ? row.subcategory.trim() : ""
  if (existing) return existing

  if (row.category !== "Weapon") return null

  const props = cleanProperties(row.properties)
  const tags = Array.isArray(props.properties)
    ? props.properties.filter((p): p is string => typeof p === "string").join(" ")
    : ""
  const name = String(row.name ?? "")
  const haystack = `${name} ${tags}`.toLowerCase()

  if (Array.isArray(props.forms) && props.forms.length > 0) {
    return "Switch Weapon"
  }

  if (/firearm|ammunition|bullet|reload/i.test(haystack)) {
    if (/renaissance|musket|blunderbuss|ballista/i.test(haystack)) return "Renaissance Firearm"
    if (/modern|submachine|assault rifle|handgun|magnum|flare gun|sniper rifle/i.test(haystack)) {
      return "Modern Firearm"
    }
    if (/industrial|cannon|gatling|double-barrel|hunting rifle|parlor gun|revolver/i.test(haystack)) {
      return "Industrial Age Firearm"
    }
    return "Martial Ranged"
  }

  if (/ammunition|range \d/i.test(tags) && !/thrown/i.test(tags)) {
    return /simple/i.test(haystack) ? "Simple Ranged" : "Martial Ranged"
  }

  return null
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

  const subcategory =
    inferWeaponSubcategory(row) ??
    (typeof row.subcategory === "string" ? row.subcategory.trim() || null : null)

  return coerceMagicFields({
    ...row,
    name,
    subcategory,
    cost,
    weight: parseEquipmentWeight(row.weight),
    properties: cleanProperties(row.properties),
    description,
  })
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
