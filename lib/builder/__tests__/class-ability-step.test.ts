import { describe, expect, it } from "vitest"
import {
  collectClassAbilityFeatures,
  collectClassAbilityStepBlockers,
  featureHasClassAbilityModifierChoice,
  hasClassAbilityStep,
  isClassAbilityFeatSlot,
  isClassAbilityFeatureChoice,
} from "@/lib/builder/class-ability-step"
import type { FeatPickSlot } from "@/lib/builder/class-feat-features"
import {
  collectClassFeatureModifierPlayerChoiceSlots,
  type ModifierPlayerChoiceSlot,
} from "@/lib/builder/modifier-player-choices"
import {
  BUILDER_STEP_IDS,
  builderStepOrder,
} from "@/lib/builder/builder-constants"
import type { DndClass, Feature } from "@/lib/types"
import { enrichClassFeatureWithModifierPresets } from "@/lib/compendium/enrich-srd-class-features"
import { collectClassStepBlockers } from "@/lib/builder/choices"

function feature(partial: Partial<Feature> & Pick<Feature, "name" | "level">): Feature {
  return {
    description: "",
    isChoice: false,
    ...partial,
  }
}

function featSlot(
  partial: Omit<FeatPickSlot, "feature"> & { feature?: Feature },
): FeatPickSlot {
  return {
    feature: feature({ name: partial.label, level: partial.milestoneLevel }),
    ...partial,
  }
}

describe("builder step order", () => {
  it("puts Origin before Class Abilities", () => {
    expect(builderStepOrder(BUILDER_STEP_IDS.ORIGIN)).toBeLessThan(
      builderStepOrder(BUILDER_STEP_IDS.CLASS_ABILITIES),
    )
  })
})

describe("isClassAbilityFeatureChoice", () => {
  it("treats optionsSource pools as class abilities", () => {
    expect(
      isClassAbilityFeatureChoice(
        feature({
          name: "Psionic Disciplines",
          level: 1,
          isChoice: true,
          choices: {
            count: 2,
            category: "Discipline",
            options: [],
            optionsSource: "class_disciplines",
          },
        }),
      ),
    ).toBe(true)
  })

  it("puts feature-granted skill proficiency picks on Class Abilities", () => {
    expect(
      isClassAbilityFeatureChoice(
        feature({
          name: "Skill Proficiencies",
          level: 1,
          isChoice: true,
          choices: {
            count: 2,
            category: "Skill",
            options: [
              { name: "Athletics", description: "" },
              { name: "Stealth", description: "" },
            ],
          },
        }),
      ),
    ).toBe(true)
  })

  it("treats weapon mastery as a class ability", () => {
    expect(
      isClassAbilityFeatureChoice(
        feature({
          name: "Weapon Mastery",
          level: 1,
          isChoice: true,
          choices: {
            count: 2,
            category: "Weapon Mastery",
            options: [
              { name: "Longsword", description: "" },
              { name: "Greataxe", description: "" },
            ],
          },
        }),
      ),
    ).toBe(true)
  })
})

describe("proficiency feature step validation", () => {
  const skillFeature = feature({
    name: "Bonus Proficiencies",
    level: 3,
    isChoice: true,
    choices: {
      count: 1,
      category: "Skill Proficiency",
      options: [
        { name: "Arcana", description: "" },
        { name: "History", description: "" },
      ],
    },
  })
  const cls = {
    id: "bard",
    name: "Bard",
    features: [skillFeature],
  } as unknown as DndClass

  it("does not block Class & Level for a feature moved to Class Abilities", () => {
    expect(
      collectClassStepBlockers(
        [{ classId: "bard", level: 3 }],
        [cls],
        [],
        {},
        {},
        {},
        "bard",
      ),
    ).toEqual([])
  })

  it("does block Class Abilities until the moved feature is selected", () => {
    expect(
      collectClassAbilityStepBlockers({
        classLevels: [{ classId: "bard", level: 3 }],
        classes: [cls],
        featureChoicePicks: {},
      }),
    ).toEqual(['Bard: complete “Bonus Proficiencies” (0/1).'])
  })
})

