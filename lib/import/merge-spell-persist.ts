import {
  collectClassSpellLists,
  spellNameMatchKeys,
  stampClassSpellListsOntoSpellRows,
  unionSpellClassNames,
} from "@/lib/import/class-spell-lists"

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean)
}

function firstFilled(...values: unknown[]): unknown {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value
    if (Array.isArray(value) && value.length) return value
    if (value != null && value !== "" && typeof value !== "string" && !Array.isArray(value)) {
      return value
    }
  }
  return undefined
}

function unionClasses(existing: unknown, incoming: unknown): string[] {
  return unionSpellClassNames(asStringArray(existing), asStringArray(incoming))
}

/**
 * Keep a richer catalog row (SRD write-up) when a later class import only has a
 * list stub. Always union `classes` so Investigator (and similar) tags stick.
 */
export function mergeSpellRowForPersist(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...existing,
    ...incoming,
    id: existing.id,
    name: existing.name ?? incoming.name,
    created_at: existing.created_at ?? incoming.created_at,
    description: firstFilled(existing.description, incoming.description) ?? incoming.description,
    casting_time: firstFilled(existing.casting_time, incoming.casting_time) ?? incoming.casting_time,
    range: firstFilled(existing.range, incoming.range) ?? incoming.range,
    components: firstFilled(existing.components, incoming.components) ?? incoming.components,
    duration: firstFilled(existing.duration, incoming.duration) ?? incoming.duration,
    material: firstFilled(existing.material, incoming.material) ?? incoming.material,
    higher_levels: firstFilled(existing.higher_levels, incoming.higher_levels) ?? incoming.higher_levels,
    school: firstFilled(existing.school, incoming.school) ?? incoming.school,
    classes: unionClasses(existing.classes, incoming.classes),
    enabled: "enabled" in existing ? existing.enabled : incoming.enabled,
  }
}

export function mergeIncomingSpellsWithExisting(
  incoming: Record<string, unknown>[],
  existing: Record<string, unknown>[],
): Record<string, unknown>[] {
  const byName = new Map<string, Record<string, unknown>>()
  for (const row of existing) {
    for (const key of spellNameMatchKeys(String(row.name ?? ""))) {
      if (key && !byName.has(key)) byName.set(key, row)
    }
  }
  return incoming.map((row) => {
    const prev = spellNameMatchKeys(String(row.name ?? ""))
      .map((key) => byName.get(key))
      .find((entry): entry is Record<string, unknown> => Boolean(entry))
    return prev ? mergeSpellRowForPersist(prev, row) : row
  })
}

/**
 * Catalog patches for linked/skipped existing spells, plus incoming rows after
 * merge + class-list stamps. Call on every class or spell persist.
 */
export function spellRowsToUpsertForClassLists(params: {
  existingSpells: Record<string, unknown>[]
  existingClasses?: Record<string, unknown>[]
  incomingClasses?: Record<string, unknown>[]
  incomingSpells?: Record<string, unknown>[]
}): { catalogPatches: Record<string, unknown>[]; incoming: Record<string, unknown>[] } {
  const lists = collectClassSpellLists([
    ...(params.existingClasses ?? []),
    ...(params.incomingClasses ?? []),
  ])
  const incomingMerged = params.incomingSpells?.length
    ? mergeIncomingSpellsWithExisting(params.incomingSpells, params.existingSpells)
    : []
  const incomingKeys = new Set(
    incomingMerged.flatMap((row) => spellNameMatchKeys(String(row.name ?? ""))),
  )
  const catalogPatches = stampClassSpellListsOntoSpellRows(params.existingSpells, lists).changed.filter(
    (row) => !spellNameMatchKeys(String(row.name ?? "")).some((key) => incomingKeys.has(key)),
  )
  const incoming = stampClassSpellListsOntoSpellRows(incomingMerged, lists).all
  return { catalogPatches, incoming }
}
