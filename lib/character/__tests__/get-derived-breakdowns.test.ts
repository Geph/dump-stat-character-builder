import { describe, expect, it } from "vitest"
import { computeDerivedCharacter } from "@/lib/character/compute-derived"
import { getDerivedCharacterBreakdowns, breakdownLines } from "@/lib/character/get-derived-breakdowns"
import { sumContributions } from "@/lib/character/stat-contributions"
import { barbarianShieldFixture, linked } from "@/lib/character/__tests__/fixtures"
import type { CharacterBuildInputs } from "@/lib/character/types"
import type { Feat } from "@/lib/types"

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

  it("labels initiative proficiency with the granting feat", () => {
    const alertFeat = {
      id: "feat_alert",
      name: "Alert",
      description: "",
      category: "Origin",
      repeatable: false,
      benefits: [],
      linkedModifiers: linked([
        {
          id: "alert_initiative",
          type: "initiative",
          mode: "add_proficiency",
          label: "Initiative Proficiency",
        },
      ]),
      icon: null,
      source: "SRD",
      creator_url: null,
      created_at: "",
    } as unknown as Feat

    const withAlert = {
      ...inputs,
      selectedFeatIds: [alertFeat.id],
      feats: [alertFeat],
    }
    const derived = computeDerivedCharacter(withAlert)
    const initLines = breakdownLines(getDerivedCharacterBreakdowns(withAlert), "initiative")
    expect(sumContributions(initLines)).toBe(derived.initiative)
    expect(initLines.some((line) => line.label === "Proficiency (Alert)")).toBe(true)
    expect(
      initLines.find((line) => line.label === "Proficiency (Alert)")?.amount,
    ).toBe(derived.proficiencyBonus)
  })

  it("does not change computeDerivedCharacter totals", () => {
    const before = computeDerivedCharacter(inputs)
    getDerivedCharacterBreakdowns(inputs)
    const after = computeDerivedCharacter(inputs)
    expect(after).toEqual(before)
  })

  it("lists species trait sources for each movement speed", () => {
    const base = barbarianShieldFixture()
    const speciesInputs = {
      ...base,
      species: {
        id: "aarakocra",
        name: "Aarakocra",
        speed: 30,
        traits: [
          {
            name: "Flight",
            description: "You have a flying speed.",
            linkedModifiers: linked([
              {
                id: "mod_fly",
                type: "speed",
                speedType: "fly",
                mode: "set",
                value: 45,
              },
            ]),
          },
        ],
        created_at: "",
      },
    }

    const derived = computeDerivedCharacter(speciesInputs as unknown as CharacterBuildInputs)
    const breakdowns = getDerivedCharacterBreakdowns(speciesInputs as unknown as CharacterBuildInputs)
    const speedLines = breakdownLines(breakdowns, "speed")

    expect(derived.speeds?.some((entry) => entry.type === "fly" && entry.feet === 45)).toBe(true)
    expect(speedLines.some((line) => line.label.includes("Aarakocra") && line.amount === 30)).toBe(
      true,
    )
    expect(speedLines.some((line) => line.label.includes("Flight") && line.amount === 45)).toBe(true)
  })

  it("passive Insight and Investigation breakdowns sum to derived totals", () => {
    const derived = computeDerivedCharacter(inputs)
    const breakdowns = getDerivedCharacterBreakdowns(inputs)
    expect(sumContributions(breakdownLines(breakdowns, "passiveInsight"))).toBe(
      derived.passiveInsight,
    )
    expect(sumContributions(breakdownLines(breakdowns, "passiveInvestigation"))).toBe(
      derived.passiveInvestigation,
    )
    expect(sumContributions(breakdownLines(breakdowns, "passivePerception"))).toBe(
      derived.passivePerception,
    )
  })
})
