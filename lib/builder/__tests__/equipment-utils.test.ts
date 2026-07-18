import { describe, expect, it } from "vitest"
import {
  collapseWeaponCategoryPackageOptions,
  resolvePackageEquipmentIds,
} from "@/lib/builder/equipment-utils"
import type { Equipment } from "@/lib/types"

function weapon(id: string, name: string, subcategory: string): Equipment {
  return {
    id,
    name,
    category: "Weapon",
    subcategory,
    cost: null,
    weight: null,
    description: null,
    properties: null,
    damage: null,
    armor_class: null,
    stealth_disadvantage: false,
    icon: null,
    source: "SRD",
    creator_url: null,
    created_at: "",
  }
}

describe("collapseWeaponCategoryPackageOptions", () => {
  it("collapses many Option C martial weapons into one Martial Weapon choice", () => {
    const equipment = [
      weapon("longsword", "Longsword", "Martial Melee"),
      weapon("rapier", "Rapier", "Martial Melee"),
      weapon("battleaxe", "Battleaxe", "Martial Melee"),
    ]
    const options = [
      { label: "A", items: [{ name: "Shield", quantity: 1 }] },
      { label: "B", items: [{ name: "Gold Pieces", quantity: 10 }] },
      { label: "C", items: [{ name: "Longsword", quantity: 1 }] },
      { label: "C", items: [{ name: "Rapier", quantity: 1 }] },
      { label: "C", items: [{ name: "Battleaxe", quantity: 1 }] },
    ]
    const collapsed = collapseWeaponCategoryPackageOptions(options, equipment)
    expect(collapsed).toEqual([
      { label: "A", items: [{ name: "Shield", quantity: 1 }] },
      { label: "B", items: [{ name: "Gold Pieces", quantity: 10 }] },
      { label: "C", items: [{ name: "Martial Weapon", quantity: 1 }] },
    ])
  })

  it("resolves category picks into equipment ids", () => {
    const equipment = [weapon("longsword", "Longsword", "Martial Melee")]
    const ids = resolvePackageEquipmentIds(
      [{ name: "Martial Weapon", quantity: 1 }],
      equipment,
      { "0": "longsword" },
    )
    expect(ids).toEqual(["longsword"])
  })
})
