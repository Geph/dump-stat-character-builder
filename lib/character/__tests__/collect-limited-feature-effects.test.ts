import { describe, expect, it, vi } from "vitest"
import {
  collectFeatureRollBonuses,
  computeRollBonusAmount,
} from "@/lib/character/collect-limited-feature-effects"
import type { Feature } from "@/lib/types"

const abilityMods = {
  strength: 0,
  dexterity: 0,
  constitution: 0,
  intelligence: 0,
  wisdom: 3,
  charisma: 4,
}

describe("computeRollBonusAmount — die mode", () => {
  it("rolls a class-resource die when its current size is known", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.99) // -> max face
    const amount = computeRollBonusAmount(
      { mode: "die", dieScaling: "class_resource", classResourceKey: "superiority_dice" },
      { proficiencyBonus: 2, abilityMods, characterLevel: 5, classResourceDieSides: { superiority_dice: 8 } },
    )
    expect(amount).toBe(8)
    spy.mockRestore()
  })

  it("returns 0 when the class-resource die size isn't known (unresolved resource)", () => {
    const amount = computeRollBonusAmount(
      { mode: "die", dieScaling: "class_resource", classResourceKey: "psi_points" },
      { proficiencyBonus: 2, abilityMods, characterLevel: 5, classResourceDieSides: { superiority_dice: 8 } },
    )
    expect(amount).toBe(0)
  })

  it("rolls a fixed die (dieCount + dieType) when dieScaling is fixed or unset", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0) // -> min face on every die
    const amount = computeRollBonusAmount(
      { mode: "die", dieCount: 2, dieType: "d6" },
      { proficiencyBonus: 2, abilityMods, characterLevel: 5 },
    )
    expect(amount).toBe(2) // 1 + 1
    spy.mockRestore()
  })

  it("applies resultFloor after rolling the die", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0)
    const amount = computeRollBonusAmount(
      {
        mode: "die",
        dieScaling: "class_resource",
        classResourceKey: "superiority_dice",
        resultFloor: { mode: "fixed", fixed: 5 },
      },
      { proficiencyBonus: 2, abilityMods, characterLevel: 5, classResourceDieSides: { superiority_dice: 8 } },
    )
    expect(amount).toBe(5)
    spy.mockRestore()
  })
})

describe("collectFeatureRollBonuses — die mode end to end", () => {
  function featureWithResourceDieSaveBonus(): Feature {
    return {
      name: "Psychic Feedback",
      description: "",
      linkedModifiers: [
        {
          instanceId: "modinst_test",
          catalogRefId: "cat_fx_check_roll_modifier",
          activation: {
            effects: [
              {
                id: "mod_test",
                kind: "check_roll_modifier",
                checkRollMode: "bonus",
                checkCategory: "save",
                checkAbility: "wisdom",
                bonusConfig: {
                  mode: "die",
                  dieScaling: "class_resource",
                  classResourceKey: "psionic_energy_dice",
                },
              },
            ],
          },
        },
      ],
    } as unknown as Feature
  }

  it("adds the rolled class-resource die to a matching save", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.5) // d6 -> 4
    const result = collectFeatureRollBonuses(
      [featureWithResourceDieSaveBonus()],
      { kind: "save", ability: "wisdom" },
      {
        proficiencyBonus: 2,
        abilityMods,
        characterLevel: 5,
        classResourceDieSides: { psionic_energy_dice: 6 },
      },
    )
    expect(result.total).toBe(4)
    expect(result.sources).toContain("Psychic Feedback")
    spy.mockRestore()
  })

  it("contributes 0 when the resource's die size isn't in the map (still detected, not double-counted)", () => {
    const result = collectFeatureRollBonuses(
      [featureWithResourceDieSaveBonus()],
      { kind: "save", ability: "wisdom" },
      { proficiencyBonus: 2, abilityMods, characterLevel: 5 },
    )
    expect(result.total).toBe(0)
    expect(result.sources).toEqual([])
  })

  it("does not apply the save bonus to an unrelated ability check", () => {
    const result = collectFeatureRollBonuses(
      [featureWithResourceDieSaveBonus()],
      { kind: "ability", ability: "strength" },
      {
        proficiencyBonus: 2,
        abilityMods,
        characterLevel: 5,
        classResourceDieSides: { psionic_energy_dice: 6 },
      },
    )
    expect(result.total).toBe(0)
  })
})
