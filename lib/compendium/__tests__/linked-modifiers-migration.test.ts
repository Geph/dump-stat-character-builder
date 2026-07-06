import { describe, expect, it } from "vitest"
import {
  appendInlineCharacteristicsAsLinked,
  MIGRATED_INLINE_CATALOG_ID,
  readLinkedModifiers,
} from "@/lib/compendium/linked-modifiers"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"

const speedBonus = (id: string, value: number): CharacteristicModifier =>
  ({
    id,
    type: "speed",
    speedType: "walk",
    mode: "add",
    value,
  }) as unknown as CharacteristicModifier

describe("appendInlineCharacteristicsAsLinked", () => {
  it("migrates inline characteristics into a linked instance", () => {
    const linked = appendInlineCharacteristicsAsLinked([], [speedBonus("mod_1", 5)])
    expect(linked).toHaveLength(1)
    expect(linked[0]?.catalogRefId).toBe(MIGRATED_INLINE_CATALOG_ID)
    expect((linked[0]?.characteristics?.[0] as { value?: number })?.value).toBe(5)
  })

  it("does not duplicate when already migrated", () => {
    const first = appendInlineCharacteristicsAsLinked([], [speedBonus("mod_1", 5)])
    const second = appendInlineCharacteristicsAsLinked(first, [speedBonus("mod_2", 10)])
    expect(second).toHaveLength(1)
  })
})

describe("readLinkedModifiers inline migration", () => {
  it("includes feat benefits as linked characteristics", () => {
    const linked = readLinkedModifiers(
      {
        benefits: [
          {
            id: "mod_archery",
            type: "attack_roll",
            mode: "flat_bonus",
            flatBonus: 2,
            subcategory: "Ranged",
          } as unknown as CharacteristicModifier,
        ],
      },
      [],
    )
    expect(linked.some((item) => item.catalogRefId === MIGRATED_INLINE_CATALOG_ID)).toBe(true)
  })
})
