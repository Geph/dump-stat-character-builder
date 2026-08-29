import { describe, expect, it } from "vitest"
import {
  applyHitPointRefund,
  applyHitPointSpend,
  hitPointCostForSpellLevel,
  isHitPointsResourceKey,
  MARTYR_HIT_POINT_SPELLCASTING_COSTS,
  withMartyrHitPointSpellcasting,
} from "@/lib/character/hit-point-spend"
import type { ClassSpellcastingConfig } from "@/lib/types"

describe("hit-point spend", () => {
  it("recognizes reserved HP resource keys", () => {
    expect(isHitPointsResourceKey("hit_points")).toBe(true)
    expect(isHitPointsResourceKey("current_hp")).toBe(true)
    expect(isHitPointsResourceKey("spell_uses")).toBe(false)
  })

  it("subtracts from current HP and floors at 0 without touching temp HP", () => {
    expect(applyHitPointSpend(12, 10)).toBe(2)
    expect(applyHitPointSpend(8, 10)).toBe(0)
    expect(applyHitPointSpend(20, 0)).toBe(20)
  })

  it("refunds HP up to max", () => {
    expect(applyHitPointRefund(2, 10, 30)).toBe(12)
    expect(applyHitPointRefund(28, 10, 30)).toBe(30)
  })

  it("reads the Martyr Hit Point Spellcasting table including string keys", () => {
    expect(hitPointCostForSpellLevel(MARTYR_HIT_POINT_SPELLCASTING_COSTS, 1)).toBe(5)
    expect(hitPointCostForSpellLevel(MARTYR_HIT_POINT_SPELLCASTING_COSTS, 5)).toBe(45)
    expect(hitPointCostForSpellLevel({ "5": 45 }, 5)).toBe(45)
    expect(hitPointCostForSpellLevel(MARTYR_HIT_POINT_SPELLCASTING_COSTS, 0)).toBe(0)
  })

  it("injects the Martyr table onto ability-only spellcasting", () => {
    const next = withMartyrHitPointSpellcasting({
      name: "Martyr",
      spellcasting: { ability: "Wisdom" } as ClassSpellcastingConfig,
    })
    expect(next.spellcasting?.hit_point_cost_by_level).toEqual(MARTYR_HIT_POINT_SPELLCASTING_COSTS)
  })
})
