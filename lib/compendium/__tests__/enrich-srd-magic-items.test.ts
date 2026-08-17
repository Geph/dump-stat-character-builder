import { describe, expect, it } from "vitest"
import {
  enrichSrdMagicItemList,
  enrichSrdMundaneEquipmentRow,
  expandSrdMagicItemRows,
  prepareMagicItemsForSeed,
} from "@/lib/compendium/enrich-srd-magic-items"

describe("expandSrdMagicItemRows", () => {
  it("expands generic +N weapon entries", () => {
    const expanded = expandSrdMagicItemRows([
      {
        name: "Weapon, +1, +2, or +3",
        source: "D&D 5.5e SRD",
        magic_item_category: "Weapon",
      },
    ])
    expect(expanded.map((row) => row.name)).toEqual(["+1 Weapon", "+2 Weapon", "+3 Weapon"])
    expect(expanded[0]?.base_equipment_filter).toBe("any_weapon")
  })
})

describe("enrichSrdMagicItemList", () => {
  it("adds attack and damage modifiers to +1 weapons", () => {
    const [plusOne] = enrichSrdMagicItemList([
      {
        name: "+1 Weapon",
        source: "D&D 5.5e SRD",
        magic_item_category: "Weapon",
        magic_bonus: 1,
        base_equipment_filter: "any_weapon",
      },
    ])
    expect(plusOne.magic_effects).toHaveLength(2)
  })

  it("links staff-type items to Quarterstaff", () => {
    const [staff] = enrichSrdMagicItemList([
      {
        name: "Staff of Fire",
        source: "D&D 5.5e SRD",
        magic_item_category: "Staff",
      },
    ])
    expect(staff.base_equipment_names).toEqual(["Quarterstaff"])
  })

  it("adds AC modifiers to +1 shields", () => {
    const [plusOneShield] = enrichSrdMagicItemList([
      {
        name: "+1 Shield",
        source: "D&D 5.5e SRD",
        magic_item_category: "Armor",
        subcategory: "Shield",
        magic_bonus: 1,
        base_equipment_names: ["Shield"],
      },
    ])
    expect(plusOneShield.magic_effects?.[0]?.characteristics?.[0]?.type).toBe("ac")
  })
})

describe("enrichSrdMundaneEquipmentRow", () => {
  it("reclassifies Potion of Healing in place", () => {
    const row = enrichSrdMundaneEquipmentRow({
      name: "Potion of Healing",
      source: "D&D 5.5e SRD",
      category: "Adventuring Gear",
    })
    expect(row.magic_item_category).toBe("Potion")
    expect(row.rarity).toBe("Common")
    expect(row.magic_effects).toHaveLength(1)
  })

  it("applies bundled armor icons on seed enrich", () => {
    const row = enrichSrdMundaneEquipmentRow({
      name: "Chain Mail",
      source: "D&D 5.5e SRD",
      category: "Armor",
      subcategory: "Heavy Armor",
    })
    expect(row.icon).toBe("mail-shirt")
  })

  it("disables SRD firearms by default while keeping them in the seed", () => {
    for (const name of ["Pistol", "Musket"] as const) {
      const row = enrichSrdMundaneEquipmentRow({
        name,
        source: "D&D 5.5e SRD",
        category: "Weapon",
        subcategory: "Martial Ranged Weapons",
      })
      expect(row.enabled).toBe(false)
    }
  })

  it("uses the revolver icon for Pistol", () => {
    const row = enrichSrdMundaneEquipmentRow({
      name: "Pistol",
      source: "D&D 5.5e SRD",
      category: "Weapon",
      subcategory: "Martial Ranged Weapons",
    })
    expect(row.icon).toBe("revolver")
  })
})

describe("prepareMagicItemsForSeed", () => {
  it("resolves base equipment names to ids and skips duplicate potion", () => {
    const prepared = prepareMagicItemsForSeed(
      [
        {
          name: "Potion of Healing",
          source: "D&D 5.5e SRD",
          magic_item_category: "Potion",
        },
        {
          name: "+1 Shield",
          source: "D&D 5.5e SRD",
          magic_item_category: "Armor",
          subcategory: "Shield",
          magic_bonus: 1,
          base_equipment_names: ["Shield"],
        },
      ],
      new Map([["Shield", "shield-id"]]),
    )
    expect(prepared.some((row) => row.name === "Potion of Healing")).toBe(false)
    const shield = prepared.find((row) => row.name === "+1 Shield")
    expect(shield?.base_equipment_ids).toEqual(["shield-id"])
    expect(shield?.selected_base_equipment_id).toBe("shield-id")
  })
})
