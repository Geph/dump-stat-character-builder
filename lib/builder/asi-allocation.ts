import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import type { Feat } from "@/lib/types"
import { BACKGROUND_ASI_KEY } from "@/lib/builder/background-asi"
export const ASI_POINTS_PER_PICK = 2

/** Combined allocation for all milestone Ability Score Improvement feats. */
export const COMBINED_MILESTONE_ASI_KEY = "milestone_asi"

const FEAT_SLOT_ASI_PREFIX = "feat_slot_"

export type AsiAllocation = Partial<Record<AbilityScoreKey, number>>
export type AsiAllocationsByFeatId = Record<string, AsiAllocation>

const ABILITY_KEYS: AbilityScoreKey[] = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
]

export function featSlotAsiKey(slotIndex: number): string {
  return `${FEAT_SLOT_ASI_PREFIX}${slotIndex}`
}

export function isAsiFeat(feat: Feat | null | undefined): boolean {
  if (!feat) return false
  return /ability score improvement/i.test(feat.name)
}

export function countMilestoneAsiFeats(selectedFeatIds: string[], feats: Feat[]): number {
  return selectedFeatIds.filter((featId) => {
    if (!featId) return false
    const feat = feats.find((f) => f.id === featId)
    return isAsiFeat(feat)
  }).length
}

export function milestoneAsiPointTotal(asiFeatCount: number): number {
  return asiFeatCount * ASI_POINTS_PER_PICK
}

export function getAsiPointsUsed(allocation: AsiAllocation): number {
  return ABILITY_KEYS.reduce((sum, key) => sum + (allocation[key] ?? 0), 0)
}

export function getAsiAllocatorHelpText(totalPoints: number, pickCount: number): string {
  if (pickCount <= 0 || totalPoints <= 0) return ""
  if (totalPoints === ASI_POINTS_PER_PICK) {
    return "+2 to one ability, or +1 to two abilities"
  }
  const maxSingle = totalPoints
  const maxSpread = totalPoints / ASI_POINTS_PER_PICK
  return `+${maxSingle} to one ability, or +1 to up to ${maxSpread} abilities, or any mix totaling ${totalPoints} points`
}

export function isValidAsiAllocation(
  allocation: AsiAllocation,
  totalPoints: number = ASI_POINTS_PER_PICK,
): boolean {
  if (totalPoints <= 0) return true
  if (getAsiPointsUsed(allocation) !== totalPoints) return false
  return ABILITY_KEYS.every((key) => {
    const value = allocation[key] ?? 0
    return Number.isInteger(value) && value >= 0 && value <= totalPoints
  })
}

export function adjustAsiPoint(
  allocation: AsiAllocation,
  ability: AbilityScoreKey,
  delta: 1 | -1,
  maxPerAbility: number = ASI_POINTS_PER_PICK,
): AsiAllocation {
  const current = allocation[ability] ?? 0
  const nextValue = current + delta
  if (nextValue < 0 || nextValue > maxPerAbility) return allocation

  const next: AsiAllocation = { ...allocation }
  if (nextValue === 0) {
    delete next[ability]
  } else {
    next[ability] = nextValue
  }
  return next
}

function mergeAllocationsInto(target: AsiAllocation, source: AsiAllocation): void {
  for (const key of ABILITY_KEYS) {
    const bonus = source[key] ?? 0
    if (bonus > 0) {
      target[key] = (target[key] ?? 0) + bonus
    }
  }
}

/** Reads combined milestone ASI, merging legacy per-slot allocations when needed. */
export function getCombinedMilestoneAsiAllocation(
  allocations: AsiAllocationsByFeatId,
  selectedFeatIds: string[],
  feats: Feat[],
): AsiAllocation {
  const combined = allocations[COMBINED_MILESTONE_ASI_KEY]
  if (combined && getAsiPointsUsed(combined) > 0) {
    return { ...combined }
  }

  const merged: AsiAllocation = {}
  if (combined) mergeAllocationsInto(merged, combined)

  selectedFeatIds.forEach((featId, slotIndex) => {
    if (!featId) return
    const feat = feats.find((f) => f.id === featId)
    if (!isAsiFeat(feat)) return

    const slotKey = featSlotAsiKey(slotIndex)
    const slotAlloc = allocations[slotKey]
    if (slotAlloc) {
      mergeAllocationsInto(merged, slotAlloc)
      return
    }
    const legacyFeatAlloc = allocations[featId]
    if (legacyFeatAlloc) mergeAllocationsInto(merged, legacyFeatAlloc)
  })

  return merged
}

