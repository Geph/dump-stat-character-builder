import { describe, expect, it } from "vitest"
import type { TurnStartTriggerEntry } from "@/lib/character/collect-turn-start-triggers"
import {
  characterHasInfluencePointsMechanic,
  INFLUENCE_POINTS_KEY,
} from "@/lib/character/influence-points"

function triggerEntry(
  accrueResourceKey: string | null | undefined,
): TurnStartTriggerEntry {
  return {
    id: "test",
    name: "Test",
    classId: "class-1",
    classLevel: 3,
    trigger: {
      id: "mod_test",
      type: "turn_start_trigger",
      accrueResourceKey,
      accrueResourceAmount: 1,
      accrueResourceMaxAbility: "INT",
      accrueDecayMinutes: 1,
    },
  }
}

describe("characterHasInfluencePointsMechanic", () => {
  it("returns true when a turn-start trigger accrues influence points", () => {
    expect(
      characterHasInfluencePointsMechanic([triggerEntry(INFLUENCE_POINTS_KEY)]),
    ).toBe(true)
  })

  it("returns false for characters without influence accrual triggers", () => {
    expect(characterHasInfluencePointsMechanic([])).toBe(false)
    expect(characterHasInfluencePointsMechanic([triggerEntry("ki_points")])).toBe(false)
  })
})
