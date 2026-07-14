import { describe, expect, it } from "vitest"
import { formatRollBonusSummary } from "@/lib/compendium/roll-bonus-config"

describe("formatRollBonusSummary — die mode", () => {
  it("falls back to a bare resource-key label when the die size isn't known", () => {
    expect(
      formatRollBonusSummary({
        mode: "die",
        dieScaling: "class_resource",
        classResourceKey: "superiority_dice",
      }),
    ).toBe("superiority_dice die")
  })

  it("resolves to real dice notation when the current die size is provided", () => {
    expect(
      formatRollBonusSummary(
        { mode: "die", dieScaling: "class_resource", classResourceKey: "superiority_dice" },
        { classResourceDieSides: { superiority_dice: 10 } },
      ),
    ).toBe("1d10 (superiority_dice die)")
  })

  it("respects an explicit dieCount for class-resource dice", () => {
    expect(
      formatRollBonusSummary(
        { mode: "die", dieScaling: "class_resource", classResourceKey: "exploit_dice", dieCount: 2 },
        { classResourceDieSides: { exploit_dice: 8 } },
      ),
    ).toBe("2d8 (exploit_dice die)")
  })

  it("still formats fixed-size dice unaffected by the resolver", () => {
    expect(formatRollBonusSummary({ mode: "die", dieCount: 1, dieType: "d8" })).toBe("1d8")
  })
})