export function withCombinedMilestoneAsiAllocation(
  allocations: AsiAllocationsByFeatId,
  allocation: AsiAllocation,
): AsiAllocationsByFeatId {
  const next: AsiAllocationsByFeatId = { ...allocations, [COMBINED_MILESTONE_ASI_KEY]: allocation }
  for (const key of Object.keys(next)) {
    if (key.startsWith(FEAT_SLOT_ASI_PREFIX)) delete next[key]
  }
  return next
}

export function trimAsiAllocation(allocation: AsiAllocation, totalPoints: number): AsiAllocation {
  if (totalPoints <= 0) return {}
  let remaining = getAsiPointsUsed(allocation) - totalPoints
  if (remaining <= 0) return { ...allocation }

  const trimmed: AsiAllocation = { ...allocation }
  while (remaining > 0) {
    const key = ABILITY_KEYS.reduce<AbilityScoreKey | null>((best, ability) => {
      const value = trimmed[ability] ?? 0
      if (value <= 0) return best
      if (!best || value > (trimmed[best] ?? 0)) return ability
      return best
    }, null)
    if (!key) break
    const value = trimmed[key] ?? 0
    const remove = Math.min(value, remaining)
    const nextValue = value - remove
    if (nextValue === 0) delete trimmed[key]
    else trimmed[key] = nextValue
    remaining -= remove
  }
  return trimmed
}

const REF_KEY_MARKER = "::ref::"
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

/**
 * Ability-score pool allocations are keyed by the granting source, e.g.
 * `feat:{classId}:Ability Score Improvement::ref::{cat}::{mod}`. When a class,
 * feat, or species is removed/changed, its old allocation can linger in
 * `asi_allocations` and inflate scores. An allocation is considered orphaned
 * when its key embeds source ID(s), none of which belong to the character's
 * current sources.
 */
function isOrphanedPoolAllocation(key: string, validSourceIds: ReadonlySet<string>): boolean {
  const markerIndex = key.indexOf(REF_KEY_MARKER)
  if (markerIndex === -1) return false
  const prefix = key.slice(0, markerIndex)
  const embeddedIds = prefix.match(UUID_PATTERN)
  if (!embeddedIds || embeddedIds.length === 0) return false
  return !embeddedIds.some((id) => validSourceIds.has(id.toLowerCase()))
}

export function aggregateAsiBonuses(
  allocations: AsiAllocationsByFeatId,
  validSourceIds?: ReadonlySet<string>,
): AsiAllocation {
  const totals: AsiAllocation = {}
  const combined = allocations[COMBINED_MILESTONE_ASI_KEY]
  const useCombined = Boolean(combined && getAsiPointsUsed(combined) > 0)
  const sourceIds = validSourceIds
    ? new Set(Array.from(validSourceIds, (id) => id.toLowerCase()))
    : null

  for (const [key, allocation] of Object.entries(allocations)) {
    if (key === BACKGROUND_ASI_KEY) continue
    if (key.startsWith(FEAT_SLOT_ASI_PREFIX)) {
      if (!useCombined) mergeAllocationsInto(totals, allocation)
      continue
    }
    if (key === COMBINED_MILESTONE_ASI_KEY) {
      if (useCombined) mergeAllocationsInto(totals, allocation)
      continue
    }
    if (sourceIds && isOrphanedPoolAllocation(key, sourceIds)) continue
    mergeAllocationsInto(totals, allocation)
  }

  return totals
}

export function allSelectedAsiAllocationsValid(
  selectedFeatIds: string[],
  allocations: AsiAllocationsByFeatId,
  feats: Feat[],
): boolean {
  const asiCount = countMilestoneAsiFeats(selectedFeatIds, feats)
  if (asiCount === 0) return true
  const totalPoints = milestoneAsiPointTotal(asiCount)
  const allocation = getCombinedMilestoneAsiAllocation(allocations, selectedFeatIds, feats)
  return isValidAsiAllocation(allocation, totalPoints)
}
