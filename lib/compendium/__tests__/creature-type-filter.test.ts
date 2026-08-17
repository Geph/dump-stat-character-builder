import { describe, expect, it } from "vitest"
import {
  collectCreatureTypeOptions,
  creatureMatchesTypeFilter,
  normalizeCreatureType,
} from "@/lib/compendium/creature-type-filter"

describe("creature type filter", () => {
  it("strips parenthetical tags from types", () => {
    expect(normalizeCreatureType("Humanoid (Goblinoid)")).toBe("Humanoid")
    expect(normalizeCreatureType("Aberration")).toBe("Aberration")
  })

  it("matches a filter against tagged and plain types", () => {
    expect(creatureMatchesTypeFilter("Humanoid (Elf)", "Humanoid")).toBe(true)
    expect(creatureMatchesTypeFilter("Beast", "Humanoid")).toBe(false)
    expect(creatureMatchesTypeFilter(null, "all")).toBe(true)
  })

  it("lists known types first, then extras from the data", () => {
    expect(
      collectCreatureTypeOptions([
        { creature_type: "Humanoid (Goblinoid)" },
        { creature_type: "Beast" },
        { creature_type: "Starspawn" },
      ]),
    ).toEqual(["Beast", "Humanoid", "Starspawn"])
  })
})
