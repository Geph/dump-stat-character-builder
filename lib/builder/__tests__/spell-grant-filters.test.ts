import { describe, expect, it } from "vitest"

import { filterSpellsBySchool, uniqueSpellSchools } from "@/lib/builder/spell-grant-filters"

const SPELLS = [
  { name: "Alarm", school: "Abjuration" },
  { name: "Animal Friendship", school: "Enchantment" },
  { name: "Ballistic Smite", school: "Evocation" },
  { name: "Blank", school: "  " },
  { name: "Unknown", school: null },
  { name: "Ward", school: "Abjuration" },
]

describe("uniqueSpellSchools", () => {
  it("returns sorted unique schools and skips blanks", () => {
    expect(uniqueSpellSchools(SPELLS)).toEqual(["Abjuration", "Enchantment", "Evocation"])
  })
})

describe("filterSpellsBySchool", () => {
  it("leaves the list intact when the filter is all", () => {
    expect(filterSpellsBySchool(SPELLS, "all")).toEqual(SPELLS)
  })

  it("keeps only the chosen school", () => {
    expect(filterSpellsBySchool(SPELLS, "Abjuration").map((spell) => spell.name)).toEqual([
      "Alarm",
      "Ward",
    ])
  })
})
