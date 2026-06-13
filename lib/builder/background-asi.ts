import {
  ABILITY_SCORE_KEYS,
  type AbilityScoreKey,
} from "@/lib/compendium/characteristic-modifiers"
import { normalizeBackgroundAbilityBonuses } from "@/lib/compendium/background-utils"
import {
  getAsiPointsUsed,
  type AsiAllocation,
} from "@/lib/builder/asi-allocation"
import type { Background } from "@/lib/types"

export const BACKGROUND_ASI_KEY = "background_asi"
export const BACKGROUND_ASI_TOTAL_POINTS = 3

export type BackgroundAbilityGrant = {
  fixed: AsiAllocation
  needsChoice: boolean
  eligible: AbilityScoreKey[]
}

export function getBackgroundAbilityGrant(
  background: Background | null | undefined,
): BackgroundAbilityGrant {
  const normalized = normalizeBackgroundAbilityBonuses(background?.ability_bonuses)
  const keys = Object.keys(normalized) as AbilityScoreKey[]

  if (!keys.length) {
    return { fixed: {}, needsChoice: false, eligible: [] }
  }

  const fixed: AsiAllocation = {}
  const eligible: AbilityScoreKey[] = []

  for (const key of keys) {
    const value = normalized[key] ?? 0
    if (value > 0) fixed[key] = value
    else eligible.push(key)
  }

  if (Object.keys(fixed).length) {
    return { fixed, needsChoice: false, eligible: [] }
  }

  return { fixed: {}, needsChoice: eligible.length > 0, eligible }
}

export function getBackgroundAsiHelpText(): string {
  return "+2 to one eligible score and +1 to another, or +1 to each of the three eligible scores"
}

export function isValidBackgroundAsiAllocation(
  allocation: AsiAllocation,
  eligible: AbilityScoreKey[],
): boolean {
  if (!eligible.length) return true

  const used = getAsiPointsUsed(allocation)
  if (used !== BACKGROUND_ASI_TOTAL_POINTS) return false

  for (const key of ABILITY_SCORE_KEYS) {
    const value = allocation[key] ?? 0
    if (value <= 0) continue
    if (!eligible.includes(key)) return false
    if (value > 2) return false
  }

  const twos = eligible.filter((key) => (allocation[key] ?? 0) === 2).length
  const ones = eligible.filter((key) => (allocation[key] ?? 0) === 1).length

  if (twos === 1) {
    return ones === 1 && eligible.every((key) => {
      const value = allocation[key] ?? 0
      return value === 0 || value === 1 || value === 2
    })
  }

  return eligible.length === 3 && ones === 3
}

export function aggregateBackgroundAbilityBonuses(
  background: Background | null | undefined,
  allocations: Record<string, AsiAllocation>,
): AsiAllocation {
  const grant = getBackgroundAbilityGrant(background)
  const totals: AsiAllocation = { ...grant.fixed }

  if (grant.needsChoice) {
    const choice = allocations[BACKGROUND_ASI_KEY] ?? {}
    for (const key of grant.eligible) {
      const bonus = choice[key] ?? 0
      if (bonus > 0) totals[key] = (totals[key] ?? 0) + bonus
    }
  }

  return totals
}
