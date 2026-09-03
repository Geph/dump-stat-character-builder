import { describe, expect, it } from "vitest"
import { proficientSkillsInBuilder } from "@/lib/builder/choices"
import { enrichClassFeatureWithModifierPresets } from "@/lib/compendium/enrich-srd-class-features"
import {
  chosenDamageTypesFromCharacteristics,
  collectClassFeatureModifierPlayerChoiceSlots,
  collectModifierPlayerChoiceSlots,
  isSpellRelatedModifierSlot,
  modifierPlayerChoiceSlotsForLevelUpStep,
  optionsForExpertiseSlot,
  optionsForProficiencyGrantSlot,
  spellModifierPlayerChoiceSlots,
  spellOptionsForModifierSlot,
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
      const pick = spellSlots.find((slot) => slot.kind === "spell" && slot.spellLevel === 1)
      expect(pick).toBeTruthy()
      expect(pick?.allowedSchools).toEqual(
        name === "Fey Touched"
          ? ["Divination", "Enchantment"]
          : ["Illusion", "Necromancy"],
      )
      expect(spellSlots.every(isSpellRelatedModifierSlot)).toBe(true)
    }
  })
})

describe("modifierPlayerChoiceSlotsForLevelUpStep", () => {
  const base = {
    sourceKey: "class:investigator:Ritualist",
    sourceLabel: "Ritualist",
    modId: "spells_known_grimoire",
    kind: "spell" as const,
    maxCount: 2,
    spellLevelIsMax: true as const,
    spellListClassNames: ["Investigator"],
  }

  it("keeps separate grimoire unlock tiers on different screens", () => {
    const tier1 = {
      ...base,
      slotKey: `${base.sourceKey}::${base.modId}::spell:1`,
      label: "Choose 2 spells (up to level 1)",
      spellLevel: 1,
      unlocksAtClassLevel: 2,
    }
    const tier2 = {
      ...base,
      slotKey: `${base.sourceKey}::${base.modId}::spell:2`,
      label: "Choose 2 spells (up to level 2)",
      spellLevel: 2,
      unlocksAtClassLevel: 3,
    }
    expect(modifierPlayerChoiceSlotsForLevelUpStep(tier2, [tier1, tier2])).toEqual([tier2])
  })

  it("bundles Magic Initiate-style grants that unlock together", () => {
    const cantrips = {
      ...base,
      sourceKey: "feat:granted:mi",
      sourceLabel: "Magic Initiate",
      modId: "magic_initiate_spells",
      slotKey: "feat:granted:mi::magic_initiate_spells::spell:0",
      label: "Choose 2 cantrips",
      spellLevel: 0,
      spellLevelIsMax: undefined,
      maxCount: 2,
    }
    const leveled = {
      ...cantrips,
      slotKey: "feat:granted:mi::magic_initiate_spells::spell:1",
      label: "Choose 1 level-1 spell",
      spellLevel: 1,
      maxCount: 1,
    }
    expect(modifierPlayerChoiceSlotsForLevelUpStep(cantrips, [cantrips, leveled])).toEqual([
      cantrips,
      leveled,
    ])
  })
})

describe("spellOptionsForModifierSlot school allowlist", () => {
  it("limits Fey Touched picks to Divination or Enchantment", () => {
    const slot = {
      slotKey: "feat:fey::pick::spell:0",
      sourceKey: "feat:fey",
      sourceLabel: "Fey Touched",
      modId: "pick",
      kind: "spell" as const,
      label: "Choose 1 level-1 spell",
      maxCount: 1,
      spellLevel: 1,
      allowedSchools: ["Divination", "Enchantment"],
    }
    const spells = [
      { id: "charm-person", name: "Charm Person", level: 1, school: "Enchantment", classes: ["Wizard"] },
      { id: "detect-magic", name: "Detect Magic", level: 1, school: "Divination", classes: ["Wizard"] },
      { id: "burning-hands", name: "Burning Hands", level: 1, school: "Evocation", classes: ["Wizard"] },
    ]
    expect(spellOptionsForModifierSlot(slot, spells as never, {}).map((row) => row.name)).toEqual([
      "Charm Person",
      "Detect Magic",
    ])
  })
})

