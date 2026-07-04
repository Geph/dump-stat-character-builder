import { describe, expect, it } from "vitest"
import { parseCompanionActionRoll } from "@/lib/character/parse-companion-action-roll"

describe("parseCompanionActionRoll", () => {
  it("parses spell attack modifier attacks", () => {
    const roll = parseCompanionActionRoll(
      "Rend",
      "Melee Attack Roll: Bonus equals your spell attack modifier, reach 5 ft. Hit: 1d8 + 4 plus your Charisma modifier Force damage.",
      7,
    )
    expect(roll).toEqual({
      actionName: "Rend",
      attackBonus: 7,
      damageFormula: "1d8+4",
      reachOrRange: "5 ft",
      usesSpellAttackModifier: true,
    })
  })

  it("parses fixed attack bonus", () => {
    const roll = parseCompanionActionRoll(
      "Claw",
      "Melee Attack Roll: +5, reach 5 ft. Hit: 2d6 + 3 slashing damage.",
      null,
    )
    expect(roll?.attackBonus).toBe(5)
    expect(roll?.damageFormula).toBe("2d6+3")
  })

  it("returns null for non-attack actions", () => {
    expect(parseCompanionActionRoll("Help", "The companion takes the Help action.", 5)).toBeNull()
  })
})
