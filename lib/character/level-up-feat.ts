import { featChoicePickKey } from "@/lib/builder/feat-choices"
import { featureChoiceKey } from "@/lib/builder/choices"
import type { AsiAllocationsByFeatId } from "@/lib/builder/asi-allocation"

export function normalizeAsiAllocationsMap(value: unknown): AsiAllocationsByFeatId {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as AsiAllocationsByFeatId
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as AsiAllocationsByFeatId
      }
    } catch {
      return {}
    }
  }
  return {}
}

/** Class-feature names that stand in for a General / ASI milestone slot. */
function milestoneFeatFeatureName(featureName: string, level: number): string {
  if (/ability score improvement|feat or asi|^asi$|^feat$/i.test(featureName.trim())) {
    return level === 19 ? "Epic Boon" : "Ability Score Improvement"
  }
  return featureName
}

/** Same key the builder uses for a class ASI / feat milestone slot. */
export function levelUpFeatSlotKey(classId: string, featureName: string, level: number): string {
  return featureChoiceKey(classId, milestoneFeatFeatureName(featureName, level), level)
}

export function levelUpFeatAllocationPrefix(slotKey: string): string {
  return featChoicePickKey(slotKey)
}

export function mergeLevelUpFeatPersist(params: {
  featId: string
  slotKey: string
  pendingAllocations: AsiAllocationsByFeatId
  existingFeatIds: string[]
  existingPicks: Record<string, string[]>
    existingAllocations: unknown
}): {
  featIds: string[]
  featureChoicePicks: Record<string, string[]>
  asiAllocations: AsiAllocationsByFeatId
} {
  return {
    featIds: [...new Set([...params.existingFeatIds, params.featId])],
    featureChoicePicks: {
      ...params.existingPicks,
      [params.slotKey]: [params.featId],
    },
    asiAllocations: {
      ...normalizeAsiAllocationsMap(params.existingAllocations),
      ...params.pendingAllocations,
    },
  }
}
