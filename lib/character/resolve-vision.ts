export type CharacterVisionEntry = {
  type: string
  rangeFeet: number
}

/**
 * Merge plain SRD species-trait text (a "Darkvision" trait card with no structured
 * CharacteristicModifier) with the aggregated `vision` characteristic (feats, homebrew
 * species/tremorsense, etc). Both paths can describe the same sense — take the larger range
 * instead of stacking duplicates.
 */
export function resolveVisionEntries(params: {
  speciesTraits?: { name?: string | null; description?: string | null }[] | null
  aggregatedVision: CharacterVisionEntry[]
}): CharacterVisionEntry[] {
  const resolved = new Map<string, CharacterVisionEntry>()

  for (const entry of params.aggregatedVision) {
    const key = entry.type.trim().toLowerCase()
    if (!key) continue
    const existing = resolved.get(key)
    if (!existing || entry.rangeFeet > existing.rangeFeet) {
      resolved.set(key, { type: entry.type, rangeFeet: entry.rangeFeet })
    }
  }

  const darkvisionTrait = (params.speciesTraits ?? []).find((t) =>
    (t.name ?? "").toLowerCase().includes("darkvision"),
  )
  const speciesDarkvisionFeet = parseInt(darkvisionTrait?.description?.match(/(\d+)/)?.[1] ?? "0", 10)
  if (speciesDarkvisionFeet > 0) {
    const existing = resolved.get("darkvision")
    if (!existing || speciesDarkvisionFeet > existing.rangeFeet) {
      resolved.set("darkvision", { type: "Darkvision", rangeFeet: speciesDarkvisionFeet })
    }
  }

  return [...resolved.values()]
    .filter((entry) => entry.rangeFeet > 0)
    .sort((a, b) => b.rangeFeet - a.rangeFeet)
}
