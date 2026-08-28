import { describe, expect, it } from "vitest"
import { collectAsiPoolsFromFeat } from "@/lib/character/feat-asi-pools"
import {
  averageHpGain,
  buildLevelUpStandardizedNotes,
  collectFeatureScalingImprovements,
  proficiencyBonusAtLevel,
  rolledHpGain,
} from "@/lib/character/level-up-improvements"
import { buildLevelUpPlan } from "@/lib/character/level-up-plan"
import { asiPool } from "@/lib/compendium/feat-modifier-presets"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import type { DndClass, Feat, Feature } from "@/lib/types"

describe("level-up improvements", () => {
  it("computes proficiency bonus by total level", () => {
    expect([1, 4, 5, 8, 9, 12, 13, 16, 17, 20].map(proficiencyBonusAtLevel)).toEqual([
      2, 2, 3, 3, 4, 4, 5, 5, 6, 6,
    ])
  })

  it("notes proficiency bonus increases at the right levels", () => {
    expect(buildLevelUpStandardizedNotes({ fromTotalLevel: 4, toTotalLevel: 5 })).toEqual([
      expect.objectContaining({
        id: "proficiency_bonus",
        detail: "Increases from +2 to +3.",
      }),
    ])
    expect(buildLevelUpStandardizedNotes({ fromTotalLevel: 3, toTotalLevel: 4 })).toEqual([])
  })

  it("computes average and rolled HP gains", () => {
    expect(averageHpGain(10, 2)).toBe(8)
    expect(rolledHpGain(10, 2, 1)).toBe(3)
    expect(rolledHpGain(10, -2, 1)).toBe(1)
  })

  it("explains Critical Shot crit-range improvements at levels 9 and 17", () => {
    const criticalShot = {
      name: "Critical Shot",
      level: 2,
      description: "",
      linkedModifiers: [
        {
          instanceId: "crit",
          catalogRefId: "cat_char_attack_roll_modifiers",
          characteristics: [
            {
              id: "mod_crit",
              type: "attack_roll_modifiers",
              entries: [
                {
                  bonus: 0,
                  target: "ranged",
                  criticalHitMinimum: 19,
                  criticalHitMinimumByLevel: [
                    { level: 9, mode: "fixed", fixed: 18 },
                    { level: 17, mode: "fixed", fixed: 17 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    } as Feature

    expect(collectFeatureScalingImprovements([criticalShot], 8, 9, "class")).toEqual([
      expect.objectContaining({
        name: "Critical Shot",
        detail: "Critical hits with ranged weapons improve from 19–20 to 18–20.",
      }),
    ])
    expect(collectFeatureScalingImprovements([criticalShot], 16, 17, "class")).toEqual([
      expect.objectContaining({
        name: "Critical Shot",
        detail: "Critical hits with ranged weapons improve from 18–20 to 17–20.",
      }),
    ])
    expect(collectFeatureScalingImprovements([criticalShot], 7, 8, "class")).toEqual([])
  })
})

describe("collectAsiPoolsFromFeat", () => {
  it("reads asi_pool from linked modifiers", () => {
    const feat = {
      id: "observant",
      name: "Observant",
      linkedModifiers: [asiPool("modinst_obs", 1, "+1 Int or Wis", ["intelligence", "wisdom"])],
    } as Feat
    const grants = collectAsiPoolsFromFeat(feat, "feat:observant")
    expect(grants).toHaveLength(1)
    expect(grants[0]).toMatchObject({
      points: 1,
      allowedAbilities: ["intelligence", "wisdom"],
    })
  })

  it("falls back to a 2-point pool for the ASI feat", () => {
    const feat = { id: "asi", name: "Ability Score Improvement" } as Feat
    expect(collectAsiPoolsFromFeat(feat, "feat:asi")).toEqual([
      expect.objectContaining({ points: 2, label: "Ability Score Improvement" }),
    ])
  })

  it("resolves catalog-only asi_pool refs so half-feats still allocate", () => {
    const feat = {
      id: "observant",
      name: "Observant",
      modifierRefs: ["cat_asi"],
    } as Feat
    const grants = collectAsiPoolsFromFeat(feat, "feat:class:L4:Ability Score Improvement", [
      {
        id: "cat_asi",
        name: "Ability scores",
        characteristics: [
          {
            id: "mod_obs",
            type: "ability_scores",
            mode: "asi_pool",
            points: 1,
            allowedAbilities: ["intelligence", "wisdom"],
          },
        ],
      } as never,
    ])
    expect(grants).toEqual([
      expect.objectContaining({
        points: 1,
        allowedAbilities: ["intelligence", "wisdom"],
        allocationKey: expect.stringContaining("feat:class:L4:Ability Score Improvement::ref::"),
      }),
    ])
  })
})

describe("buildLevelUpPlan standardized notes and hit die", () => {
  function feature(name: string, level: number, extra: Partial<Feature> = {}): Feature {
    return { name, level, description: "", ...extra } as Feature
  }

  it("exposes hit die and PB note when crossing level 5", () => {
    const entry = {
      row: { class_id: "fighter", level: 4, subclass_id: null, order: 0 },
      class: {
        id: "fighter",
        name: "Fighter",
        hit_die: 10,
        features: [feature("Ability Score Improvement", 4), feature("Extra Attack", 5)],
      } as DndClass,
      subclass: null,
    } as CharacterClassDetail
    const plan = buildLevelUpPlan({
      entry,
      subclasses: [],
      currentTotalLevel: 4,
      featureChoicePicks: {},
    })
    expect(plan?.hitDie).toBe(10)
    expect(plan?.toLevel).toBe(5)
    expect(plan?.standardizedNotes.some((note) => note.id === "proficiency_bonus")).toBe(true)
    expect(plan?.newFeatures.some((feature) => feature.name === "Extra Attack")).toBe(true)
    expect(plan?.featureImprovements).toEqual([])
  })

  it("surfaces Critical Shot improvement on Gunslinger 8 → 9", () => {
    const entry = {
      row: { class_id: "gunslinger", level: 8, subclass_id: null, order: 0 },
      class: {
        id: "gunslinger",
        name: "Gunslinger",
        hit_die: 8,
        features: [
          feature("Critical Shot", 2, {
            linkedModifiers: [
              {
                instanceId: "crit",
                catalogRefId: "cat_char_attack_roll_modifiers",
                characteristics: [
                  {
                    id: "mod_crit",
                    type: "attack_roll_modifiers",
                    entries: [
                      {
                        bonus: 0,
                        target: "ranged",
                        criticalHitMinimum: 19,
                        criticalHitMinimumByLevel: [
                          { level: 9, mode: "fixed", fixed: 18 },
                          { level: 17, mode: "fixed", fixed: 17 },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          }),
        ],
      } as DndClass,
      subclass: null,
    } as CharacterClassDetail
    const plan = buildLevelUpPlan({
      entry,
      subclasses: [],
      currentTotalLevel: 8,
      featureChoicePicks: {},
    })
    expect(plan?.newFeatures).toEqual([])
    expect(plan?.featureImprovements).toEqual([
      expect.objectContaining({
        name: "Critical Shot",
        detail: "Critical hits with ranged weapons improve from 19–20 to 18–20.",
      }),
    ])
    expect(plan?.standardizedNotes.some((note) => note.id === "proficiency_bonus")).toBe(true)
  })
})
