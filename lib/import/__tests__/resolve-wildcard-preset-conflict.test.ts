import { describe, expect, it } from "vitest"
import {
  shouldSkipWildcardPreset,
  wildcardPresetConflict,
} from "@/lib/import/resolve-wildcard-preset-conflict"

describe("resolve-wildcard-preset-conflict", () => {
  it("skips Cunning Strike preset when description uses Exploit Dice", () => {
    const description =
      "When you deal Sneak Attack damage, you can expend Sneak Attack dice to activate Exploits you know."
    expect(
      shouldSkipWildcardPreset("Cunning Strike", description, "*::Cunning Strike"),
    ).toBe(true)
    expect(wildcardPresetConflict("Cunning Strike", description, "*::Cunning Strike")).toMatchObject({
      presetKey: "*::Cunning Strike",
    })
  })

  it("does not skip Cunning Strike preset for SRD rider text", () => {
    const description =
      "When you use Sneak Attack, you can add Poison, Trip, or Withdraw for 1d6 each."
    expect(
      shouldSkipWildcardPreset("Cunning Strike", description, "*::Cunning Strike"),
    ).toBe(false)
  })

  it("skips Tactical Master weapon-mastery-swap preset for an ally save aura (Warmage House of Kings)", () => {
    const description =
      "Allies within 10 feet of you add your Intelligence modifier (minimum of 1) to their saving throws against spells and magical effects."
    expect(
      shouldSkipWildcardPreset("Tactical Master", description, "*::Tactical Master"),
    ).toBe(true)
  })

  it("does not skip Tactical Master preset for SRD Fighter weapon mastery text", () => {
    const description =
      "When you attack with a weapon whose mastery property you can use, you can replace that property with the Push, Sap, or Slow property for that attack."
    expect(
      shouldSkipWildcardPreset("Tactical Master", description, "*::Tactical Master"),
    ).toBe(false)
  })

  it("skips Bonus Proficiencies preset for constrained Acrobatics-or-Athletics text", () => {
    const description = "You gain proficiency in your choice of the Acrobatics or Athletics skill."
    expect(
      shouldSkipWildcardPreset("Bonus Proficiencies", description, "*::Bonus Proficiencies"),
    ).toBe(true)
  })

  it("keeps Bonus Proficiencies preset for College of Lore any-three-skills text", () => {
    const description = "You gain proficiency with three skills of your choice."
    expect(
      shouldSkipWildcardPreset("Bonus Proficiencies", description, "*::Bonus Proficiencies"),
    ).toBe(false)
  })
})
