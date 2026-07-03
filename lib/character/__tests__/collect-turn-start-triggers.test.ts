import { describe, expect, it } from "vitest"
import { applyTurnStartTriggers } from "@/lib/character/collect-turn-start-triggers"
import type { TurnStartTriggerEntry } from "@/lib/character/collect-turn-start-triggers"

describe("applyTurnStartTriggers", () => {
  const trigger: TurnStartTriggerEntry = {
    id: "warriors-spirit",
    name: "Warrior's Spirit",
    classId: "monk-1",
    classLevel: 5,
    trigger: {
      id: "t1",
      type: "turn_start_trigger",
      restoreResourceKey: "alternate_monk_ki_points",
      restoreResourceAmount: 1,
      blockedByConditions: ["Incapacitated"],
    },
  }

  const resourceEntries = [
    {
      id: "monk-1_alternate_monk_ki_points",
      uses: { type: "fixed" as const, fixedAmount: 5 },
      classLevel: 5,
    },
  ]

  it("restores Ki at turn start when not incapacitated", () => {
    const next = applyTurnStartTriggers({
      triggers: [trigger],
      usedResourcesById: { "monk-1_alternate_monk_ki_points": 3 },
      resourceEntries,
      resolveContext: { proficiencyBonus: 3, abilityModifiers: {} },
      currentHp: 20,
      maxHp: 30,
      activeConditions: [],
    })
    expect(next["monk-1_alternate_monk_ki_points"]).toBe(2)
  })

  it("skips when Incapacitated", () => {
    const next = applyTurnStartTriggers({
      triggers: [trigger],
      usedResourcesById: { "monk-1_alternate_monk_ki_points": 3 },
      resourceEntries,
      resolveContext: { proficiencyBonus: 3, abilityModifiers: {} },
      currentHp: 20,
      maxHp: 30,
      activeConditions: ["Incapacitated"],
    })
    expect(next["monk-1_alternate_monk_ki_points"]).toBe(3)
  })
})
