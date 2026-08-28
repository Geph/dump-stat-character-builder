import { describe, expect, it } from "vitest"
import type { Feature } from "@/lib/types"
import {
  actionEconomyKindFromCastingTime,
  attacksPerAttackAction,
  characterCanRollHitDiceOutsideShortRest,
  emptyActionEconomySpent,
} from "@/lib/character/action-economy"

describe("action-economy", () => {
  it("starts with nothing spent", () => {
    expect(emptyActionEconomySpent()).toEqual({
      action: false,
      bonus: false,
      reaction: false,
    })
  })

  it("maps casting time and Quickened to economy kinds", () => {
    expect(actionEconomyKindFromCastingTime("1 Action")).toBe("action")
    expect(actionEconomyKindFromCastingTime("1 Bonus Action")).toBe("bonus")
    expect(actionEconomyKindFromCastingTime("1 Reaction")).toBe("reaction")
    expect(actionEconomyKindFromCastingTime("1 Action", { quickened: true })).toBe("bonus")
  })

  it("counts base Extra Attack effects but not conditional extra attacks", () => {
    const features = [
      {
        linkedModifiers: [
          {
            activation: {
              effects: [{ kind: "extra_attack", extraAttackCount: 2 }],
            },
          },
        ],
      },
      {
        linkedModifiers: [
          {
            activation: {
              effects: [
                {
                  kind: "extra_attack",
                  extraAttackCount: 1,
                  label: "Horde Breaker: attack a different nearby creature",
                },
              ],
            },
          },
        ],
      },
    ]
    expect(attacksPerAttackAction(features as unknown as Feature[])).toBe(3)
    expect(attacksPerAttackAction([])).toBe(1)
  })

  it("gates mid-combat Hit Dice heal behind Resilient / Durable style feats", () => {
    expect(characterCanRollHitDiceOutsideShortRest({ featNames: [] })).toBe(false)
    expect(characterCanRollHitDiceOutsideShortRest({ featNames: ["Resilient"] })).toBe(true)
    expect(characterCanRollHitDiceOutsideShortRest({ featNames: ["Durable"] })).toBe(true)
    expect(
      characterCanRollHitDiceOutsideShortRest({
        featureNames: ["Spend Hit Dice as an Action"],
      }),
    ).toBe(true)
  })
})
