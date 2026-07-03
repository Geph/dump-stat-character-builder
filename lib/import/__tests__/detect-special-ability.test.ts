import { describe, expect, it } from "vitest"
import {
  detectSpecialAbilityFromText,
  resolveSpecialAbilitySaveDc,
} from "@/lib/import/detect-special-ability"

describe("detectSpecialAbilityFromText", () => {
  it("detects Technique save DC governing Wisdom", () => {
    const detected = detectSpecialAbilityFromText(
      "Your Technique save DC = 8 + your proficiency bonus + your Wisdom modifier.",
    )
    expect(detected?.save_dc_ability).toBe("wisdom")
    expect(detected?.label).toBe("Technique save DC")
  })

  it("detects Psionic ability save DC governing Intelligence", () => {
    const detected = detectSpecialAbilityFromText(
      "Your Psionic ability save DC = 8 + your proficiency bonus + your Intelligence modifier.",
    )
    expect(detected?.save_dc_ability).toBe("intelligence")
    expect(detected?.label).toBe("Psionic ability")
  })
})

describe("resolveSpecialAbilitySaveDc", () => {
  it("computes 8 + PB + ability mod", () => {
    expect(
      resolveSpecialAbilitySaveDc(
        { save_dc_ability: "wisdom", dc_formula: "8_plus_prof_plus_ability_mod" },
        3,
        2,
      ),
    ).toBe(13)
  })
})
