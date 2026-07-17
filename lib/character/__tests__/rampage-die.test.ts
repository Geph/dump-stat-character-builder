import { describe, expect, it } from "vitest"
import {
  normalizeRampageDieSides,
  stepRampageDieSides,
} from "@/lib/character/rampage-die"

describe("Rampage Die play-state", () => {
  it("steps through d4, d6, d8, d10, and d12", () => {
    expect(stepRampageDieSides(4, 1)).toBe(6)
    expect(stepRampageDieSides(6, 1)).toBe(8)
    expect(stepRampageDieSides(8, 1)).toBe(10)
    expect(stepRampageDieSides(10, 1)).toBe(12)
  })

  it("clamps at both ends and resets invalid persisted values to d4", () => {
    expect(stepRampageDieSides(4, -1)).toBe(4)
    expect(stepRampageDieSides(12, 1)).toBe(12)
    expect(normalizeRampageDieSides(7)).toBe(4)
  })
})
