import { describe, expect, it } from "vitest"
import {
  collectActionUseBonuses,
  formatSheetActionUseBonusLine,
} from "@/lib/character/action-use-bonuses"

describe("collectActionUseBonuses", () => {
  it("reads a check_bonus on a linked modifier (Survivor Steel Yourself)", () => {
    const bonuses = collectActionUseBonuses({
      linkedModifiers: [
        {
          activation: {
            effects: [
              {
                id: "mod_survivor_steel_bonus",
                kind: "check_bonus",
                checkCategory: "save",
                bonusConfig: { mode: "proficiency" },
              },
            ],
          },
        },
      ],
    })
    expect(bonuses).toEqual([
      {
        appliesTo: "saving throws",
        rollMode: "bonus",
        bonusConfig: { mode: "proficiency" },
      },
    ])
  })

  it("formats the resolved proficiency bonus for the Use button", () => {
    expect(
      formatSheetActionUseBonusLine(
        {
          appliesTo: "saving throws",
          rollMode: "bonus",
          bonusConfig: { mode: "proficiency" },
        },
        { proficiencyBonus: 3 },
      ),
    ).toBe("+3 (Proficiency Bonus) to saving throws")
  })

  it("states advantage without inventing a number", () => {
    expect(
      formatSheetActionUseBonusLine({
        appliesTo: "ability checks",
        rollMode: "advantage",
      }),
    ).toBe("Advantage on ability checks")
  })
})
