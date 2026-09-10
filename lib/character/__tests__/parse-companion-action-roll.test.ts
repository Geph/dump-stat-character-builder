import { describe, expect, it } from "vitest"
import {
  extractCompanionDamageFormula,
  parseCompanionActionRoll,
} from "@/lib/character/parse-companion-action-roll"

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

  it("parses parenthetical average damage on SRD-style attacks", () => {
    const roll = parseCompanionActionRoll(
      "Shortsword",
      "Melee Attack Roll: +5, reach 5 ft. Hit: 6 (1d6 + 3) Piercing damage.",
      5,
    )
    expect(roll?.attackBonus).toBe(5)
    expect(roll?.damageFormula).toBe("1d6+3")
  })
})

describe("extractCompanionDamageFormula", () => {
  it("finds dice on non-attack traits", () => {
    expect(
      extractCompanionDamageFormula("When a creature starts its turn here, it takes 2d6 Necrotic damage."),
    ).toBe("2d6")
  })
})
