import { describe, expect, it } from "vitest"
import {
  detectNonSpellSpecialAbilityFromText,
  detectSpellcastingAbilityFromText,
} from "@/lib/import/detect-governing-ability"

describe("detectGoverningAbilityFromText", () => {
  it("detects spellcasting ability declarations", () => {
    expect(
      detectSpellcastingAbilityFromText(
        "Intelligence is your spellcasting ability for your Investigator spells.",
      ),
    ).toBe("Intelligence")
    expect(detectSpellcastingAbilityFromText("Your spellcasting ability is Wisdom.")).toBe("Wisdom")
  })

  it("maps Spell save DC phrasing to spellcasting ability", () => {
    expect(
      detectSpellcastingAbilityFromText(
        "Spell save DC = 8 + your proficiency bonus + your Wisdom modifier.",
      ),
    ).toBe("Wisdom")
  })

  it("keeps Technique and Psionic on special_ability", () => {
    expect(
      detectNonSpellSpecialAbilityFromText(
        "Your Technique save DC = 8 + your proficiency bonus + your Wisdom modifier.",
      )?.save_dc_ability,
    ).toBe("wisdom")
    expect(
      detectNonSpellSpecialAbilityFromText(
        "Your Psionic ability save DC = 8 + your proficiency bonus + your Intelligence modifier.",
      )?.label,
    ).toBe("Psionic ability")
  })
})
