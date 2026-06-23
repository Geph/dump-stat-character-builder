import { describe, expect, it } from "vitest"
import {
  appendInlineCharacteristicsAsLinked,
  MIGRATED_INLINE_CATALOG_ID,
  readLinkedModifiers,
} from "@/lib/compendium/linked-modifiers"

describe("appendInlineCharacteristicsAsLinked", () => {
  it("migrates inline characteristics into a linked instance", () => {
    const linked = appendInlineCharacteristicsAsLinked([], [
      { id: "mod_1", type: "speed", mode: "flat_bonus", flatBonus: 5 },
    ])
    expect(linked).toHaveLength(1)
    expect(linked[0]?.catalogRefId).toBe(MIGRATED_INLINE_CATALOG_ID)
    expect(linked[0]?.characteristics?.[0]?.flatBonus).toBe(5)
  })

  it("does not duplicate when already migrated", () => {
    const first = appendInlineCharacteristicsAsLinked([], [
      { id: "mod_1", type: "speed", mode: "flat_bonus", flatBonus: 5 },
    ])
    const second = appendInlineCharacteristicsAsLinked(first, [
      { id: "mod_2", type: "speed", mode: "flat_bonus", flatBonus: 10 },
    ])
    expect(second).toHaveLength(1)
  })
})

describe("readLinkedModifiers inline migration", () => {
  it("includes feat benefits as linked characteristics", () => {
    const linked = readLinkedModifiers(
      {
        benefits: [{ id: "mod_archery", type: "attack_roll", mode: "flat_bonus", flatBonus: 2, subcategory: "Ranged" }],
      },
      [],
    )
    expect(linked.some((item) => item.catalogRefId === MIGRATED_INLINE_CATALOG_ID)).toBe(true)
  })
})
