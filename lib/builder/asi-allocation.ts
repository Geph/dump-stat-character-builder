import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import type { Feat } from "@/lib/types"

export const ASI_POINTS_TOTAL = 2

export type AsiAllocation = Partial<Record<AbilityScoreKey, number>>
export type AsiAllocationsByFeatId = Record<string, AsiAllocation>

export function isAsiFeat(feat: Feat | null | undefined): boolean {
  if (!feat) return false
  return /ability score improvement/i.test(feat.name)
}

export function getAsiPointsUsed(allocation: AsiAllocation): number {
  return ABILITY_KEYS.reduce((sum, key) => sum + (allocation[key] ?? 0), 0)
}

const ABILITY_KEYS: AbilityScoreKey[] = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
]

export function isValidAsiAllocation(allocation: AsiAllocation): boolean {
  if (getAsiPointsUsed(allocation) !== ASI_POINTS_TOTAL) return false
  const values = ABILITY_KEYS.map((key) => allocation[key] ?? 0).filter((v) => v > 0)
  if (values.some((v) => v !== 1 && v !== 2)) return false
  if (values.filter((v) => v === 2).length > 1) return false
  return true
}

export function adjustAsiPoint(
  allocation: AsiAllocation,
  ability: AbilityScoreKey,
  delta: 1 | -1,
): AsiAllocation {
  const current = allocation[ability] ?? 0
  const nextValue = current + delta
  if (nextValue < 0 || nextValue > 2) return allocation

  const next: AsiAllocation = { ...allocation }
  if (nextValue === 0) {
    delete next[ability]
  } else {
    next[ability] = nextValue
  }
  return next
}

export function aggregateAsiBonuses(allocations: AsiAllocationsByFeatId): AsiAllocation {
  const totals: AsiAllocation = {}
  for (const allocation of Object.values(allocations)) {
    for (const key of ABILITY_KEYS) {
      const bonus = allocation[key] ?? 0
      if (bonus > 0) {
        totals[key] = (totals[key] ?? 0) + bonus
      }
    }
  }
  return totals
}

export function allSelectedAsiAllocationsValid(
  selectedFeatIds: string[],
  allocations: AsiAllocationsByFeatId,
  feats: Feat[],
): boolean {
  for (const featId of selectedFeatIds.filter(Boolean)) {
    const feat = feats.find((f) => f.id === featId)
    if (isAsiFeat(feat) && !isValidAsiAllocation(allocations[featId] ?? {})) {
      return false
    }
  }
  return true
}
