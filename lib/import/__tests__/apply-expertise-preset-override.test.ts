import { describe, expect, it } from "vitest"

import { enrichClassFeatureWithModifierPresets } from "@/lib/compendium/enrich-srd-class-features"
import {
  applyExpertisePresetOverride,
  parseExpertiseCountUnlocks,
} from "@/lib/import/apply-expertise-preset-override"
import type { Feature } from "@/lib/types"

const INVESTIGATOR_EXPERTISE =
  "<p>You gain Expertise in two of your skill proficiencies of your choice. Arcana and Investigation are recommended if you have proficiency in them.</p><p>At Investigator level 9, you gain Expertise in two more of your skill proficiencies of your choice.</p>"

describe("parseExpertiseCountUnlocks", () => {
  it("reads Investigator's extra Expertise at level 9", () => {
    expect(parseExpertiseCountUnlocks(INVESTIGATOR_EXPERTISE)).toEqual([
      { unlocksAtClassLevel: 9, count: 2 },
    ])
  })
})

describe("applyExpertisePresetOverride", () => {
  it("keeps two picks and records the level 9 unlock on Investigator Expertise", () => {
    const wired = enrichClassFeatureWithModifierPresets("Investigator", {
      level: 2,
      name: "Expertise",
      description: INVESTIGATOR_EXPERTISE,
    } as Feature)
    const overridden = applyExpertisePresetOverride(wired)
    const skill = overridden.linkedModifiers
      ?.flatMap((inst) => inst.characteristics ?? [])
      .find((mod) => mod.type === "skills")
    expect(skill?.type).toBe("skills")
    if (skill?.type === "skills") {
      expect(skill.choiceCount).toBe(2)
      expect(skill.grantExpertise).toBe(true)
      expect(skill.choiceCountUnlocks).toEqual([{ unlocksAtClassLevel: 9, count: 2 }])
    }
  })
})
