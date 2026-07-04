import { describe, expect, it } from "vitest"
import {
  applyCompanionAttackRedirect,
} from "@/lib/character/companion-redirect"
import {
  accrueResource,
  calendarDayKey,
  canUseRealTimeCooldown,
  effectiveAccumulatedValue,
  recordRealTimeCooldown,
  spendAccumulatedResource,
  tickAccumulatedResources,
} from "@/lib/character/real-time-recharge"
import type { RealTimeRechargeRule } from "@/lib/types"

describe("real-time recharge", () => {
  const hourPerTarget: RealTimeRechargeRule = {
    kind: "real_time",
    mode: "cooldown",
    minutes: 60,
    scope: "per_target",
    period: "rolling",
  }

  const oncePerDay: RealTimeRechargeRule = {
    kind: "real_time",
    mode: "cooldown",
    minutes: 0,
    period: "calendar_day",
  }

  const oneMinuteDecay: RealTimeRechargeRule = {
    kind: "real_time",
    mode: "decay",
    minutes: 1,
  }

  it("blocks per-target reuse for 1 hour", () => {
    const now = new Date("2026-06-01T12:00:00.000Z")
    const key = "shattered_husks"
    expect(
      canUseRealTimeCooldown({ state: {}, featureKey: key, rule: hourPerTarget, targetId: "goblin-1", now }),
    ).toBe(true)

    const afterUse = recordRealTimeCooldown({
      state: {},
      featureKey: key,
      rule: hourPerTarget,
      targetId: "goblin-1",
      now,
    })
    expect(
      canUseRealTimeCooldown({
        state: afterUse,
        featureKey: key,
        rule: hourPerTarget,
        targetId: "goblin-1",
        now: new Date("2026-06-01T12:30:00.000Z"),
      }),
    ).toBe(false)
    expect(
      canUseRealTimeCooldown({
        state: afterUse,
        featureKey: key,
        rule: hourPerTarget,
        targetId: "goblin-2",
        now,
      }),
    ).toBe(true)
    expect(
      canUseRealTimeCooldown({
        state: afterUse,
        featureKey: key,
        rule: hourPerTarget,
        targetId: "goblin-1",
        now: new Date("2026-06-01T13:01:00.000Z"),
      }),
    ).toBe(true)
  })

  it("allows once per calendar day only", () => {
    const morning = new Date("2026-06-01T08:00:00.000Z")
    const key = "planeswalker"
    const used = recordRealTimeCooldown({
      state: {},
      featureKey: key,
      rule: oncePerDay,
      now: morning,
    })
    expect(
      canUseRealTimeCooldown({
        state: used,
        featureKey: key,
        rule: oncePerDay,
        now: new Date("2026-06-01T20:00:00.000Z"),
      }),
    ).toBe(false)
    expect(
      canUseRealTimeCooldown({
        state: used,
        featureKey: key,
        rule: oncePerDay,
        now: new Date("2026-06-02T08:00:00.000Z"),
      }),
    ).toBe(true)
    expect(calendarDayKey(morning)).toBe("2026-06-01")
  })

  it("decays accumulated value after 1 minute", () => {
    const now = new Date("2026-06-01T12:00:00.000Z")
    let accumulated = accrueResource({
      accumulated: {},
      resourceKey: "influence_points",
      amount: 3,
      max: 4,
      decayMinutes: oneMinuteDecay.minutes,
      now,
    })
    expect(effectiveAccumulatedValue(accumulated.influence_points, now)).toBe(3)

    const later = new Date("2026-06-01T12:01:01.000Z")
    accumulated = tickAccumulatedResources(accumulated, later)
    expect(effectiveAccumulatedValue(accumulated.influence_points, later)).toBe(0)
    expect(Object.keys(accumulated)).toHaveLength(0)
  })

  it("spends accumulated resources without extending decay by default", () => {
    const now = new Date("2026-06-01T12:00:00.000Z")
    const accumulated = accrueResource({
      accumulated: {},
      resourceKey: "influence_points",
      amount: 2,
      max: 3,
      decayMinutes: 1,
      now,
    })
    const spent = spendAccumulatedResource({
      accumulated,
      resourceKey: "influence_points",
      amount: 1,
      now,
    })
    expect(spent.spent).toBe(1)
    expect(effectiveAccumulatedValue(spent.accumulated.influence_points, now)).toBe(1)
  })
})

describe("companion attack redirect", () => {
  it("absorbs damage and spills overflow to owner", () => {
    expect(
      applyCompanionAttackRedirect({ incomingDamage: 15, companionCurrentHp: 10 }),
    ).toEqual({
      damageToCompanion: 10,
      overflowToOwner: 5,
      companionHpAfter: 0,
    })
  })
})
