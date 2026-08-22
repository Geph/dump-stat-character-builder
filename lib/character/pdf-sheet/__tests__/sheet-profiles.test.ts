import { describe, expect, it } from "vitest"

import { countMappableFields } from "@/lib/character/pdf-sheet/field-aliases"
import { matchSheetProfile, profileTargets } from "@/lib/character/pdf-sheet/sheet-profiles"

/** Signature names plus the generic boxes the 2024 PHB sheet fills through the profile. */
const PHB_2024_FIELD_NAMES = [
  "Strength Mod",
  "Int Saving Throw Proficiency",
  "Numeric Field 7",
  "Class Features 1",
  "Species Traits",
  "Hit Dice Spent",
  "Passive Perception",
  "Text Box 59",
  "Text Box 1",
  "Text Box 13",
  "Check Box 8",
  "Check Box 11",
  "Medium Armor",
  "Text Box 35",
]

describe("matchSheetProfile", () => {
  it("recognises the 2024 PHB sheet from its distinctive field names", () => {
    expect(matchSheetProfile(PHB_2024_FIELD_NAMES)?.id).toBe("phb-2024-fillable")
  })

  it("does not apply when a signature field is missing", () => {
    const partial = PHB_2024_FIELD_NAMES.filter((name) => name !== "Text Box 59")
    expect(matchSheetProfile(partial)).toBeNull()
  })

  it("does not apply to well-named sheets", () => {
    expect(matchSheetProfile(["Front_Character Name", "Front_AC", "Front_Str Mod"])).toBeNull()
  })
})

describe("profileTargets", () => {
  const profile = matchSheetProfile(PHB_2024_FIELD_NAMES)!

  it("scopes targets to the page the widget lives on", () => {
    expect(profileTargets(profile, "characterName")).toEqual([{ name: "Text Box 1", page: 0 }])
    expect(profileTargets(profile, "save.strength.bonus")).toEqual([
      { name: "Text Box 13", page: 0 },
    ])
  })

  it("supports a canonical key that drives more than one widget", () => {
    expect(profileTargets(profile, "prof.armor.medium")).toEqual([
      { name: "Check Box 11", page: 0 },
      { name: "Medium Armor", page: 0 },
    ])
  })

  it("returns nothing for keys the profile does not cover", () => {
    expect(profileTargets(profile, "backstory")).toEqual([])
  })
})

describe("countMappableFields with a profile", () => {
  it("credits profile-only fields that alias matching cannot see", () => {
    const withoutProfile = PHB_2024_FIELD_NAMES.filter((name) => name !== "Text Box 59")
    expect(countMappableFields(PHB_2024_FIELD_NAMES)).toBeGreaterThan(
      countMappableFields(withoutProfile),
    )
  })
})
