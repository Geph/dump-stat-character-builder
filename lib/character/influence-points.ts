import type { TurnStartTriggerEntry } from "@/lib/character/collect-turn-start-triggers"
import {
  accrueResource,
  effectiveAccumulatedValue,
  spendAccumulatedResource,
  tickAccumulatedResources,
} from "@/lib/character/real-time-recharge"
import type { AccumulatedResourceState } from "@/lib/character/sheet-play-state"
import type { SheetToggleKey } from "@/lib/compendium/sheet-toggle-registry"

export const INFLUENCE_POINTS_KEY = "influence_points"
export const INFLUENCE_DECAY_MINUTES = 1
export const IN_COMBAT_TOGGLE: SheetToggleKey = "in_combat_or_high_stakes"

/**
 * Influence points (Knowing Mind / Climactic Moment) bypass Psi Limit when spent.
 * Psi Limit enforcement is not built yet — keep this carve-out when it is.
 */
export const INFLUENCE_BYPASSES_PSI_LIMIT = true

export function influenceCap(intModifier: number): number {
  return Math.max(0, intModifier)
}

/** True when a class/subclass feature accrues influence points (e.g. Knowing Mind / Climactic Moment). */
export function characterHasInfluencePointsMechanic(
  triggers: readonly TurnStartTriggerEntry[],
): boolean {
  return triggers.some((entry) => entry.trigger.accrueResourceKey === INFLUENCE_POINTS_KEY)
}

export function applyInfluenceTurnStart(params: {
  accumulated: Record<string, AccumulatedResourceState>
  intModifier: number
  activeSheetToggleIds: readonly string[]
  now?: Date
}): Record<string, AccumulatedResourceState> {
  if (!params.activeSheetToggleIds.includes(IN_COMBAT_TOGGLE)) {
    return tickAccumulatedResources(params.accumulated, params.now)
  }

  const cap = influenceCap(params.intModifier)
  if (cap <= 0) return tickAccumulatedResources(params.accumulated, params.now)

  const ticked = tickAccumulatedResources(params.accumulated, params.now)
  return accrueResource({
    accumulated: ticked,
    resourceKey: INFLUENCE_POINTS_KEY,
    amount: 1,
    max: cap,
    decayMinutes: INFLUENCE_DECAY_MINUTES,
    now: params.now,
  })
}

export function spendInfluencePoints(params: {
  accumulated: Record<string, AccumulatedResourceState>
  amount: number
  now?: Date
}): {
  accumulated: Record<string, AccumulatedResourceState>
  spent: number
} {
  return spendAccumulatedResource({
    accumulated: params.accumulated,
    resourceKey: INFLUENCE_POINTS_KEY,
    amount: params.amount,
    now: params.now,
  })
}

export function currentInfluencePoints(
  accumulated: Record<string, AccumulatedResourceState>,
  now?: Date,
): number {
  return effectiveAccumulatedValue(accumulated[INFLUENCE_POINTS_KEY], now)
}
