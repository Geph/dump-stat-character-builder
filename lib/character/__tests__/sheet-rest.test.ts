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
