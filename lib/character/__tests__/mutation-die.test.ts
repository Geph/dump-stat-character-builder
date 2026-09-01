import { describe, expect, it } from "vitest"
import {
  createMutationDieGrant,
  normalizeAllyBenefitCounts,
  normalizeMutationDieGrant,
  shouldResetFleshWarpOnLongRest,
  spendMutationDie,
  stepMutationDie,
} from "@/lib/character/mutation-die"

describe("mutation die", () => {
  it("creates a spendable d4 grant", () => {
    const grant = createMutationDieGrant({ targetLabel: "Ally A", autoApplyStrength: true })
    expect(grant).toMatchObject({
      sides: 4,
      remaining: 1,
      autoApplyStrength: true,
      targetLabel: "Ally A",
      clearHint: "start_of_caster_next_turn",
    })
  })

  it("steps Perfected growth and clamps at d12", () => {
    let grant = createMutationDieGrant()
    grant = stepMutationDie(grant, 1)
    expect(grant.sides).toBe(6)
    grant = stepMutationDie({ ...grant, sides: 12 }, 1)
    expect(grant.sides).toBe(12)
  })

  it("spends the die without clearing Muscular auto-apply", () => {
    const spent = spendMutationDie(
      createMutationDieGrant({ autoApplyStrength: true }),
    )
    expect(spent.remaining).toBe(0)
    expect(spent.autoApplyStrength).toBe(true)
  })

  it("normalizes persisted grants and ally counts", () => {
    expect(normalizeMutationDieGrant({ sides: 8, remaining: 3, targetLabel: "Bob" })).toEqual({
      sides: 8,
      remaining: 1,
      autoApplyStrength: false,
      targetLabel: "Bob",
      clearHint: "start_of_caster_next_turn",
    })
    expect(normalizeMutationDieGrant(null)).toBeNull()
    expect(normalizeAllyBenefitCounts({ Alice: 2, "": 1, bad: 1.5 as unknown as number })).toEqual({
      Alice: 2,
    })
  })

  it("does not reset Flesh Warp play-state on long rest unless the sheet uses it", () => {
    expect(shouldResetFleshWarpOnLongRest({})).toBe(false)
    expect(
      shouldResetFleshWarpOnLongRest({
        mutationDie: null,
        allyBenefitCounts: {},
      }),
    ).toBe(false)
    expect(shouldResetFleshWarpOnLongRest({ hasFleshWarpAction: true })).toBe(true)
    expect(
      shouldResetFleshWarpOnLongRest({
        mutationDie: createMutationDieGrant(),
      }),
    ).toBe(true)
    expect(
      shouldResetFleshWarpOnLongRest({
        allyBenefitCounts: { Ally: 1 },
      }),
    ).toBe(true)
  })
})
