import { resolveClassResourcesForClass } from "@/lib/compendium/resolve-class-resources"
import { resolveTierCountAtLevel, resolveUsesAtLevel } from "@/lib/compendium/resolve-uses-config"
import type { CharacterBuildInputs } from "@/lib/character/types"
import type { ClassResource, ClassResourceRow } from "@/lib/types"

function countForResource(resource: ClassResource, classLevel: number): number {
  const uses = resource.uses
  if (!uses) return 0
  if (uses.type === "fixed") return uses.fixedAmount ?? 0
  if (uses.type === "special" || uses.type === "at_level") {
    if (uses.atLevelTable?.length) {
      if (uses.atLevelMode === "multiply_level") {
        return resolveUsesAtLevel(uses, classLevel) ?? 0
      }
      return resolveTierCountAtLevel(uses.atLevelTable, classLevel) ?? 0
    }
  }
  if (uses.atLevelTable?.length) {
    return resolveTierCountAtLevel(uses.atLevelTable, classLevel) ?? 0
  }
  return 0
}

/** Current Class Cap / pool size per resource_key for the character's class levels. */
export function resolveClassResourceCounts(inputs: {
  classLevels: CharacterBuildInputs["classLevels"]
  classes: CharacterBuildInputs["classes"]
  classResourceRows?: ClassResourceRow[]
}): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const entry of inputs.classLevels) {
    const cls = inputs.classes.find((row) => row.id === entry.classId)
    if (!cls) continue
    const resources = resolveClassResourcesForClass(cls, inputs.classResourceRows)
    for (const resource of resources) {
      const key = resource.id?.trim()
      if (!key) continue
      const next = countForResource(resource, entry.level)
      counts[key] = Math.max(counts[key] ?? 0, next)
    }
  }
  return counts
}

export function resolveClassResourceScaledBonus(
  rawCount: number,
  scale: "full" | "half_ceil" | null | undefined,
): number {
  if (!Number.isFinite(rawCount) || rawCount <= 0) return 0
  if (scale === "half_ceil") return Math.ceil(rawCount / 2)
  return rawCount
}
