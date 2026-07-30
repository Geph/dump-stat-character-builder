import { describe, expect, it } from "vitest"
import {
  bankBalanceOfPower,
  balanceOfPowerCap,
  currentBalanceOfPower,
  spendBalanceOfPower,
} from "@/lib/character/balance-of-power"
import { perfectedEnhancementBonus } from "@/lib/character/perfected-enhancement"
import { resolveFeatureChoiceOptions } from "@/lib/builder/aggregate-psionic-talents"
import type { Feature } from "@/lib/types"

describe("balance of power", () => {
  it("banks up to level cap and spends the pool", () => {
    let accumulated = bankBalanceOfPower({
      accumulated: {},
      amount: 4,
      max: balanceOfPowerCap(5),
    })
    expect(currentBalanceOfPower(accumulated)).toBe(4)
    accumulated = bankBalanceOfPower({
      accumulated,
      amount: 3,
      max: 5,
    })
    expect(currentBalanceOfPower(accumulated)).toBe(5)
    const spent = spendBalanceOfPower({ accumulated })
    expect(spent.spent).toBe(5)
    expect(currentBalanceOfPower(spent.accumulated)).toBe(0)
  })
})

describe("perfected enhancement", () => {
  it("returns PB when the subclass feature is known", () => {
    expect(
      perfectedEnhancementBonus({
        classDetails: [
          {
            row: { id: "r1", level: 6 } as never,
            class: { name: "Psion", features: [] } as never,
            subclass: {
              name: "Transcended Mind",
              features: [{ name: "Perfected Enhancement", level: 6 }],
            } as never,
          },
        ],
        proficiencyBonus: 3,
      }),
    ).toBe(3)
  })
})

describe("feature_choice_option_grant merge", () => {
  it("adds Horrifying Nightmare to Boundless Imagination options", () => {
    const feature = {
      name: "Boundless Imagination",
      choices: {
        category: "Boundless Imagination",
        count: 1,
        options: [{ name: "Devastating Weapons", description: "1d12" }],
      },
    } as Feature
    const options = resolveFeatureChoiceOptions(feature, {
      customAbilities: [],
      featureChoicePicks: {},
      classNames: ["Psion"],
      optionGrants: [
        {
          id: "g1",
          type: "feature_choice_option_grant",
          targetFeatureName: "Boundless Imagination",
          options: [
            {
              name: "Horrifying Nightmare",
              description: "Frighten nearby creatures.",
            },
          ],
        },
      ],
    })
    expect(options.map((o) => o.name)).toEqual(["Devastating Weapons", "Horrifying Nightmare"])
  })
})
