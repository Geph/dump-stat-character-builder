import { describe, expect, it } from "vitest"
import {
  addOwnedEquipmentQuantity,
  canDualWieldSameWeapon,
  holdingsFromRepeatedIds,
  mergeEquipmentHoldings,
  ownedEquipmentQuantity,
  setOwnedEquipmentQuantity,
} from "@/lib/character/equipment-quantities"
import { resolvePackageEquipment } from "@/lib/builder/equipment-utils"
import type { Equipment } from "@/lib/types"

function weapon(id: string, name: string): Equipment {
  return {
    id,
    name,
    category: "Weapon",
    subcategory: "Simple Melee",
    cost: null,
    weight: null,
    description: null,
    properties: ["Light", "Finesse", "Thrown"],
    damage: "1d4",
    armor_class: null,
    stealth_disadvantage: false,
    icon: "plain-dagger",
    source: "SRD",
    creator_url: null,
    created_at: "",
  }
}

describe("equipment quantities", () => {
  it("defaults owned items to 1 and missing items to 0", () => {
    expect(ownedEquipmentQuantity(["dagger"], {}, "dagger")).toBe(1)
    expect(ownedEquipmentQuantity(["dagger"], { dagger: 3 }, "dagger")).toBe(3)
    expect(ownedEquipmentQuantity(["dagger"], {}, "handaxe")).toBe(0)
  })

  it("adds and removes stacked copies", () => {
    const added = addOwnedEquipmentQuantity(["dagger"], {}, "dagger", 1)
    expect(added).toEqual({ equipmentIds: ["dagger"], quantities: { dagger: 2 } })

    const removed = setOwnedEquipmentQuantity(added.equipmentIds, added.quantities, "dagger", 0)
    expect(removed.equipmentIds).toEqual([])
    expect(removed.quantities).toEqual({})
  })

  it("merges starting packages that grant multiple copies", () => {
    const holdings = mergeEquipmentHoldings(
      { ids: ["dagger"], quantities: { dagger: 2 } },
      { ids: ["handaxe"], quantities: { handaxe: 4 } },
      holdingsFromRepeatedIds(["dagger", "dagger"]),
    )
    expect(holdings.ids).toEqual(["dagger", "handaxe"])
    expect(holdings.quantities).toEqual({ dagger: 4, handaxe: 4 })
  })

  it("resolves 2 Daggers from a starting package line", () => {
    const resolved = resolvePackageEquipment(
      [
        { name: "Dagger", quantity: 2 },
        { name: "Gold Pieces", quantity: 15 },
      ],
      [weapon("dagger", "Dagger")],
    )
    expect(resolved).toEqual({ ids: ["dagger"], quantities: { dagger: 2 } })
  })

  it("allows dual-wielding the same weapon at quantity 2+", () => {
    expect(canDualWieldSameWeapon(1)).toBe(false)
    expect(canDualWieldSameWeapon(2)).toBe(true)
  })
})
