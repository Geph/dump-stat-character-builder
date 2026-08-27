import { describe, expect, it } from "vitest"
import { combineRollModes, formatD20RollSummary, rollD20WithMode } from "@/lib/dice/d20-roll"

describe("combineRollModes", () => {
  it("cancels advantage and disadvantage to normal", () => {
    expect(combineRollModes(["advantage", "disadvantage"])).toBe("normal")
  })

  it("auto_fail wins over other modes", () => {
    expect(combineRollModes(["advantage", "auto_fail"])).toBe("auto_fail")
  })
})

describe("rollD20WithMode", () => {
  it("rolls a single die in normal mode", () => {
    const result = rollD20WithMode("normal", 3)
    expect(result.naturals).toHaveLength(1)
    expect(result.total).toBe(result.natural + 3)
  })
})

describe("formatD20RollSummary", () => {
  it("shows both faces and marks the unused die on advantage", () => {
    expect(
      formatD20RollSummary(
        { natural: 17, total: 21, naturals: [12, 17], mode: "advantage" },
        4,
      ),
    ).toBe("(12) / 17 + 4 = 21 (adv)")
  })

  it("marks the unused die on disadvantage", () => {
    expect(
      formatD20RollSummary(
        { natural: 3, total: 2, naturals: [3, 14], mode: "disadvantage" },
        -1,
      ),
    ).toBe("3 / (14) − 1 = 2 (dis)")
  })
})