describe("isClassAbilityFeatSlot", () => {
  it("flags Metamagic / Invocations / Fighting Style slots", () => {
    expect(
      isClassAbilityFeatSlot(
        featSlot({
          key: "sorcerer:metamagic:1",
          label: "Metamagic",
          classId: "sorcerer",
          className: "Sorcerer",
          featCategories: ["Metamagic"],
          milestoneLevel: 2,
        }),
      ),
    ).toBe(true)
    expect(
      isClassAbilityFeatSlot(
        featSlot({
          key: "fighter:asi:4",
          label: "Ability Score Improvement",
          classId: "fighter",
          className: "Fighter",
          featCategories: ["General"],
          milestoneLevel: 4,
        }),
      ),
    ).toBe(false)
  })
})

describe("hasClassAbilityStep", () => {
  const psion = {
    id: "psion",
    name: "Psion",
    features: [
      feature({
        name: "Psionic Disciplines",
        level: 1,
        isChoice: true,
        choices: {
          count: 2,
          category: "Discipline",
          options: [],
          optionsSource: "class_disciplines",
        },
      }),
    ],
  } as unknown as DndClass

  const fighter = {
    id: "fighter",
    name: "Fighter",
    features: [
      feature({
        name: "Skill Proficiencies",
        level: 1,
        isChoice: true,
        choices: {
          count: 2,
          category: "Skill",
          options: [{ name: "Athletics", description: "" }],
        },
      }),
    ],
  } as unknown as DndClass

  it("shows for classes with ability pools", () => {
    expect(
      hasClassAbilityStep({
        classLevels: [{ classId: "psion", level: 1 }],
        classes: [psion],
      }),
    ).toBe(true)
  })

  it("shows for classes with feature-granted proficiency choices", () => {
    expect(
      hasClassAbilityStep({
        classLevels: [{ classId: "fighter", level: 1 }],
        classes: [fighter],
      }),
    ).toBe(true)
  })

  it("shows when Metamagic-style feat slots exist", () => {
    expect(
      hasClassAbilityStep({
        classLevels: [{ classId: "sorcerer", level: 2 }],
        classes: [{ id: "sorcerer", name: "Sorcerer", features: [] } as unknown as DndClass],
        featPickSlots: [
          featSlot({
            key: "sorcerer:metamagic:1",
            label: "Metamagic",
            classId: "sorcerer",
            className: "Sorcerer",
            featCategories: ["Metamagic"],
            milestoneLevel: 2,
          }),
        ],
      }),
    ).toBe(true)
  })
})

describe("collectClassAbilityFeatures", () => {
  it("collects class and subclass ability pools", () => {
    const entries = collectClassAbilityFeatures({
      classLevels: [{ classId: "psion", level: 3 }],
      classes: [
        {
          id: "psion",
          name: "Psion",
          features: [
            feature({
              name: "Psionic Disciplines",
              level: 1,
              isChoice: true,
              choices: {
                count: 2,
                category: "Discipline",
                options: [],
                optionsSource: "class_disciplines",
              },
            }),
            feature({
              name: "Skills",
              level: 1,
              isChoice: true,
              choices: {
                count: 2,
                category: "Skill",
                options: [{ name: "Arcana", description: "" }],
              },
            }),
          ],
        } as unknown as DndClass,
      ],
      subclasses: [
        {
          id: "awakened",
          name: "Awakened",
          class_id: "psion",
          features: [
            feature({
              name: "Awakened Talents",
              level: 3,
              isChoice: true,
              choices: {
                count: 1,
                category: "Talent",
                options: [],
                optionsSource: "class_talents",
              },
            }),
          ],
        } as never,
      ],
      subclassByClassId: { psion: "awakened" },
    })

    expect(entries.map((e) => e.feature.name)).toEqual([
      "Psionic Disciplines",
      "Skills",
      "Awakened Talents",
    ])
  })

  it("does not collect subclass choices before the class subclass level", () => {
    const cls = {
      id: "fighter",
      name: "Fighter",
      subclass_unlock_level: 3,
      features: [],
    } as unknown as DndClass
    const subclass = {
      id: "banneret",
      name: "Banneret",
      class_id: "fighter",
      features: [
        feature({
          name: "Knightly Envoy",
          level: 3,
          isChoice: true,
          choices: {
            count: 1,
            category: "Skill Proficiency",
            options: [{ name: "Persuasion", description: "" }],
          },
        }),
      ],
    }

    expect(
      collectClassAbilityFeatures({
        classLevels: [{ classId: "fighter", level: 2 }],
        classes: [cls],
        subclasses: [subclass as never],
        subclassByClassId: { fighter: "banneret" },
      }),
    ).toEqual([])
  })
})

