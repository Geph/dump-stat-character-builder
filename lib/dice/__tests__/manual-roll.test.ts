import { describe, expect, it } from "vitest"
import {
  clampManualDiceCount,
  clampManualModifier,
  formatManualRollExpression,
  formatManualRollSummary,
  rollManualDice,
} from "@/lib/dice/manual-roll"

describe("manual-roll", () => {
  it("formats expressions with optional modifiers", () => {
    expect(formatManualRollExpression({ count: 2, sides: 6, modifier: 0, mode: "normal" })).toBe(
      "2d6",
    )
    expect(formatManualRollExpression({ count: 1, sides: 20, modifier: 5, mode: "normal" })).toBe(
      "1d20+5",
    )
    expect(formatManualRollExpression({ count: 1, sides: 8, modifier: -2, mode: "normal" })).toBe(
      "1d8-2",
    )
  })

  it("clamps count and modifier", () => {
    expect(clampManualDiceCount(0)).toBe(1)
    expect(clampManualDiceCount(100)).toBe(40)
    expect(clampManualModifier(-2000)).toBe(-999)
    expect(clampManualModifier(12.7)).toBe(12)
  })

  it("rolls within expected bounds", () => {
    const result = rollManualDice({ count: 2, sides: 6, modifier: 3, mode: "normal" })
    expect(result.rolls).toHaveLength(2)
    expect(result.rolls.every((n) => n >= 1 && n <= 6)).toBe(true)
    expect(result.total).toBe(result.rolls[0]! + result.rolls[1]! + 3)
    expect(result.expression).toBe("2d6+3")
    expect(result.summary).toBe(
      formatManualRollSummary(result.rolls, result.modifier, result.total, "normal"),
    )
  })
})
