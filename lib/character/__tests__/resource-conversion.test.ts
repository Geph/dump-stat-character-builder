import { describe, expect, it } from "vitest"
import { applySpellSlotToResourceRestore } from "@/lib/character/resource-conversion"

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
})
