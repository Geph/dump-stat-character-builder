import type { RealTimeRechargeRule, RechargeRule } from "@/lib/types"
import type { AccumulatedResourceState } from "@/lib/character/sheet-play-state"

export type RealTimeCooldownEntry =
  | { kind: "until"; expiresAt: string }
  | { kind: "calendar_day"; calendarDay: string }

export type RealTimeCooldownState = Record<
  string,
  RealTimeCooldownEntry | Record<string, RealTimeCooldownEntry>
>

export function isRealTimeRechargeRule(rule: RechargeRule): rule is RealTimeRechargeRule {
  return rule.kind === "real_time"
}

export function isRestRechargeRule(
  rule: RechargeRule,
): rule is Extract<RechargeRule, { rest: string }> {
  return rule.kind !== "real_time"
}

/** Local calendar day key (YYYY-MM-DD) for once-per-day cooldowns. */
export function calendarDayKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

export function formatRealTimeRechargeRule(rule: RealTimeRechargeRule): string {
  if (rule.mode === "decay") {
    return `decays after ${rule.minutes} min`
  }
  if (rule.period === "calendar_day") {
    return "once per day"
  }
  if (rule.scope === "per_target") {
    return `${rule.minutes} min per target`
  }
  return `${rule.minutes} min cooldown`
}

function cooldownBucket(
  state: RealTimeCooldownState,
  featureKey: string,
  scope: RealTimeRechargeRule["scope"],
): RealTimeCooldownEntry | Record<string, RealTimeCooldownEntry> | undefined {
  return state[featureKey]
}

function setCooldownBucket(
  state: RealTimeCooldownState,
  featureKey: string,
  scope: RealTimeRechargeRule["scope"],
  entry: RealTimeCooldownEntry | Record<string, RealTimeCooldownEntry>,
): RealTimeCooldownState {
  return { ...state, [featureKey]: entry }
}

/** Whether a real-time cooldown allows use right now. */
export function canUseRealTimeCooldown(params: {
  state: RealTimeCooldownState
  featureKey: string
  rule: RealTimeRechargeRule
  targetId?: string | null
  now?: Date
}): boolean {
  const now = params.now ?? new Date()
  const bucket = cooldownBucket(params.state, params.featureKey, params.rule.scope)
  if (!bucket) return true

  if (params.rule.scope === "per_target") {
    if (!params.targetId) return true
    const perTarget = bucket as Record<string, RealTimeCooldownEntry>
    const entry = perTarget[params.targetId]
    if (!entry) return true
    return !isCooldownEntryActive(entry, now)
  }

  const entry = bucket as RealTimeCooldownEntry
  return !isCooldownEntryActive(entry, now)
}

function isCooldownEntryActive(entry: RealTimeCooldownEntry, now: Date): boolean {
  if (entry.kind === "calendar_day") {
    return entry.calendarDay === calendarDayKey(now)
  }
  return new Date(entry.expiresAt).getTime() > now.getTime()
}

/** Record a real-time cooldown after use. */
export function recordRealTimeCooldown(params: {
  state: RealTimeCooldownState
  featureKey: string
  rule: RealTimeRechargeRule
  targetId?: string | null
  now?: Date
}): RealTimeCooldownState {
  const now = params.now ?? new Date()
  const { featureKey, rule } = params

  if (rule.mode === "decay") {
    return params.state
  }

  let entry: RealTimeCooldownEntry
  if (rule.period === "calendar_day") {
    entry = { kind: "calendar_day", calendarDay: calendarDayKey(now) }
  } else {
    entry = { kind: "until", expiresAt: addMinutes(now, rule.minutes).toISOString() }
  }

  if (rule.scope === "per_target") {
    const targetId = params.targetId?.trim()
    if (!targetId) return params.state
    const existing = (params.state[featureKey] as Record<string, RealTimeCooldownEntry>) ?? {}
    return setCooldownBucket(params.state, featureKey, rule.scope, {
      ...existing,
      [targetId]: entry,
    })
  }

  return setCooldownBucket(params.state, featureKey, rule.scope, entry)
}

/** Effective accumulated value after applying decay expiry. */
export function effectiveAccumulatedValue(
  entry: AccumulatedResourceState | undefined,
  now: Date = new Date(),
): number {
  if (!entry) return 0
  if (entry.expiresAt && new Date(entry.expiresAt).getTime() <= now.getTime()) {
    return 0
  }
  return Math.max(0, entry.value)
}

/** Apply decay rules — zero expired accumulated resources. */
export function tickAccumulatedResources(
  accumulated: Record<string, AccumulatedResourceState>,
  now: Date = new Date(),
): Record<string, AccumulatedResourceState> {
  const next: Record<string, AccumulatedResourceState> = {}
  for (const [key, entry] of Object.entries(accumulated)) {
    const value = effectiveAccumulatedValue(entry, now)
    if (value <= 0) continue
    next[key] = {
      value,
      expiresAt: entry.expiresAt,
    }
  }
  return next
}

/** Add to an accumulated resource and refresh decay window. */
export function accrueResource(params: {
  accumulated: Record<string, AccumulatedResourceState>
  resourceKey: string
  amount: number
  max: number
  decayMinutes: number
  now?: Date
}): Record<string, AccumulatedResourceState> {
  const now = params.now ?? new Date()
  const current = effectiveAccumulatedValue(params.accumulated[params.resourceKey], now)
  const nextValue = Math.min(params.max, current + params.amount)
  if (nextValue <= 0) return params.accumulated

  const expiresAt = addMinutes(now, params.decayMinutes).toISOString()
  return {
    ...params.accumulated,
    [params.resourceKey]: { value: nextValue, expiresAt },
  }
}

/** Spend from an accumulated resource (does not extend decay unless value remains). */
export function spendAccumulatedResource(params: {
  accumulated: Record<string, AccumulatedResourceState>
  resourceKey: string
  amount: number
  now?: Date
}): { accumulated: Record<string, AccumulatedResourceState>; spent: number } {
  const now = params.now ?? new Date()
  const current = effectiveAccumulatedValue(params.accumulated[params.resourceKey], now)
  const spent = Math.min(current, params.amount)
  const remaining = current - spent
  const entry = params.accumulated[params.resourceKey]

  if (remaining <= 0) {
    const next = { ...params.accumulated }
    delete next[params.resourceKey]
    return { accumulated: next, spent }
  }

  return {
    accumulated: {
      ...params.accumulated,
      [params.resourceKey]: {
        value: remaining,
        expiresAt: entry?.expiresAt ?? null,
      },
    },
    spent,
  }
}

/** Start or refresh decay on an accumulated value (Climactic Moment refresh). */
export function refreshAccumulatedDecay(params: {
  accumulated: Record<string, AccumulatedResourceState>
  resourceKey: string
  decayMinutes: number
  now?: Date
}): Record<string, AccumulatedResourceState> {
  const now = params.now ?? new Date()
  const entry = params.accumulated[params.resourceKey]
  const value = effectiveAccumulatedValue(entry, now)
  if (value <= 0) return params.accumulated
  return {
    ...params.accumulated,
    [params.resourceKey]: {
      value,
      expiresAt: addMinutes(now, params.decayMinutes).toISOString(),
    },
  }
}
