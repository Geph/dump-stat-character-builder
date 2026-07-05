import { describe, expect, it } from "vitest"
import { proficientSkillsInBuilder } from "@/lib/builder/choices"
import { enrichClassFeatureWithModifierPresets } from "@/lib/compendium/enrich-srd-class-features"
import {
  collectClassFeatureModifierPlayerChoiceSlots,
  optionsForExpertiseSlot,
} from "@/lib/builder/modifier-player-choices"
import type { DndClass, Feature } from "@/lib/types"

describe("expertise modifier player choices", () => {
  it("collects proficient skills from background, class, and modifier grants", () => {
    expect(
      proficientSkillsInBuilder({
        backgroundSkills: ["Athletics", "Perception"],
        classSkillPicks: { bard: ["Performance", "Persuasion", "Deception"] },
        featureChoicePicks: {},
        speciesTraitPicks: {},
        modifierGrantedSkills: ["Insight"],
      }),
    ).toEqual([
      "Athletics",
      "Perception",
      "Performance",
      "Persuasion",
      "Deception",
      "Insight",
    ])
  })

  it("limits SRD Bard Expertise options to proficient skills only", () => {
    const feature: Feature = {
      level: 2,
      name: "Expertise",
      description:
        "At 2nd level, choose two of your skill proficiencies. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies.",
    }
    const enriched = enrichClassFeatureWithModifierPresets("Bard", feature, null, {
      skipMechanicalDetection: true,
    })
    const cls: DndClass = {
      id: "bard",
      name: "Bard",
      features: [enriched],
    } as DndClass

    const slots = collectClassFeatureModifierPlayerChoiceSlots({
      classLevels: [{ classId: "bard", level: 2 }],
      classes: [cls],
      subclasses: [],
      subclassByClassId: {},
      featureChoicePicks: {},
      catalog: [],
    })

    const expertiseSlot = slots.find((slot) => slot.grantsExpertise)
    expect(expertiseSlot).toBeDefined()
    expect(expertiseSlot?.maxCount).toBe(2)

    const proficient = ["Athletics", "Performance", "Persuasion"]
    const options = optionsForExpertiseSlot(expertiseSlot!, {
      proficientSkills: proficient,
      existingExpertiseSkills: [],
    })

    expect(options.map((option) => option.name)).toEqual(proficient)
    expect(options.some((option) => option.name === "Arcana")).toBe(false)
  })

  it("excludes skills that already have expertise from earlier features", () => {
    const slot = {
      slotKey: "test",
      sourceKey: "test",
      sourceLabel: "Test",
      modId: "mod",
      kind: "skill" as const,
      label: "Expertise",
      maxCount: 2,
      grantsExpertise: true,
      options: [],
    }

    const options = optionsForExpertiseSlot(slot, {
      proficientSkills: ["Stealth", "Perception", "Acrobatics"],
      existingExpertiseSkills: ["Stealth"],
    })

    expect(options.map((option) => option.name).sort()).toEqual(["Acrobatics", "Perception"])
  })
})
