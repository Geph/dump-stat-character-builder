import type { CharacterClassDetail } from "@/lib/character/character-classes"
import { resolveClassResourcesForClass } from "@/lib/compendium/resolve-class-resources"
import { resolveDieSidesAtLevel } from "@/lib/compendium/resolve-uses-config"

/**
 * Resolve the current die size (e.g. 8 for "d8") of a class resource by key, for one class entry
 * on a character — e.g. Superiority Dice is d8 at level 3, d10 at 10, d12 at 18.
 * Returns null when the resource isn't found or doesn't scale as a die (a plain uses pool).
 */
export function resolveClassResourceDieSidesForClass(
  classDetail: CharacterClassDetail,
  resourceKey: string,
): number | null {
  if (!classDetail.class) return null
  const resources = resolveClassResourcesForClass(classDetail.class)
  const resource = resources.find((entry) => entry.id === resourceKey)
  if (!resource) return null
  return resolveDieSidesAtLevel(resource.uses, classDetail.row.level)
}

/** Resolve a class resource's current die size across all of a character's classes (first match wins). */
export function resolveClassResourceDieSides(
  classDetails: CharacterClassDetail[],
  resourceKey: string,
): number | null {
  for (const detail of classDetails) {
    const sides = resolveClassResourceDieSidesForClass(detail, resourceKey)
    if (sides != null) return sides
  }
  return null
}

/** Build a resourceKey -> current die sides map for every dice-scaled class resource on a character. */
export function buildClassResourceDieSidesMap(
  classDetails: CharacterClassDetail[],
): Record<string, number> {
  const map: Record<string, number> = {}
  for (const detail of classDetails) {
    if (!detail.class) continue
    const resources = resolveClassResourcesForClass(detail.class)
    for (const resource of resources) {
      const sides = resolveDieSidesAtLevel(resource.uses, detail.row.level)
      if (sides != null) map[resource.id] = sides
    }
  }
  return map
}
