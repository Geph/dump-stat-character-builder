import { describe, expect, it } from "vitest"
import {
  collectConditionRollModes,
  CONDITION_ROLL_EFFECTS,
} from "@/lib/srd/condition-roll-effects"

describe("CONDITION_ROLL_EFFECTS", () => {
  it("maps Poisoned to disadvantage on attacks and ability checks", () => {
    expect(CONDITION_ROLL_EFFECTS.Poisoned).toMatchObject({
      selfAttack: "disadvantage",
      selfAbilityCheck: "disadvantage",
    })
  })

  it("maps Restrained to Dex save disadvantage", () => {
    const modes = collectConditionRollModes(
      { kind: "save", ability: "dexterity" },
      ["Restrained"],
    )
    expect(modes).toContain("disadvantage")
  })

  it("auto-fails Strength saves for Paralyzed", () => {
    const modes = collectConditionRollModes(
      { kind: "save", ability: "strength" },
      ["Paralyzed"],
    )
    expect(modes).toContain("auto_fail")
  })
})
