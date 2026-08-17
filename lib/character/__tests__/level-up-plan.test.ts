import { describe, expect, it } from "vitest"
import { buildLevelUpPlan } from "@/lib/character/level-up-plan"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import type { DndClass, Feature } from "@/lib/types"

function feature(name: string, level: number, extra: Partial<Feature> = {}): Feature {
  return {
    name,
    level,
    description: `${name} at ${level}`,
    ...extra,
  } as Feature
}

function rangerAt(level: number): CharacterClassDetail {
  const cls = {
    id: "ranger",
    name: "Ranger",
    features: [
      feature("Spellcasting", 1),
      feature("Hunter's Prey", 3, {
        isChoice: true,
        choices: {
          category: "Hunter's Prey",
          count: 1,
          options: [{ name: "Colossus Slayer", description: "Extra 1d8" }],
        },
      }),
      feature("Ability Score Improvement", 4),
    ],
    spellcasting: {
      ability: "Wisdom",
      prepared: true,
      progression: [
        { level: 2, cantrips: 0, prepared: 2, max_spell_level: 1 },
        { level: 3, cantrips: 0, prepared: 3, max_spell_level: 1 },
      ],
    },
  } as DndClass
  return {
    row: { class_id: "ranger", level, subclass_id: "hunter", order: 0 },
    class: cls,
    subclass: {
      id: "hunter",
      class_id: "ranger",
      name: "Hunter",
      features: [feature("Hunter's Prey", 3)],
    } as CharacterClassDetail["subclass"],
  }
}

describe("buildLevelUpPlan", () => {
  it("surfaces Hunter's Prey choice and extra prepared spells at 3", () => {
    const plan = buildLevelUpPlan({
      entry: rangerAt(2),
      subclasses: [],
      currentTotalLevel: 2,
      featureChoicePicks: {},
    })
    expect(plan?.toLevel).toBe(3)
    expect(plan?.newFeatures.some((feature) => feature.name === "Hunter's Prey")).toBe(true)
    expect(plan?.steps.some((step) => step.kind === "feature_choice" && step.title === "Hunter's Prey")).toBe(
      true,
    )
    expect(plan?.steps.some((step) => step.kind === "spells" && step.extraPrepared === 1)).toBe(true)
  })

  it("adds a feat-or-ASI step at level 4", () => {
    const plan = buildLevelUpPlan({
      entry: rangerAt(3),
      subclasses: [],
      currentTotalLevel: 3,
      featureChoicePicks: {},
    })
    expect(plan?.steps.some((step) => step.kind === "feat_or_asi")).toBe(true)
  })
})
