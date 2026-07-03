import { describe, expect, it } from "vitest"
import { getEffectiveRechargeRules } from "@/lib/compendium/normalize-uses-config"
import type { UsesConfig } from "@/lib/types"

describe("getEffectiveRechargeRules", () => {
  it("upgrades quarry recharge at level 10 (Tireless)", () => {
    const uses: UsesConfig = {
      type: "ability_modifier",
      abilityModifier: "WIS",
      recharges: [{ rest: "short_rest", amount: 1 }, { rest: "long_rest" }],
      rechargeOverrides: [
        {
          atClassLevel: 10,
          recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
        },
      ],
    }
    expect(getEffectiveRechargeRules(uses, 6)).toEqual([
      { rest: "short_rest", amount: 1 },
      { rest: "long_rest" },
    ])
    expect(getEffectiveRechargeRules(uses, 10)).toEqual([
      { rest: "short_rest" },
      { rest: "long_rest" },
    ])
  })
})
