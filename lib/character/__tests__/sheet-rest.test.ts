import { describe, expect, it } from "vitest"
import {
  applyInitiativeResourceRecharge,
  applySheetRest,
  applyUsesRest,
  shouldResetSpellSlotsOnRest,
} from "@/lib/character/sheet-rest"
import type { SpellSlotTable } from "@/lib/compendium/spell-slots"
import type { ResourceTrackerEntry } from "@/components/character-sheet/resource-uses-tracker"

const resolveContext = {
  proficiencyBonus: 2,
  abilityModifiers: {
    STR: 0,
    DEX: 0,
    CON: 0,
    INT: 0,
    WIS: 0,
    CHA: 0,
  },
}

describe("shouldResetSpellSlotsOnRest", () => {
  const fullTable: SpellSlotTable = {
    type: "full",
    slotsByLevel: [4, 2, 0, 0, 0, 0, 0, 0, 0],
    className: "Wizard",
    classLevel: 3,
  }

  const pactTable: SpellSlotTable = {
    type: "pact",
    slotsByLevel: [0, 0, 2, 0, 0, 0, 0, 0, 0],
    pactSlotLevel: 3,
    className: "Warlock",
    classLevel: 5,
  }

  it("restores full caster slots only on long rest", () => {
    expect(shouldResetSpellSlotsOnRest(fullTable, "short_rest")).toBe(false)
    expect(shouldResetSpellSlotsOnRest(fullTable, "long_rest")).toBe(true)
  })

  it("restores pact slots on short or long rest", () => {
    expect(shouldResetSpellSlotsOnRest(pactTable, "short_rest")).toBe(true)
    expect(shouldResetSpellSlotsOnRest(pactTable, "long_rest")).toBe(true)
  })
})

