import { describe, expect, it } from "vitest"
import { deriveClassResourceDisplay, shouldShowClassResourceOnSheet } from "@/lib/compendium/class-resource-display"
import type { ClassResource } from "@/lib/types"

const emptySpendKeys = new Set<string>()

describe("deriveClassResourceDisplay", () => {
  it("marks Rage as tracker when it has recharges", () => {
    const rage: ClassResource = {
      id: "rage",
      name: "Rage",
      uses: {
        type: "at_level",
        atLevelMode: "tier",
        recharges: [{ rest: "long_rest" }],
        atLevelTable: [{ level: 1, count: 2 }],
      },
    }
    expect(deriveClassResourceDisplay(rage, emptySpendKeys)).toBe("tracker")
  })

  it("marks exploits_known as static without recharges", () => {
    const exploitsKnown: ClassResource = {
      id: "exploits_known",
      name: "Exploits Known",
      uses: {
        type: "special",
        specialDescription: "Known exploits cap",
        atLevelTable: [{ level: 1, count: 3 }],
        atLevelMode: "tier",
      },
    }
    expect(deriveClassResourceDisplay(exploitsKnown, emptySpendKeys)).toBe("static")
  })

  it("always hides exploit_die_size", () => {
    const dieSize: ClassResource = {
      id: "exploit_die_size",
      name: "Exploit Die",
      uses: {
        type: "special",
        specialDescription: "Die size lookup",
        atLevelTable: [{ level: 1, count: 8 }],
        dieType: "d8",
      },
    }
    expect(deriveClassResourceDisplay(dieSize, emptySpendKeys)).toBe("hidden")
  })

  it("marks psi_limit as static", () => {
    const psiLimit: ClassResource = {
      id: "psi_limit",
      name: "Psi Limit",
      uses: {
        type: "special",
        specialDescription: "Per-power cap",
        atLevelTable: [{ level: 1, count: 2 }],
        atLevelMode: "tier",
      },
    }
    expect(deriveClassResourceDisplay(psiLimit, emptySpendKeys)).toBe("static")
  })

  it("defaults ambiguous at_level without recharges to static", () => {
    const counter: ClassResource = {
      id: "custom_cap",
      name: "Custom Cap",
      uses: {
        type: "at_level",
        atLevelMode: "tier",
        atLevelTable: [{ level: 1, count: 4 }],
      },
    }
    expect(deriveClassResourceDisplay(counter, emptySpendKeys)).toBe("static")
  })

  it("marks spend-referenced resources as tracker even without recharges on the row", () => {
    const pool: ClassResource = {
      id: "custom_pool",
      name: "Custom Pool",
      uses: { type: "fixed", fixedAmount: 3 },
    }
    expect(deriveClassResourceDisplay(pool, new Set(["custom_pool"]))).toBe("tracker")
  })

  it("respects explicit display override", () => {
    const pool: ClassResource = {
      id: "rage",
      name: "Rage",
      display: "hidden",
      uses: {
        type: "at_level",
        recharges: [{ rest: "long_rest" }],
        atLevelTable: [{ level: 1, count: 2 }],
      },
    }
    expect(deriveClassResourceDisplay(pool, emptySpendKeys)).toBe("hidden")
  })
})

describe("shouldShowClassResourceOnSheet", () => {
  it("shows fighter class resources in the Resources column", () => {
    expect(shouldShowClassResourceOnSheet("second_wind", emptySpendKeys)).toBe(true)
  })

  it("gates superiority dice to subclasses that spend them", () => {
    expect(shouldShowClassResourceOnSheet("superiority_dice", emptySpendKeys)).toBe(false)
    expect(shouldShowClassResourceOnSheet("superiority_dice", new Set(["superiority_dice"]))).toBe(
      true,
    )
  })
})
