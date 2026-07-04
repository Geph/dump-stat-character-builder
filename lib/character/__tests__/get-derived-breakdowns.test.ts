import { describe, expect, it } from "vitest"
import { computeDerivedCharacter } from "@/lib/character/compute-derived"
import { getDerivedCharacterBreakdowns, breakdownLines } from "@/lib/character/get-derived-breakdowns"
import { sumContributions } from "@/lib/character/stat-contributions"
import { barbarianShieldFixture } from "@/lib/character/__tests__/fixtures"

describe("getDerivedCharacterBreakdowns", () => {
  const inputs = barbarianShieldFixture()

  it("AC breakdown lines sum to derived AC", () => {
    const derived = computeDerivedCharacter(inputs)
    const breakdowns = getDerivedCharacterBreakdowns(inputs)
    const acLines = breakdownLines(breakdowns, "ac")
    expect(sumContributions(acLines)).toBe(derived.armorClass)
  })

  it("initiative breakdown includes Dexterity", () => {
    const derived = computeDerivedCharacter(inputs)
    const breakdowns = getDerivedCharacterBreakdowns(inputs)
    const initLines = breakdownLines(breakdowns, "initiative")
    expect(sumContributions(initLines)).toBe(derived.initiative)
    expect(initLines.some((line) => line.label === "Dexterity")).toBe(true)
  })

  it("does not change computeDerivedCharacter totals", () => {
    const before = computeDerivedCharacter(inputs)
    getDerivedCharacterBreakdowns(inputs)
    const after = computeDerivedCharacter(inputs)
    expect(after).toEqual(before)
  })
})
