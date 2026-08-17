import { CREATURE_TYPES } from "@/lib/compendium/constants"

/** "Humanoid (Goblinoid)" → "Humanoid" */
export function normalizeCreatureType(type: string | null | undefined): string {
  return (type ?? "").replace(/\s*\([^)]*\)\s*$/, "").trim()
}

export function creatureMatchesTypeFilter(
  type: string | null | undefined,
  filter: string,
): boolean {
  if (filter === "all") return true
  const raw = type?.trim() ?? ""
  if (!raw) return false
  if (raw === filter) return true
  return normalizeCreatureType(raw).toLowerCase() === filter.toLowerCase()
}

export function collectCreatureTypeOptions(
  rows: readonly { creature_type?: string | null }[],
): string[] {
  const found = new Set<string>()
  for (const row of rows) {
    const key = normalizeCreatureType(row.creature_type)
    if (key) found.add(key)
  }
  const known = CREATURE_TYPES.filter((type) =>
    [...found].some((entry) => entry.toLowerCase() === type.toLowerCase()),
  )
  const extras = [...found]
    .filter((entry) => !CREATURE_TYPES.some((type) => type.toLowerCase() === entry.toLowerCase()))
    .sort((a, b) => a.localeCompare(b))
  return [...known, ...extras]
}
