import { describe, expect, it } from "vitest"
import type { Equipment } from "@/lib/types"
import {
  equipmentRequiresAttunement,
  isAttunableItem,
  isMagicItem,
  mustAttuneBeforeEquip,
} from "@/lib/compendium/equipment-attunement"

function item(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: "test-item",
    name: "Test Item",
    category: "Weapon",
    subcategory: null,
    cost: null,
    weight: null,
    properties: null,
    description: null,
    icon: null,
    source: "test",
    creator_url: null,
    created_at: "",
    ...overrides,
  } as unknown as unknown as Equipment
}

describe("isMagicItem", () => {
  it("detects structured magic fields", () => {
    expect(isMagicItem(item({ rarity: "Rare" }))).toBe(true)
    expect(isMagicItem(item({ magic_item_category: "Weapon" }))).toBe(true)
    expect(isMagicItem(item({ requires_attunement: false }))).toBe(true)
  })

  it("detects attunement in description", () => {
    expect(
      isMagicItem(
        item({
          description: "You gain a +1 bonus. Requires attunement.",
        }),
      ),
    ).toBe(true)
  })

  it("treats mundane gear as non-magic", () => {
    expect(isMagicItem(item({ name: "Longsword", category: "Weapon" }))).toBe(false)
    expect(isMagicItem(item({ name: "Chain Mail", category: "Armor" }))).toBe(false)
  })
})

describe("equipmentRequiresAttunement", () => {
  it("respects explicit requires_attunement flag", () => {
    expect(equipmentRequiresAttunement(item({ requires_attunement: true }))).toBe(true)
    expect(equipmentRequiresAttunement(item({ requires_attunement: false }))).toBe(false)
  })

  it("parses requires attunement from description", () => {
    expect(
      equipmentRequiresAttunement(
        item({ description: "Requires attunement by a spellcaster." }),
      ),
    ).toBe(true)
  })
})

describe("mustAttuneBeforeEquip", () => {
  it("requires attunement before equipping magic weapons and armor", () => {
    const magicSword = item({
      name: "+1 Longsword",
      category: "Weapon",
      rarity: "Uncommon",
      requires_attunement: true,
    })
    expect(mustAttuneBeforeEquip(magicSword)).toBe(true)
    expect(isAttunableItem(magicSword)).toBe(true)
  })

  it("does not block mundane equipment", () => {
    expect(mustAttuneBeforeEquip(item({ category: "Weapon", name: "Longsword" }))).toBe(false)
  })

  it("does not require equip attunement for non-wearable magic items", () => {
    expect(
      mustAttuneBeforeEquip(
        item({
          category: "Adventuring Gear",
          magic_item_category: "Potion",
          rarity: "Common",
          name: "Potion of Healing",
          requires_attunement: false,
        }),
      ),
    ).toBe(false)
  })
})
