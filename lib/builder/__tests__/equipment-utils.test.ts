import { describe, expect, it } from "vitest"
import {
  collapseWeaponCategoryPackageOptions,
  filterStartingEquipmentOptionsByWeaponProficiency,
  formatPackageOptionTitle,
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

describe("formatPackageOptionTitle", () => {
  it("strips gear text from verbose option labels", () => {
    expect(
      formatPackageOptionTitle(
        "(A) Spear, 2 Daggers, Arcane Focus (Crystal), Dungeoneer's Pack, and 28 GP",
        0,
      ),
    ).toBe("Option (A)")
    expect(formatPackageOptionTitle("B", 1)).toBe("Option (B)")
    expect(formatPackageOptionTitle("", 2)).toBe("Option (C)")
  })
})

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

  it("keeps single named simple weapons instead of collapsing to Simple Weapon", () => {
    const equipment = [
      weapon("staff", "Quarterstaff", "Simple Melee"),
      weapon("dagger", "Dagger", "Simple Melee"),
      weapon("longsword", "Longsword", "Martial Melee"),
    ]
    const options = [
      { label: "A", items: [{ name: "Quarterstaff", quantity: 1 }] },
      { label: "B", items: [{ name: "Dagger", quantity: 1 }] },
      { label: "C", items: [{ name: "Martial Weapon", quantity: 1 }] },
    ]
    expect(collapseWeaponCategoryPackageOptions(options, equipment)).toEqual(options)
  })

  it("hides martial-only options without martial proficiency", () => {
    const options = [
      { label: "A", items: [{ name: "Quarterstaff", quantity: 1 }] },
      { label: "B", items: [{ name: "Dagger", quantity: 1 }] },
      { label: "C", items: [{ name: "Martial Weapon", quantity: 1 }] },
    ]
    expect(filterStartingEquipmentOptionsByWeaponProficiency(options, ["Simple weapons"])).toEqual([
      options[0],
      options[1],
    ])
    expect(
      filterStartingEquipmentOptionsByWeaponProficiency(options, ["Simple weapons", "Martial weapons"]),
    ).toEqual(options)
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
