import { describe, expect, it } from "vitest"
import {
  appendInlineCharacteristicsAsLinked,
  linkedModifierDisplayName,
  MIGRATED_INLINE_CATALOG_ID,
  readLinkedModifiers,
} from "@/lib/compendium/linked-modifiers"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import { buildDefaultModifierCatalog } from "@/lib/compendium/modifier-catalog"

const speedBonus = (id: string, value: number): CharacteristicModifier =>
  ({
    id,
    type: "speed",
    speedType: "walk",
    mode: "add",
    value,
  }) as unknown as CharacteristicModifier

describe("appendInlineCharacteristicsAsLinked", () => {
  it("migrates inline characteristics into typed catalog-linked instances", () => {
    const linked = appendInlineCharacteristicsAsLinked([], [speedBonus("mod_1", 5)])
    expect(linked).toHaveLength(1)
    expect(linked[0]?.catalogRefId).toBe("cat_char_speed")
    expect((linked[0]?.characteristics?.[0] as { value?: number })?.value).toBe(5)
  })

  it("does not duplicate when the type is already linked", () => {
    const first = appendInlineCharacteristicsAsLinked([], [speedBonus("mod_1", 5)])
    const second = appendInlineCharacteristicsAsLinked(first, [speedBonus("mod_2", 10)])
    expect(second).toHaveLength(1)
  })

  it("leaves a legacy migrated-inline blob untouched", () => {
    const legacy = [
      {
        instanceId: "modinst_legacy",
        catalogRefId: MIGRATED_INLINE_CATALOG_ID,
        characteristics: [speedBonus("mod_1", 5)],
      },
    ]
    const next = appendInlineCharacteristicsAsLinked(legacy, [speedBonus("mod_2", 10)])
    expect(next).toHaveLength(1)
    expect(next[0]?.catalogRefId).toBe(MIGRATED_INLINE_CATALOG_ID)
  })
})

describe("linkedModifierDisplayName", () => {
  it("uses catalog entry names when available", () => {
    const catalog = buildDefaultModifierCatalog()
    const name = linkedModifierDisplayName(
      {
        instanceId: "a",
        catalogRefId: "cat_char_special_attack",
        characteristics: [],
      },
      catalog,
    )
    expect(name).toBe("Special Attack")
  })

  it("labels legacy migrated-inline by characteristic type", () => {
    const name = linkedModifierDisplayName(
      {
        instanceId: "a",
        catalogRefId: MIGRATED_INLINE_CATALOG_ID,
        characteristics: [
          {
            id: "m1",
            type: "special_attack",
            attackName: "Mind Leech",
            attackProfile: "force_save",
            properties: [],
            damageTypes: ["Psychic"],
            damageDiceCount: 1,
            damageDieType: "d6",
          } as CharacteristicModifier,
        ],
      },
      [],
    )
    expect(name).toBe("Special Attack")
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
    expect(linked.some((item) => item.catalogRefId === "cat_char_attack_roll" || item.catalogRefId === MIGRATED_INLINE_CATALOG_ID)).toBe(
      true,
    )
  })
})
