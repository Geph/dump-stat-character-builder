import { describe, expect, it } from "vitest"
import {
  applyAbilityScoreOverrides,
  applyHealingReceivedModifiers,
} from "@/lib/character/apply-characteristic-runtime"
import { resolveFeatureChoiceCount } from "@/lib/compendium/resolve-feature-choice-count"

describe("applyAbilityScoreOverrides", () => {
  it("sets chosen targets equal to the source ability score", () => {
    const scores = applyAbilityScoreOverrides(
      {
        strength: 10,
        dexterity: 14,
        constitution: 12,
        intelligence: 18,
        wisdom: 10,
        charisma: 8,
      },
      [
        {
          id: "surge",
          type: "ability_score_override",
          targets: ["strength", "dexterity"],
          sourceAbility: "intelligence",
          chooseOneTarget: true,
        },
      ],
    )
    expect(scores.strength).toBe(18)
    expect(scores.dexterity).toBe(14)
  })
})

describe("applyHealingReceivedModifiers", () => {
  it("halves magical healing", () => {
    expect(
      applyHealingReceivedModifiers(
        20,
        [{ id: "anathema", type: "healing_received_modifier", multiplier: 0.5, magicalOnly: true }],
        { magical: true },
      ),
    ).toBe(10)
  })

  it("leaves non-magical healing alone when magicalOnly", () => {
    expect(
      applyHealingReceivedModifiers(
        20,
        [{ id: "anathema", type: "healing_received_modifier", multiplier: 0.5, magicalOnly: true }],
        { magical: false },
      ),
    ).toBe(20)
  })
})

describe("resolveFeatureChoiceCount bonuses", () => {
  it("adds Unlimited Imagination style flat bonus", () => {
    const count = resolveFeatureChoiceCount(
      { count: 1, category: "Boundless Imagination", options: [] },
      5,
      "Psion",
      undefined,
      {
        featureName: "Boundless Imagination",
        bonuses: [
          {
            id: "ui",
            type: "feature_choice_count_bonus",
            targetFeatureName: "Boundless Imagination",
            bonus: 1,
          },
        ],
      },
    )
    expect(count).toBe(2)
  })

  it("adds Skill Thief half-proficiency slots", () => {
    const count = resolveFeatureChoiceCount(
      { count: 1, category: "Adaptive Hunter", options: [] },
      9,
      "Psion",
      undefined,
      {
        featureName: "Adaptive Hunter",
        proficiencyBonus: 4,
        bonuses: [
          {
            id: "thief",
            type: "feature_choice_count_bonus",
            targetFeatureName: "Adaptive Hunter",
            bonusFrom: "half_proficiency",
          },
        ],
      },
    )
    expect(count).toBe(3)
  })
})
