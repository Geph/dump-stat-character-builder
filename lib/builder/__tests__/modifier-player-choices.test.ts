import { describe, expect, it } from "vitest"
import { proficientSkillsInBuilder } from "@/lib/builder/choices"
import { enrichClassFeatureWithModifierPresets } from "@/lib/compendium/enrich-srd-class-features"
import {
  collectClassFeatureModifierPlayerChoiceSlots,
  collectModifierPlayerChoiceSlots,
  isSpellRelatedModifierSlot,
  optionsForExpertiseSlot,
  optionsForProficiencyGrantSlot,
  spellModifierPlayerChoiceSlots,
} from "@/lib/builder/modifier-player-choices"
import { buildDefaultModifierCatalog } from "@/lib/compendium/modifier-catalog"
import { enrichCustomFeatRow } from "@/lib/compendium/enrich-custom-feats"
import { enrichSrdFeatRow } from "@/lib/compendium/enrich-srd-feats"
import { grantedFeatChoicePickKey } from "@/lib/builder/feat-choices"
import type { DndClass, Feat, Feature } from "@/lib/types"

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

  it("scales Investigator Expertise from two picks at 2 to four at 9", () => {
    const feature = enrichClassFeatureWithModifierPresets("Investigator", {
      level: 2,
      name: "Expertise",
      description:
        "<p>You gain Expertise in two of your skill proficiencies of your choice.</p><p>At Investigator level 9, you gain Expertise in two more of your skill proficiencies of your choice.</p>",
    } as Feature)
    const cls = {
      id: "investigator",
      name: "Investigator",
      features: [feature],
    } as unknown as DndClass

    const atTwo = collectClassFeatureModifierPlayerChoiceSlots({
      classLevels: [{ classId: "investigator", level: 2 }],
      classes: [cls],
      subclasses: [],
      subclassByClassId: {},
      featureChoicePicks: {},
      catalog: [],
    }).find((slot) => slot.grantsExpertise)
    const atNine = collectClassFeatureModifierPlayerChoiceSlots({
      classLevels: [{ classId: "investigator", level: 9 }],
      classes: [cls],
      subclasses: [],
      subclassByClassId: {},
      featureChoicePicks: {},
      catalog: [],
    }).find((slot) => slot.grantsExpertise)

    expect(atTwo?.maxCount).toBe(2)
    expect(atNine?.maxCount).toBe(4)
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

  it("hides already-proficient tools from pure tool grant slots", () => {
    const toolSlot = {
      slotKey: "species:elf::mod_tools::tool",
      sourceKey: "species:elf",
      sourceLabel: "Elf",
      modId: "mod_tools",
      kind: "tool" as const,
      label: "Choose 1 tool",
      maxCount: 1,
      options: [
        { name: "Thieves' Tools" },
        { name: "Herbalism Kit" },
        { name: "Lute" },
      ],
      toolChoicePool: null,
    }

    const options = optionsForProficiencyGrantSlot(toolSlot, {
      proficientSkills: [],
      proficientTools: ["thieves' tools"],
    })

    expect(options.map((option) => option.name)).toEqual(["Herbalism Kit", "Lute"])
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

describe("feat spell grant player choices", () => {
  const catalog = buildDefaultModifierCatalog()

  function enrichedFeat(name: string): Feat {
    const row =
      name === "Magic Initiate"
        ? enrichSrdFeatRow({ name, source: "SRD", description: "Cantrips and a level-1 spell" })
        : enrichCustomFeatRow({ name, source: "PHB", description: name })
    return {
      id: `feat-${name.toLowerCase().replace(/\s+/g, "-")}`,
      name,
      description: row.description ?? "",
      linkedModifiers: row.linked_modifiers ?? row.linkedModifiers ?? [],
      modifierRefs: row.modifier_refs ?? row.modifierRefs ?? [],
    } as unknown as Feat
  }

  it("collects Magic Initiate spell list, cantrip, and level-1 spell slots", () => {
    const feat = enrichedFeat("Magic Initiate")
    const sourceKey = grantedFeatChoicePickKey(feat.id)
    const slots = collectModifierPlayerChoiceSlots({
      featEntries: [{ featId: feat.id, choicePickKey: sourceKey }],
      feats: [feat],
      featChoicePicks: {},
      catalog,
    })
    const spellSlots = spellModifierPlayerChoiceSlots(slots)
    expect(spellSlots.some((slot) => slot.kind === "spell_list_class")).toBe(true)
    expect(spellSlots.filter((slot) => slot.kind === "spell").map((slot) => slot.label)).toEqual([
      "Choose 2 cantrips",
      "Choose 1 level-1 spell",
    ])
    expect(slots.some((slot) => slot.kind === "spellcasting_ability")).toBe(true)
  })

  it("collects Fey Touched and Shadow Touched level-1 spell pick slots", () => {
    for (const name of ["Fey Touched", "Shadow Touched"] as const) {
      const feat = enrichedFeat(name)
      const sourceKey = grantedFeatChoicePickKey(feat.id)
      const slots = collectModifierPlayerChoiceSlots({
        featEntries: [{ featId: feat.id, choicePickKey: sourceKey }],
        feats: [feat],
        featChoicePicks: {},
        catalog,
      })
      const spellSlots = spellModifierPlayerChoiceSlots(
        slots.filter((slot) => slot.sourceKey === sourceKey),
      )
      expect(spellSlots.some((slot) => slot.kind === "spell" && slot.spellLevel === 1)).toBe(true)
      expect(spellSlots.every(isSpellRelatedModifierSlot)).toBe(true)
    }
  })
})
