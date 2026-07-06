import { describe, expect, it } from "vitest"
import {
  backgroundMatchesAbilityFilter,
  getBackgroundFilterableAbilities,
} from "@/lib/compendium/background-ability-filter"
import type { Background } from "@/lib/types"

function background(
  ability_bonuses: Background["ability_bonuses"],
): Pick<Background, "ability_bonuses"> {
  return { ability_bonuses }
}

describe("getBackgroundFilterableAbilities", () => {
  it("returns listed scores for 2024-style backgrounds", () => {
    expect(
      getBackgroundFilterableAbilities(
        background({
          intelligence: 0,
          wisdom: 0,
          charisma: 0,
        }),
      ),
    ).toEqual(["intelligence", "wisdom", "charisma"])
  })

  it("returns fixed bonus scores", () => {
    expect(
      getBackgroundFilterableAbilities(
        background({
          strength: 2,
          dexterity: 1,
        }),
      ),
    ).toEqual(["strength", "dexterity"])
  })

  it("treats null ability bonuses as any ability", () => {
    expect(getBackgroundFilterableAbilities(background(null))).toEqual([
      "strength",
      "dexterity",
      "constitution",
      "intelligence",
      "wisdom",
      "charisma",
    ])
  })

  it("returns no scores when ability bonuses are empty", () => {
    expect(getBackgroundFilterableAbilities(background({}))).toEqual([])
  })
})

describe("backgroundMatchesAbilityFilter", () => {
  it("matches when any selected ability is listed on the background", () => {
    const sage = background({
      constitution: 0,
      intelligence: 0,
      wisdom: 0,
    })

    expect(backgroundMatchesAbilityFilter(sage, ["INT"])).toBe(true)
    expect(backgroundMatchesAbilityFilter(sage, ["STR"])).toBe(false)
    expect(backgroundMatchesAbilityFilter(sage, ["STR", "WIS"])).toBe(true)
  })

  it("matches legacy backgrounds with free ability choice for any selection", () => {
    expect(backgroundMatchesAbilityFilter(background(null), ["STR"])).toBe(true)
    expect(backgroundMatchesAbilityFilter(background(null), ["CHA", "INT"])).toBe(true)
  })

  it("shows all backgrounds when no abilities are selected", () => {
    const criminal = background({
      dexterity: 0,
      constitution: 0,
      intelligence: 0,
    })

    expect(backgroundMatchesAbilityFilter(criminal, [])).toBe(true)
  })
})
