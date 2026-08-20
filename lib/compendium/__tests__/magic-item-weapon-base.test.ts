import { describe, expect, it } from "vitest"
import {
  applyInferredMagicItemWeaponBases,
  inferMagicItemWeaponBaseNames,
  isWieldableWeaponItem,
} from "@/lib/compendium/magic-item-weapon-base"
import { getBaseSelectionOptions, resolveCharacterEquipment } from "@/lib/compendium/equipment-base-selection"
import { resolveEquippedItems } from "@/lib/compendium/equipment-magic-modifiers"
import { matchesEquipmentSheetFilter } from "@/lib/compendium/equipment-display"
import { mustAttuneBeforeEquip } from "@/lib/compendium/equipment-attunement"
import type { Equipment } from "@/lib/types"

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

const quarterstaff = item({
  id: "qs",
  name: "Quarterstaff",
  category: "Weapon",
  subcategory: "Simple Melee Weapons",
  damage: "1d6",
  damage_type: "Bludgeoning",
  properties: { properties: ["Versatile"], mastery: "Topple" } as unknown as Equipment["properties"],
})

const mace = item({
  id: "mace",
  name: "Mace",
  category: "Weapon",
  subcategory: "Simple Melee Weapons",
  damage: "1d6",
  damage_type: "Bludgeoning",
})

describe("inferMagicItemWeaponBaseNames", () => {
  it("treats staff-type magic items as quarterstaffs", () => {
    expect(
      inferMagicItemWeaponBaseNames({
        name: "Staff of Fire",
        magic_item_category: "Staff",
      }),
    ).toEqual(["Quarterstaff"])
  })

  it("treats Rod of Lordly Might as a mace", () => {
    expect(inferMagicItemWeaponBaseNames({ name: "Rod of Lordly Might" })).toEqual(["Mace"])
  })

  it("reads wield-as-weapon wording from descriptions", () => {
    expect(
      inferMagicItemWeaponBaseNames({
        name: "Homebrew Rod",
        description: "This rod functions as a magic Mace that grants a +1 bonus.",
      }),
    ).toEqual(["Mace"])
  })

  it("does not treat wands as weapons", () => {
    expect(
      inferMagicItemWeaponBaseNames({
        name: "Wand of Fireballs",
        magic_item_category: "Wand",
      }),
    ).toEqual([])
    expect(
      isWieldableWeaponItem({
        name: "Wand of Fireballs",
        category: "Adventuring Gear",
        magic_item_category: "Wand",
      }),
    ).toBe(false)
  })
})

describe("staff and rod combat resolution", () => {
  const staff = item({
    id: "staff-fire",
    name: "Staff of Fire",
    magic_item_category: "Staff",
    rarity: "Very Rare",
    requires_attunement: true,
  })

  it("resolves staff items onto quarterstaff weapon stats", () => {
    const resolved = resolveCharacterEquipment(staff, [quarterstaff, staff], {})
    expect(resolved.damage).toBe("1d6")
    expect(resolved.damage_type).toBe("Bludgeoning")
    expect(resolved.subcategory).toBe("Simple Melee Weapons")
  })

  it("lets an equipped staff count as the character's weapon", () => {
    const equipped = resolveEquippedItems(
      [staff],
      {
        equippedArmorId: null,
        equippedShieldId: null,
        equippedWeaponId: staff.id,
        equippedOffHandWeaponId: null,
      },
      {},
      [quarterstaff, staff],
    )
    expect(equipped.weapon?.id).toBe(staff.id)
    expect(equipped.weapon?.damage).toBe("1d6")
  })

  it("shows staffs in the weapons filter and requires attunement before wielding", () => {
    expect(matchesEquipmentSheetFilter(staff, "weapons")).toBe(true)
    expect(mustAttuneBeforeEquip(staff)).toBe(true)
    expect(getBaseSelectionOptions(staff, [quarterstaff, staff]).map((row) => row.name)).toEqual([
      "Quarterstaff",
    ])
  })

  it("resolves Rod of Lordly Might onto a mace", () => {
    const rod = item({
      id: "rod",
      name: "Rod of Lordly Might",
      magic_item_category: "Rod",
      rarity: "Legendary",
      requires_attunement: true,
    })
    const resolved = resolveCharacterEquipment(rod, [mace, rod], {})
    expect(resolved.damage).toBe("1d6")
    expect(isWieldableWeaponItem(rod)).toBe(true)
  })
})

describe("applyInferredMagicItemWeaponBases", () => {
  it("fills missing staff bases without overwriting explicit ones", () => {
    expect(
      applyInferredMagicItemWeaponBases({
        name: "Staff of Frost",
        magic_item_category: "Staff",
      } as { name: string; magic_item_category: string; base_equipment_names?: string[] })
        .base_equipment_names,
    ).toEqual(["Quarterstaff"])
    expect(
      applyInferredMagicItemWeaponBases({
        name: "Custom Staff",
        magic_item_category: "Staff",
        base_equipment_names: ["Spear"],
      } as { name: string; magic_item_category: string; base_equipment_names: string[] })
        .base_equipment_names,
    ).toEqual(["Spear"])
  })
})