describe("chosenDamageTypesFromCharacteristics", () => {
  it("reads the Energy Mastery damage-type pick for a resistance choice", () => {
    expect(
      chosenDamageTypesFromCharacteristics(
        [
          {
            id: "mod_elemental_adept_type",
            type: "damage_resistance",
            damageTypes: [],
            choiceCount: 1,
            choiceOptions: ["Acid", "Cold", "Fire", "Lightning", "Thunder"],
          },
        ],
        { "feat:granted:feat-1::mod_elemental_adept_type::damage_type": ["Cold"] },
      ),
    ).toEqual(["Cold"])
  })
})

describe("class Spellcasting choice grants vs native progression", () => {
  function spellcastingFeature(name = "Spellcasting"): Feature {
    return {
      level: 1,
      name,
      description: "You know three cantrips of your choice.",
      linkedModifiers: [
        {
          instanceId: "spellcasting-known",
          catalogRefId: "cat_char_spells_known",
          characteristics: [
            {
              id: "spells_known_picks",
              type: "spells_known",
              spells: [],
              choiceGrants: [
                { level: 0, count: 3 },
                { level: 1, count: 4 },
              ],
            },
          ],
        },
      ],
    } as Feature
  }

  it("does not duplicate cantrip/prepared picks when the class already has progression", () => {
    const cls = {
      id: "necromancer",
      name: "Necromancer",
      spellcasting: {
        ability: "intelligence",
        caster_progression: "full",
        prepared: true,
        progression: [{ level: 1, cantrips: 3, prepared: 4, max_spell_level: 1 }],
      },
      features: [spellcastingFeature()],
    } as unknown as DndClass

    const slots = collectClassFeatureModifierPlayerChoiceSlots({
      classLevels: [{ classId: "necromancer", level: 1 }],
      classes: [cls],
      subclasses: [],
      subclassByClassId: {},
      featureChoicePicks: {},
      catalog: [],
    })

    expect(slots.filter((slot) => slot.kind === "spell")).toEqual([])
  })

  it("keeps extra-feature spell grants and ability-only casters", () => {
    const prepared = {
      id: "necromancer",
      name: "Necromancer",
      spellcasting: {
        ability: "intelligence",
        caster_progression: "full",
        prepared: true,
        progression: [{ level: 1, cantrips: 3, prepared: 4, max_spell_level: 1 }],
      },
      features: [spellcastingFeature("Dark Gift Cantrip")],
    } as unknown as DndClass

    const extraSlots = collectClassFeatureModifierPlayerChoiceSlots({
      classLevels: [{ classId: "necromancer", level: 1 }],
      classes: [prepared],
      subclasses: [],
      subclassByClassId: {},
      featureChoicePicks: {},
      catalog: [],
    })
    expect(extraSlots.filter((slot) => slot.kind === "spell").map((slot) => slot.label)).toEqual([
      "Choose 3 cantrips",
      "Choose 4 level-1 spells",
    ])

    const cantripOnly = {
      id: "warmage",
      name: "Warmage",
      spellcasting: { ability: "intelligence" },
      features: [spellcastingFeature()],
    } as unknown as DndClass

    const warmageSlots = collectClassFeatureModifierPlayerChoiceSlots({
      classLevels: [{ classId: "warmage", level: 1 }],
      classes: [cantripOnly],
      subclasses: [],
      subclassByClassId: {},
      featureChoicePicks: {},
      catalog: [],
    })
    expect(warmageSlots.some((slot) => slot.kind === "spell")).toBe(true)
  })
})

describe("expertiseIfProficient picker", () => {
  it("keeps already-proficient skills visible for Keen Mind", () => {
    const keen = enrichCustomFeatRow({
      id: "keen-mind",
      name: "Keen Mind",
      description: "Choose one of Arcana, History, Investigation, Nature, or Religion.",
      category: "General",
    }) as unknown as Feat
    const slots = collectModifierPlayerChoiceSlots({
      featEntries: [{ featId: keen.id, choicePickKey: "feat:granted:keen-mind" }],
      feats: [keen],
      featChoicePicks: {},
      catalog: [],
    })
    const slot = slots.find((row) => row.expertiseIfProficient)
    expect(slot).toBeDefined()
    const options = optionsForProficiencyGrantSlot(slot!, {
      proficientSkills: ["Arcana", "History"],
    })
    expect(options.map((option) => option.name)).toEqual(
      expect.arrayContaining(["Arcana", "History", "Investigation", "Nature", "Religion"]),
    )
  })
})
