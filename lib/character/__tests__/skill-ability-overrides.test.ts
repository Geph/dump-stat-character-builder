import { describe, expect, it } from "vitest"
import {
  normalizeSkillAbilityOverrides,
  resolveSkillAbility,
  setSkillAbilityOverride,
} from "@/lib/character/skill-ability-overrides"

describe("skill ability overrides", () => {
  it("keeps valid remaps and drops junk", () => {
    expect(
      normalizeSkillAbilityOverrides({
        Arcana: "charisma",
        Stealth: "not-an-ability",
        "": "strength",
      }),
    ).toEqual({ Arcana: "charisma" })
  })

  it("resolves to the override or the default", () => {
    expect(resolveSkillAbility("Arcana", "intelligence", { Arcana: "charisma" })).toBe("charisma")
    expect(resolveSkillAbility("Arcana", "intelligence", {})).toBe("intelligence")
  })

  it("clears an override when the default ability is chosen", () => {
    expect(
      setSkillAbilityOverride({ Arcana: "charisma" }, "Arcana", "intelligence", "intelligence"),
    ).toEqual({})
    expect(setSkillAbilityOverride({ Arcana: "charisma" }, "Arcana", null, "intelligence")).toEqual({})
    expect(
      setSkillAbilityOverride({}, "Arcana", "charisma", "intelligence"),
    ).toEqual({ Arcana: "charisma" })
  })
})
