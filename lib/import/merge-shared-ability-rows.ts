/**
 * Custom abilities persist by name, so a maneuver shared by two classes (Vagabond and the
 * Warden's Grey Watchman both list Bear Hug) used to be overwritten by whichever class was
 * imported last, dropping it from the other class's picker. When the incoming knack has the
 * same rules text as an existing row owned by another class, keep one shared row eligible
 * for both owners instead.
 */

type Row = Record<string, unknown>

export type SharedAbilityOwnerLookups = {
  classes: Row[]
  subclasses: Row[]
}

function normalizedRulesPrefix(description: unknown): string {
  return String(description ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .slice(0, 160)
}

function ownerClassNames(row: Row, lookups: SharedAbilityOwnerLookups): string[] {
  const names = Array.isArray(row.eligible_classes)
    ? (row.eligible_classes as unknown[]).filter((name): name is string => typeof name === "string")
    : []
  const attachedId = typeof row.attached_to_id === "string" ? row.attached_to_id : null
  if (attachedId && row.attached_to_type === "class") {
    const cls = lookups.classes.find((entry) => entry.id === attachedId)
    if (typeof cls?.name === "string") names.push(cls.name)
  } else if (attachedId && row.attached_to_type === "subclass") {
    const sub = lookups.subclasses.find((entry) => entry.id === attachedId)
    const cls = lookups.classes.find((entry) => entry.id === sub?.class_id)
    if (typeof cls?.name === "string") names.push(cls.name)
  }
  const seen = new Set<string>()
  return names.filter((name) => {
    const key = name.trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function minLevel(a: unknown, b: unknown): number | null {
  const levels = [a, b].filter((value): value is number => typeof value === "number" && value > 0)
  return levels.length ? Math.min(...levels) : null
}

export function mergeSharedAbilityRows<T extends Row>(
  incoming: T[],
  existing: Row[],
  lookups: SharedAbilityOwnerLookups,
): T[] {
  const existingByName = new Map<string, Row>()
  for (const row of existing) {
    if (typeof row.name === "string") existingByName.set(row.name.trim().toLowerCase(), row)
  }
  return incoming.map((row) => {
    if (row.ability_role !== "knack" || typeof row.name !== "string") return row
    const prior = existingByName.get(row.name.trim().toLowerCase())
    if (!prior || prior.ability_role !== "knack") return row
    if (normalizedRulesPrefix(prior.description) !== normalizedRulesPrefix(row.description)) return row
    const priorOwners = ownerClassNames(prior, lookups)
    const nextOwners = ownerClassNames(row, lookups)
    const nextKeys = new Set(nextOwners.map((name) => name.toLowerCase()))
    const missing = priorOwners.filter((name) => !nextKeys.has(name.toLowerCase()))
    if (!missing.length) return row
    return {
      ...row,
      eligible_classes: [...nextOwners, ...missing],
      level_requirement: minLevel(prior.level_requirement, row.level_requirement),
    }
  })
}
