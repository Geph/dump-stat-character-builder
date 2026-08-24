import { spellNameMatchKeys } from "@/lib/import/class-spell-lists"

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
  const merged = new Set<string>()
  for (const name of [...asStringArray(existing), ...asStringArray(incoming)]) {
    const key = name.toLowerCase()
    if ([...merged].some((have) => have.toLowerCase() === key)) continue
    merged.add(name)
  }
  return [...merged]
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
