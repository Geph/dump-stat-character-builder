import { describe, expect, it } from "vitest"
import {
  collectClassAbilityFeatures,
  hasClassAbilityStep,
  isClassAbilityFeatSlot,
  isClassAbilityFeatureChoice,
} from "@/lib/builder/class-ability-step"
import type { FeatPickSlot } from "@/lib/builder/class-feat-features"
import type { DndClass, Feature } from "@/lib/types"

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

  it("keeps skill proficiency picks on Class & Level", () => {
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
    ).toBe(false)
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

  it("hides for classes with only proficiency choices", () => {
    expect(
      hasClassAbilityStep({
        classLevels: [{ classId: "fighter", level: 1 }],
        classes: [fighter],
      }),
    ).toBe(false)
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
      "Awakened Talents",
    ])
  })
})
