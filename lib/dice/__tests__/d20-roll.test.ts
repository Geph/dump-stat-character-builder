import { describe, expect, it } from "vitest"
import { combineRollModes, rollD20WithMode } from "@/lib/dice/d20-roll"

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
