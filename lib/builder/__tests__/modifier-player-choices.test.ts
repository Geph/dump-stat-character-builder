import { describe, expect, it } from "vitest"
import { proficientSkillsInBuilder } from "@/lib/builder/choices"
import { enrichClassFeatureWithModifierPresets } from "@/lib/compendium/enrich-srd-class-features"
import {
  collectClassFeatureModifierPlayerChoiceSlots,
  optionsForExpertiseSlot,
  optionsForProficiencyGrantSlot,
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
    const feature = {
      level: 2,
      name: "Expertise",
      description:
        "At 2nd level, choose two of your skill proficiencies. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies.",
    }
    const enriched = enrichClassFeatureWithModifierPresets("Bard", feature, null, {
      skipMechanicalDetection: true,
    })
    const cls = {
      id: "bard",
      name: "Bard",
      features: [enriched],
    } as unknown as DndClass

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

describe("proficiency grant modifier player choices", () => {
  const skilledSlot = {
    slotKey: "feat:skilled::shared::skilled_proficiencies",
    sourceKey: "feat:skilled",
    sourceLabel: "Skilled",
    modId: "skilled_skills",
    kind: "skill_or_tool" as const,
    label: "Choose 3 skills or tools",
    maxCount: 3,
    sharedChoiceGroup: "skilled_proficiencies",
    options: [
      { name: "Athletics" },
      { name: "Stealth" },
      { name: "Thieves' Tools" },
      { name: "Lute" },
    ],
  }

  it("hides skills and tools the character is already proficient in", () => {
    const options = optionsForProficiencyGrantSlot(skilledSlot, {
      proficientSkills: ["Athletics", "Stealth"],
      proficientTools: ["Thieves' Tools"],
    })

    expect(options.map((option) => option.name)).toEqual(["Lute"])
  })

  it("keeps current selections visible even when they are already proficient", () => {
    const options = optionsForProficiencyGrantSlot(skilledSlot, {
      proficientSkills: ["Athletics", "Stealth"],
      proficientTools: ["Thieves' Tools"],
      currentSelection: ["Stealth"],
    })

    expect(options.map((option) => option.name).sort()).toEqual(["Lute", "Stealth"])
  })
})
