import type { Species, Trait } from "@/lib/types"

/** Stable key for a species trait choice (prefer name; fall back to index). */
export function speciesTraitPickKey(trait: Pick<Trait, "name">, index: number): string {
  const name = trait.name?.trim() ?? ""
  return name || String(index)
}

/** Read picks for a trait, accepting legacy index keys or name keys. */
export function resolveSpeciesTraitPicks(
  picks: Record<string, string[]>,
  trait: Pick<Trait, "name">,
  index: number,
): string[] {
  const name = trait.name?.trim() ?? ""
  if (name) {
    const byName = picks[name]
    if (Array.isArray(byName) && byName.length) return byName
  }
  const byIndex = picks[String(index)]
  return Array.isArray(byIndex) ? byIndex : []
}

/**
 * Rewrite index-keyed species trait picks to trait-name keys so reordering traits
 * (or enrichment inserting rows) does not blank Elven Lineage etc. on edit.
 */
export function normalizeSpeciesTraitPicksForSpecies(
  picks: Record<string, string[]>,
  species: Species | null | undefined,
): Record<string, string[]> {
  if (!picks || typeof picks !== "object") return {}
  if (!species?.traits?.length) return { ...picks }

  const next: Record<string, string[]> = {}
  const claimedIndexes = new Set<string>()

  for (const [index, trait] of species.traits.entries()) {
    const key = speciesTraitPickKey(trait, index)
    const resolved = resolveSpeciesTraitPicks(picks, trait, index)
    if (resolved.length) {
      next[key] = resolved
      claimedIndexes.add(String(index))
      if (trait.name?.trim()) claimedIndexes.add(trait.name.trim())
    }
  }

  for (const [key, value] of Object.entries(picks)) {
    if (!Array.isArray(value) || !value.length) continue
    if (claimedIndexes.has(key)) continue
    if (key in next) continue
    next[key] = value
  }

  return next
}
