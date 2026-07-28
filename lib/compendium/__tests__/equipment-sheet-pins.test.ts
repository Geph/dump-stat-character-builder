import { describe, expect, it } from "vitest"
import type { Equipment } from "@/lib/types"
import {
  matchesEquipmentSheetFilter,
  orderEquipmentWithPins,
} from "@/lib/compendium/equipment-display"

function item(overrides: Partial<Equipment> & Pick<Equipment, "id" | "name">): Equipment {
  return {
    category: "Adventuring Gear",
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
  } as unknown as Equipment
}

describe("equipment sheet pins and filters", () => {
  it("orders pinned equipment to the top", () => {
    const items = [
      item({ id: "a", name: "Amulet", category: "Adventuring Gear" }),
      item({ id: "b", name: "Longsword", category: "Weapon" }),
      item({ id: "c", name: "Shield", category: "Armor", subcategory: "Shield" }),
    ]
    expect(orderEquipmentWithPins(items, ["b", "c"]).map((row) => row.id)).toEqual([
      "b",
      "c",
      "a",
    ])
  })

  it("matches category filters including magic and pinned", () => {
    const sword = item({ id: "sword", name: "Sword", category: "Weapon" })
    const magicSword = item({
      id: "magic-sword",
      name: "+1 Sword",
      category: "Weapon",
      rarity: "Uncommon",
      requires_attunement: true,
    })
    const pack = item({ id: "pack", name: "Explorer's Pack", category: "Adventuring Gear" })
    const armor = item({ id: "mail", name: "Chain Mail", category: "Armor" })

    expect(matchesEquipmentSheetFilter(armor, "armor")).toBe(true)
    expect(matchesEquipmentSheetFilter(sword, "weapons")).toBe(true)
    expect(matchesEquipmentSheetFilter(pack, "adventuring_gear")).toBe(true)
    expect(matchesEquipmentSheetFilter(magicSword, "magic")).toBe(true)
    expect(matchesEquipmentSheetFilter(sword, "magic")).toBe(false)
    expect(matchesEquipmentSheetFilter(sword, "pinned", ["sword"])).toBe(true)
    expect(matchesEquipmentSheetFilter(sword, "pinned", [])).toBe(false)
  })
})
