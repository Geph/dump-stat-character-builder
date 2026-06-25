import { describe, expect, it } from "vitest"
import type { Equipment } from "@/lib/types"
import { getMagicEffectScope } from "@/lib/compendium/equipment-magic"
import { resolveEffectiveEquipment } from "@/lib/compendium/resolve-effective-equipment"

function item(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: "item-id",
    name: "Item",
    category: "Weapon",
    subcategory: "Simple Melee Weapons",
    cost: null,
    weight: null,
    properties: null,
    description: null,
    icon: null,
    source: "test",
    creator_url: null,
    created_at: "",
    ...overrides,
  }
}

describe("resolveEffectiveEquipment", () => {
  const longsword = item({
    id: "longsword-id",
    name: "Longsword",
    category: "Weapon",
    subcategory: "Martial Melee Weapons",
    properties: {
      damage: "1d8 Slashing",
      mastery: "Sap",
    } as Equipment["properties"],
  })

  it("returns mundane items unchanged", () => {
    expect(resolveEffectiveEquipment(longsword, [longsword])).toEqual(longsword)
  })

  it("inherits weapon stats from selected base", () => {
    const plusOne = item({
      id: "plus-one-id",
      name: "+1 Longsword",
      rarity: "Uncommon",
      magic_item_category: "Weapon",
      requires_attunement: true,
      base_equipment_ids: [longsword.id],
      selected_base_equipment_id: longsword.id,
      properties: {},
    })

    const resolved = resolveEffectiveEquipment(plusOne, [longsword, plusOne])
    expect(resolved.name).toBe("+1 Longsword")
    expect(resolved.damage).toBeUndefined()
    expect(resolved.properties).toMatchObject({ damage: "1d8 Slashing", mastery: "Sap" })
    expect(resolved.requires_attunement).toBe(true)
  })

  it("resolves filter-based magic weapons from catalog", () => {
    const generic = item({
      id: "generic-plus-one",
      name: "+1 Weapon",
      rarity: "Uncommon",
      magic_item_category: "Weapon",
      base_equipment_filter: "any_melee_weapon",
    })

    const resolved = resolveEffectiveEquipment(generic, [longsword, generic])
    expect(resolved.selected_base_equipment_id).toBe(longsword.id)
    expect(resolved.properties).toMatchObject({ damage: "1d8 Slashing" })
  })
})

describe("getMagicEffectScope", () => {
  it("scopes modifiers by equipment kind", () => {
    expect(getMagicEffectScope(item({ category: "Weapon" }))).toBe("wielded")
    expect(getMagicEffectScope(item({ category: "Armor", subcategory: "Heavy Armor" }))).toBe("worn")
    expect(
      getMagicEffectScope(
        item({ category: "Adventuring Gear", magic_item_category: "Ring", rarity: "Rare" }),
      ),
    ).toBe("attuned")
  })
})
