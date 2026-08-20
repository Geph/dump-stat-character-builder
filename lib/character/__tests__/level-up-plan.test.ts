import { describe, expect, it } from "vitest"
import { buildLevelUpPlan, countReplacedPicks } from "@/lib/character/level-up-plan"
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

const FORMULAS_KEY = "alchemist:L2:Bomb Formulas"
const DISCOVERY_KEY = "alchemist:L5:Discovery"

function alchemistAt(level: number): CharacterClassDetail {
  return {
    row: { class_id: "alchemist", level, subclass_id: null, order: 0 },
    class: {
      id: "alchemist",
      name: "Alchemist",
      features: [
        feature("Bombs", 1),
        feature("Bomb Formulas", 2, {
          isChoice: true,
          choices: {
            category: "Bomb Formula",
            count: 3,
            options: [],
            optionsSource: "class_bomb_formulas",
            choiceCountByLevel: [
              { level: 2, count: 3 },
              { level: 4, count: 4 },
              { level: 8, count: 5 },
            ],
            swappableOnRest: true,
            swapRestType: "long",
            swappableOnLevelUp: true,
          },
        }),
        feature("Discovery", 5, {
          isChoice: true,
          choices: {
            category: "Discovery",
            count: 1,
            options: [],
            optionsSource: "class_discoveries",
            swappableOnLevelUp: true,
          },
        }),
      ],
    } as DndClass,
    subclass: null,
  } as CharacterClassDetail
}

function formulaStep(plan: ReturnType<typeof buildLevelUpPlan>) {
  return plan?.steps.find((step) => step.kind === "feature_choice" && step.id === FORMULAS_KEY)
}

describe("buildLevelUpPlan — Alchemist formulas and discoveries", () => {
  it("asks for three Bomb Formulas when the feature unlocks at level 2", () => {
    const step = formulaStep(
      buildLevelUpPlan({
        entry: alchemistAt(1),
        subclasses: [],
        currentTotalLevel: 1,
        featureChoicePicks: {},
      }),
    )
    expect(step).toMatchObject({ required: 3, mode: "add", optional: false })
  })

  it("re-opens the formula picker at level 4 when the class table grants a fourth", () => {
    const step = formulaStep(
      buildLevelUpPlan({
        entry: alchemistAt(3),
        subclasses: [],
        currentTotalLevel: 3,
        featureChoicePicks: { [FORMULAS_KEY]: ["Acid Bomb", "Frost Bomb", "Shrapnel Bomb"] },
      }),
    )
    expect(step).toMatchObject({ required: 4, mode: "add" })
  })

  it("offers an optional swap on a level that grants no new formula", () => {
    const step = formulaStep(
      buildLevelUpPlan({
        entry: alchemistAt(2),
        subclasses: [],
        currentTotalLevel: 2,
        featureChoicePicks: { [FORMULAS_KEY]: ["Acid Bomb", "Frost Bomb", "Shrapnel Bomb"] },
      }),
    )
    expect(step).toMatchObject({ required: 3, mode: "swap", optional: true })
  })

  it("offers a Discovery swap once one is chosen, without demanding a second", () => {
    const plan = buildLevelUpPlan({
      entry: alchemistAt(5),
      subclasses: [],
      currentTotalLevel: 5,
      featureChoicePicks: {
        [FORMULAS_KEY]: ["Acid Bomb", "Frost Bomb", "Shrapnel Bomb"],
        [DISCOVERY_KEY]: ["Alchemy of Poison"],
      },
    })
    const discovery = plan?.steps.find(
      (step) => step.kind === "feature_choice" && step.id === DISCOVERY_KEY,
    )
    expect(discovery).toMatchObject({ required: 1, mode: "swap", optional: true })
  })

  it("puts required picks before optional swaps", () => {
    const plan = buildLevelUpPlan({
      entry: alchemistAt(3),
      subclasses: [],
      currentTotalLevel: 3,
      featureChoicePicks: {},
    })
    const modes = plan!.steps
      .filter((step) => step.kind === "feature_choice")
      .map((step) => (step as { mode: string }).mode)
    expect(modes).toEqual([...modes].sort((a, b) => (a === "add" ? -1 : b === "add" ? 1 : 0)))
  })
})

describe("countReplacedPicks", () => {
  const original = ["Acid Bomb", "Frost Bomb", "Shrapnel Bomb"]

  it("allows keeping every pick", () => {
    expect(countReplacedPicks(original, original)).toBe(0)
  })

  it("allows replacing exactly one pick", () => {
    expect(countReplacedPicks(original, ["Acid Bomb", "Frost Bomb", "Sleep Bomb"])).toBe(1)
  })

  it("rejects replacing two picks or dropping below the known count", () => {
    expect(countReplacedPicks(original, ["Acid Bomb", "Sleep Bomb", "Glue Bomb"])).toBeNull()
    expect(countReplacedPicks(original, ["Acid Bomb", "Frost Bomb"])).toBeNull()
  })
})