describe("applyUsesRest", () => {
  it("fully restores when recharge has no amount", () => {
    const uses = { type: "fixed" as const, fixedAmount: 2, recharges: [{ rest: "short_rest" as const }] }
    expect(applyUsesRest(2, uses, "short_rest", 2).used).toBe(0)
    expect(applyUsesRest(2, uses, "long_rest", 2).used).toBe(2)
  })

  it("partially restores when recharge amount is set", () => {
    const uses = {
      type: "fixed" as const,
      fixedAmount: 4,
      recharges: [{ rest: "short_rest" as const, amount: 2 }],
    }
    expect(applyUsesRest(4, uses, "short_rest", 4).used).toBe(2)
  })

  it("restores on initiative when rechargeOnInitiative is set", () => {
    const full = {
      type: "fixed" as const,
      fixedAmount: 3,
      rechargeOnInitiative: true,
    }
    expect(applyUsesRest(3, full, "initiative", 3).used).toBe(0)

    const partial = {
      type: "fixed" as const,
      fixedAmount: 4,
      rechargeOnInitiative: 2,
    }
    expect(applyUsesRest(4, partial, "initiative", 4).used).toBe(2)
  })

  it("applies formula recharge with long-rest cadence cap", () => {
    const uses = {
      type: "fixed" as const,
      fixedAmount: 8,
      recharges: [
        {
          rest: "short_rest" as const,
          amountFormula: "half_class_level_round_up" as const,
          maxPerLongRest: 1,
        },
      ],
    }
    const first = applyUsesRest(8, uses, "short_rest", 8, { classLevel: 5, rechargeCapsUsed: 0 })
    expect(first.used).toBe(5)
    expect(first.rechargeCapsUsed).toBe(1)

    const blocked = applyUsesRest(first.used, uses, "short_rest", 8, {
      classLevel: 5,
      rechargeCapsUsed: 1,
    })
    expect(blocked.used).toBe(5)
    expect(blocked.rechargeCapsUsed).toBeUndefined()
  })

  it("stacks a base short-rest regain with a capped bonus regain", () => {
    // Alchemist Reagents: 1 back on every Short Rest, plus Reagent Synthesis (INT mod, 1/long).
    const uses = {
      type: "at_level" as const,
      atLevelMode: "tier" as const,
      atLevelTable: [{ level: 1, count: 10 }],
      recharges: [
        { rest: "short_rest" as const, amount: 1 },
        {
          rest: "short_rest" as const,
          amountFormula: "ability_modifier" as const,
          amountFormulaAbility: "INT" as const,
          maxPerLongRest: 1,
        },
        { rest: "long_rest" as const },
      ],
    }
    const abilityModifiers = { int: 3 }

    const first = applyUsesRest(10, uses, "short_rest", 10, {
      classLevel: 5,
      rechargeCapsUsed: 0,
      abilityModifiers,
    })
    expect(first.used).toBe(6)
    expect(first.rechargeCapsUsed).toBe(1)

    // Synthesis is spent, but the base 1-per-short-rest regain keeps working.
    const second = applyUsesRest(first.used, uses, "short_rest", 10, {
      classLevel: 5,
      rechargeCapsUsed: 1,
      abilityModifiers,
    })
    expect(second.used).toBe(5)
    expect(second.rechargeCapsUsed).toBeUndefined()
  })

  it("does not spend a capped regain that had nothing to restore", () => {
    const uses = {
      type: "fixed" as const,
      fixedAmount: 6,
      recharges: [
        {
          rest: "short_rest" as const,
          amountFormula: "ability_modifier" as const,
          amountFormulaAbility: "INT" as const,
          maxPerLongRest: 1,
        },
      ],
    }
    const full = applyUsesRest(0, uses, "short_rest", 6, {
      classLevel: 5,
      rechargeCapsUsed: 0,
      abilityModifiers: { int: 3 },
    })
    expect(full.used).toBe(0)
    expect(full.rechargeCapsUsed).toBeUndefined()
  })

  it("applies class-level recharge overrides", () => {
    const uses = {
      type: "ability_modifier" as const,
      abilityModifier: "WIS" as const,
      recharges: [
        { rest: "short_rest" as const, amount: 1 },
        { rest: "long_rest" as const },
      ],
      rechargeOverrides: [
        {
          atClassLevel: 10,
          recharges: [
            { rest: "short_rest" as const },
            { rest: "long_rest" as const },
          ],
        },
      ],
    }
    expect(applyUsesRest(4, uses, "short_rest", 4, { classLevel: 9 }).used).toBe(3)
    expect(applyUsesRest(4, uses, "short_rest", 4, { classLevel: 10 }).used).toBe(0)
  })

  it("restores counted special resources instead of skipping them", () => {
    const uses = {
      type: "special" as const,
      atLevelTable: [{ level: 14, count: 2 }],
      recharges: [{ rest: "short_rest" as const }],
    }
    expect(applyUsesRest(2, uses, "short_rest", 2, { classLevel: 14 }).used).toBe(0)
  })
})

