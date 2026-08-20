import { describe, expect, it } from "vitest"
import {
  applySpellSlotToResourceRestore,
  applyResourceToResourceRestore,
  applyUsedSpellSlotToResourceRestore,
} from "@/lib/character/resource-conversion"

describe("applySpellSlotToResourceRestore", () => {
  it("spends a 1st-level slot to restore one quarry use", () => {
    const result = applySpellSlotToResourceRestore({
      slotsByLevel: [2, 1],
      minSpellLevel: 1,
      currentUses: 0,
      maxUses: 3,
      restores: 1,
    })
    expect(result.applied).toBe(true)
    expect(result.nextUses).toBe(1)
    expect(result.nextSlots[0]).toBe(1)
  })

  it("updates sheet used-count state and chooses the lowest eligible slot", () => {
    const result = applyUsedSpellSlotToResourceRestore({
      slotTotalsByLevel: [2, 1, 1],
      usedSlotsByLevel: [2, 0, 0],
      minSpellLevel: 1,
      resourceUsed: 2,
      restores: 1,
    })
    expect(result.spentSlotLevel).toBe(2)
    expect(result.nextUsedSlots).toEqual([2, 1, 0])
    expect(result.nextResourceUsed).toBe(1)
  })

  it("spends a class resource to restore a limited feature use", () => {
    const result = applyResourceToResourceRestore({
      sourceUsed: 1,
      sourceMax: 5,
      sourceAmount: 2,
      targetUsed: 1,
      targetMax: 1,
      restores: 1,
    })
    expect(result).toEqual({
      nextSourceUsed: 3,
      nextTargetUsed: 0,
      applied: true,
    })
  })
})
