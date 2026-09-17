import { describe, expect, it } from "vitest"
import {
  defaultSpellActionPins,
  isSpellPinnedToAbilities,
  normalizeSpellActionPins,
  toggleSpellPinnedToAbilities,
} from "@/lib/character/spell-action-pins"

describe("spell-action-pins", () => {
  it("toggles a spell onto and off the Abilities pin list", () => {
    const next = toggleSpellPinnedToAbilities(defaultSpellActionPins(), "spell-bane")
    expect(isSpellPinnedToAbilities(next, "spell-bane")).toBe(true)
    expect(toggleSpellPinnedToAbilities(next, "spell-bane").utilitySpellIds).toEqual([])
  })

  it("normalizes bad storage payloads", () => {
    expect(normalizeSpellActionPins({ utilitySpellIds: ["a", 2, "", null] as never })).toEqual({
      utilitySpellIds: ["a"],
    })
    expect(normalizeSpellActionPins(null)).toEqual(defaultSpellActionPins())
  })
})
