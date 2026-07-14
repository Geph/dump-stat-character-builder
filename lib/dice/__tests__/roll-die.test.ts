import { describe, expect, it, vi } from "vitest"
import { rollDice, rollDie } from "@/lib/dice/roll-die"

describe("rollDie", () => {
  it("stays within [1, sides]", () => {
    for (let i = 0; i < 50; i++) {
      const result = rollDie(8)
      expect(result).toBeGreaterThanOrEqual(1)
      expect(result).toBeLessThanOrEqual(8)
    }
  })

  it("uses Math.random to pick the face", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.99)
    expect(rollDie(10)).toBe(10)
    spy.mockReturnValue(0)
    expect(rollDie(10)).toBe(1)
    spy.mockRestore()
  })
})

describe("rollDice", () => {
  it("sums multiple dice", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0)
    expect(rollDice(3, 6)).toBe(3)
    spy.mockRestore()
  })
})