describe("applySheetRest", () => {
  const wizardTable: SpellSlotTable = {
    type: "full",
    slotsByLevel: [4, 2, 0, 0, 0, 0, 0, 0, 0],
    className: "Wizard",
    classLevel: 3,
  }

  const fighterResource: ResourceTrackerEntry = {
    id: "fighter_second_wind",
    name: "Second Wind",
    classLevel: 5,
    uses: { type: "fixed", fixedAmount: 2, recharges: [{ rest: "short_rest" }] },
  }

  const channelResource: ResourceTrackerEntry = {
    id: "cleric_channel_divinity",
    name: "Channel Divinity",
    classLevel: 5,
    uses: { type: "fixed", fixedAmount: 2, recharges: [{ rest: "long_rest" }] },
  }

  it("restores short-rest resources and pact slots only on short rest", () => {
    const result = applySheetRest({
      rest: "short_rest",
      maxHp: 30,
      activeConditions: [],
      usedSpellSlotsByKey: {
        "Wizard-full-3": [2, 1, 0, 0, 0, 0, 0, 0, 0],
        "Warlock-pact-5": [0, 0, 2, 0, 0, 0, 0, 0, 0],
      },
      spellSlotTables: [
        wizardTable,
        {
          type: "pact",
          slotsByLevel: [0, 0, 2, 0, 0, 0, 0, 0, 0],
          pactSlotLevel: 3,
          className: "Warlock",
          classLevel: 5,
        },
      ],
      usedResourcesById: {
        [fighterResource.id]: 2,
        [channelResource.id]: 2,
      },
      resourceEntries: [fighterResource, channelResource],
      usedActionUsesById: {},
      sheetActions: [],
      resolveContext,
    })

    expect(result.usedSpellSlotsByKey["Wizard-full-3"]).toEqual([2, 1, 0, 0, 0, 0, 0, 0, 0])
    expect(result.usedSpellSlotsByKey["Warlock-pact-5"]).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0])
    expect(result.usedResourcesById[fighterResource.id]).toBe(0)
    expect(result.usedResourcesById[channelResource.id]).toBe(2)
    expect(result.currentHp).toBeUndefined()
    expect(result.summary).toEqual(
      expect.arrayContaining([
        "Restored Warlock pact magic (2 slots)",
        "Restored Second Wind (2 uses)",
      ]),
    )
    expect(result.summary.some((line) => line.includes("Channel Divinity"))).toBe(false)
  })

  it("restores HP, spell slots, death saves, and long-rest resources on long rest", () => {
    const result = applySheetRest({
      rest: "long_rest",
      maxHp: 42,
      activeConditions: ["Concentration: Fireball", "Poisoned"],
      usedSpellSlotsByKey: {
        "Wizard-full-3": [4, 2, 0, 0, 0, 0, 0, 0, 0],
      },
      spellSlotTables: [wizardTable],
      usedResourcesById: {
        [fighterResource.id]: 1,
        [channelResource.id]: 2,
      },
      resourceEntries: [fighterResource, channelResource],
      usedActionUsesById: {},
      sheetActions: [],
      resolveContext,
    })

    expect(result.currentHp).toBe(42)
    expect(result.tempHp).toBe(0)
    expect(result.deathSaves).toEqual({ successes: 0, failures: 0 })
    expect(result.usedSpellSlotsByKey["Wizard-full-3"]).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0])
    expect(result.usedResourcesById[channelResource.id]).toBe(0)
    expect(result.activeConditions).toEqual(["Poisoned"])
    expect(result.summary[0]).toBe("Hit points restored to 42")
    expect(result.summary).toEqual(
      expect.arrayContaining([
        "Restored Wizard spell slots (6)",
        "Restored Channel Divinity (2 uses)",
        "Ended concentration",
      ]),
    )
  })

  it("reports when a short rest restores nothing spendable", () => {
    const result = applySheetRest({
      rest: "short_rest",
      maxHp: 20,
      activeConditions: [],
      usedSpellSlotsByKey: {},
      spellSlotTables: [wizardTable],
      usedResourcesById: {},
      resourceEntries: [channelResource],
      usedActionUsesById: {},
      sheetActions: [],
      resolveContext,
    })
    expect(result.summary).toEqual(["No short-rest resources needed restoring"])
  })
})

describe("applyInitiativeResourceRecharge", () => {
  it("recharges resources with rechargeOnInitiative", () => {
    const entries: ResourceTrackerEntry[] = [
      {
        id: "exploit_dice",
        name: "Exploit Dice",
        classLevel: 5,
        uses: { type: "fixed", fixedAmount: 3, rechargeOnInitiative: true },
      },
      {
        id: "rage",
        name: "Rage",
        classLevel: 5,
        uses: { type: "fixed", fixedAmount: 3, recharges: [{ rest: "long_rest" }] },
      },
    ]
    const next = applyInitiativeResourceRecharge(
      { exploit_dice: 3, rage: 2 },
      entries,
      resolveContext,
    )
    expect(next.exploit_dice).toBe(0)
    expect(next.rage).toBe(2)
  })
})
