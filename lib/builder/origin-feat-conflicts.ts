import type { Feat } from "@/lib/types"

export type OriginFeatOwnership = {
  featId: string
  featName: string
  repeatable: boolean
  side: "species" | "background"
}

/** Collapse "Magic Initiate (Cleric)" → "magic initiate" for cross-source matching. */
export function originFeatConflictKey(name: string): string {
  return name
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .trim()
    .toLowerCase()
}

/**
 * Non-repeatable feats owned by both species and background (same id or same name).
 * Repeatable feats (e.g. Magic Initiate) may be taken from both sides.
 */
export function findDuplicateOriginFeatNames(
  speciesFeats: OriginFeatOwnership[],
  backgroundFeats: OriginFeatOwnership[],
): string[] {
  const conflicts = new Set<string>()

  for (const species of speciesFeats) {
    for (const background of backgroundFeats) {
      const sameId = species.featId === background.featId
      const sameName =
        originFeatConflictKey(species.featName) === originFeatConflictKey(background.featName)
      if (!sameId && !sameName) continue
      if (species.repeatable && background.repeatable) continue
      conflicts.add(species.featName.trim() || background.featName.trim())
    }
  }

  return [...conflicts].sort((a, b) => a.localeCompare(b))
}

export function resolveOriginFeatOwnership(
  featIds: string[],
  feats: Feat[],
  side: "species" | "background",
): OriginFeatOwnership[] {
  const owned: OriginFeatOwnership[] = []
  for (const featId of featIds) {
    if (!featId) continue
    const feat = feats.find((entry) => entry.id === featId)
    if (!feat) continue
    owned.push({
      featId: feat.id,
      featName: feat.name,
      repeatable: Boolean(feat.repeatable),
      side,
    })
  }
  return owned
}

export function collectOriginFeatDuplicateBlockers(conflictNames: string[]): string[] {
  if (!conflictNames.length) return []
  const list =
    conflictNames.length === 1
      ? conflictNames[0]
      : `${conflictNames.slice(0, -1).join(", ")} and ${conflictNames[conflictNames.length - 1]}`
  return [
    `${list} ${conflictNames.length === 1 ? "is" : "are"} granted by both your species and background. Change one pick — non-repeatable feats can only be taken once.`,
  ]
}
