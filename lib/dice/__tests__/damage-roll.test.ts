import { describe, expect, it } from "vitest"
import { formatDamageRollResult, parseDamageRoll, rollDamage } from "@/lib/dice/damage-roll"
import { swapDamageDice } from "@/lib/compendium/weapon-damage-roll"

describe("parseDamageRoll", () => {
  it("parses dice plus a signed modifier and damage type", () => {
    expect(parseDamageRoll("1d8 + 3 Slashing")).toEqual({
      dice: [{ count: 1, sides: 8 }],
      modifier: 3,
      flat: 0,
    })
    expect(parseDamageRoll("2d6 - 1")).toEqual({
      dice: [{ count: 2, sides: 6 }],
      modifier: -1,
      flat: 0,
    })
  })

  it("parses flat unarmed damage including a lone 1", () => {
    expect(parseDamageRoll("1")).toEqual({ dice: [], modifier: 0, flat: 1 })
    expect(parseDamageRoll("1 + 3 Bludgeoning")).toEqual({
      dice: [],
      modifier: 3,
      flat: 1,
    })
    expect(parseDamageRoll("1 - 1 Bludgeoning")).toEqual({
      dice: [],
      modifier: -1,
      flat: 1,
    })
  })

  it("returns null for empty or non-numeric text", () => {
    expect(parseDamageRoll("")).toBeNull()
    expect(parseDamageRoll("Bludgeoning")).toBeNull()
  })
})

describe("rollDamage / formatDamageRollResult", () => {
  it("rolls a flat 1 plus modifier without dropping the button total", () => {
    const parsed = parseDamageRoll("1 + 3 Bludgeoning")
    expect(parsed).not.toBeNull()
    const result = rollDamage(parsed!)
    expect(result.rolls).toEqual([1])
    expect(result.modifier).toBe(3)
    expect(result.total).toBe(4)
    expect(formatDamageRollResult(result.rolls, result.modifier, result.total)).toBe("1 + 3 = 4")
  })

  it("formats a lone flat 1", () => {
    const result = rollDamage({ dice: [], modifier: 0, flat: 1 })
    expect(formatDamageRollResult(result.rolls, result.modifier, result.total)).toBe("1 = 1")
  })
})

describe("swapDamageDice", () => {
  it("keeps the ability modifier when changing dice", () => {
    expect(swapDamageDice("1d8 + 3 Slashing", "1d10")).toBe("1d10 + 3 Slashing")
    expect(swapDamageDice("1 + 3 Bludgeoning", "1d4")).toBe("1d4 + 3 Bludgeoning")
    expect(swapDamageDice("1 - 1 Bludgeoning", "1")).toBe("1 - 1 Bludgeoning")
  })
})
