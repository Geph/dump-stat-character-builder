import {
  accrueResource,
  effectiveAccumulatedValue,
  spendAccumulatedResource,
  tickAccumulatedResources,
} from "@/lib/character/real-time-recharge"
import type { AccumulatedResourceState } from "@/lib/character/sheet-play-state"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import type { ClassResource } from "@/lib/types"

export const BALANCE_OF_POWER_KEY = "balance_of_power"
export const BALANCE_OF_POWER_DECAY_MINUTES = 1

/** Cap = Psion class level (pool max from Balance of Power). */
export function balanceOfPowerCap(psionLevel: number): number {
  return Math.max(0, Math.floor(psionLevel))
}

export function characterHasBalanceOfPowerMechanic(params: {
  classDetails: CharacterClassDetail[]
  classResources?: ClassResource[]
}): boolean {
  if (
    (params.classResources ?? []).some(
      (resource) => resource.id === BALANCE_OF_POWER_KEY || /balance of power/i.test(resource.name),
    )
  ) {
    return true
  }
  for (const entry of params.classDetails) {
    const features = [
      ...((entry.class?.features ?? []) as { name?: string }[]),
      ...((entry.subclass?.features ?? []) as { name?: string }[]),
    ]
    if (features.some((feature) => /^balance of power$/i.test(feature.name ?? ""))) {
      return true
    }
  }
  return false
}

export function psionLevelForBalanceOfPower(classDetails: CharacterClassDetail[]): number {
  for (const entry of classDetails) {
    if (/psion/i.test(entry.class?.name ?? "")) {
      return entry.row.level ?? 1
    }
  }
  return 0
}

export function currentBalanceOfPower(
  accumulated: Record<string, AccumulatedResourceState>,
  now?: Date,
): number {
  return effectiveAccumulatedValue(accumulated[BALANCE_OF_POWER_KEY], now)
}

export function bankBalanceOfPower(params: {
  accumulated: Record<string, AccumulatedResourceState>
  amount: number
  max: number
  now?: Date
}): Record<string, AccumulatedResourceState> {
  if (params.amount <= 0 || params.max <= 0) {
    return tickAccumulatedResources(params.accumulated, params.now)
  }
  const ticked = tickAccumulatedResources(params.accumulated, params.now)
  return accrueResource({
    accumulated: ticked,
    resourceKey: BALANCE_OF_POWER_KEY,
    amount: params.amount,
    max: params.max,
    decayMinutes: BALANCE_OF_POWER_DECAY_MINUTES,
    now: params.now,
  })
}

export function spendBalanceOfPower(params: {
  accumulated: Record<string, AccumulatedResourceState>
  amount?: number
  now?: Date
}): {
  accumulated: Record<string, AccumulatedResourceState>
  spent: number
} {
  const now = params.now ?? new Date()
  const current = currentBalanceOfPower(params.accumulated, now)
  const amount = params.amount == null ? current : Math.min(current, params.amount)
  if (amount <= 0) {
    return { accumulated: tickAccumulatedResources(params.accumulated, now), spent: 0 }
  }
  return spendAccumulatedResource({
    accumulated: params.accumulated,
    resourceKey: BALANCE_OF_POWER_KEY,
    amount,
    now,
  })
}