describe("featureHasClassAbilityModifierChoice", () => {
  const deftExplorer = feature({
    name: "Deft Explorer",
    level: 2,
  })
  const sourceKey = "ranger:L2:Deft Explorer"
  const languageSlot: ModifierPlayerChoiceSlot = {
    slotKey: `${sourceKey}::language::language`,
    sourceKey,
    sourceLabel: "Ranger: Deft Explorer",
    modId: "language",
    kind: "language",
    label: "Choose a language",
    maxCount: 1,
    options: [{ name: "Elvish" }],
  }

  it("moves passive skill/language/tool modifier picks to Class Abilities", () => {
    expect(
      featureHasClassAbilityModifierChoice("ranger", deftExplorer, [languageSlot]),
    ).toBe(true)
  })

  it("does not move spell-only modifier picks", () => {
    expect(
      featureHasClassAbilityModifierChoice("ranger", deftExplorer, [
        { ...languageSlot, kind: "spell", slotKey: `${sourceKey}::spell::spell` },
      ]),
    ).toBe(false)
  })

  it("moves Ranger Deft Explorer after its expertise and language slots are enriched", () => {
    const enriched = enrichClassFeatureWithModifierPresets("Ranger", deftExplorer)
    const ranger = {
      id: "ranger",
      name: "Ranger",
      skill_choices: { count: 3, options: ["Nature", "Stealth", "Survival"] },
      features: [enriched],
    } as unknown as DndClass
    const slots = collectClassFeatureModifierPlayerChoiceSlots({
      classLevels: [{ classId: "ranger", level: 2 }],
      classes: [ranger],
      subclasses: [],
      subclassByClassId: {},
      featureChoicePicks: {},
      catalog: [],
    })

    expect(slots.map((slot) => slot.kind).sort()).toEqual([
      "language",
      "skill",
    ])
    expect(slots.find((slot) => slot.kind === "skill")?.maxCount).toBe(1)
    expect(slots.find((slot) => slot.kind === "language")?.maxCount).toBe(2)
    expect(
      collectClassAbilityFeatures({
        classLevels: [{ classId: "ranger", level: 2 }],
        classes: [ranger],
        modifierPlayerChoiceSlots: slots,
      }).map((entry) => entry.feature.name),
    ).toEqual(["Deft Explorer"])
  })

  it("keeps starting Bard, Monk, and Artificer proficiency picks on Class & Level", () => {
    const bardFeature = feature({ name: "Bardic Inspiration", level: 1 })
    const monkFeature = feature({ name: "Martial Arts", level: 1 })
    const artificerFeature = feature({
      name: "Tool Proficiencies",
      level: 1,
      isChoice: true,
      choices: {
        count: 1,
        category: "Artisan Tool",
        options: [{ name: "Smith's Tools", description: "" }],
      },
    })

    expect(
      featureHasClassAbilityModifierChoice("bard", bardFeature, [
        { ...languageSlot, sourceKey: "bard:L1:Bardic Inspiration", kind: "tool" },
      ], "Bard"),
    ).toBe(false)
    expect(
      featureHasClassAbilityModifierChoice("monk", monkFeature, [
        { ...languageSlot, sourceKey: "monk:L1:Martial Arts", kind: "tool" },
      ], "Monk"),
    ).toBe(false)
    expect(isClassAbilityFeatureChoice(artificerFeature, "Artificer")).toBe(false)
  })
})
