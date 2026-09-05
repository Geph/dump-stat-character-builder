import { describe, expect, it } from "vitest"
import {
  containerCapacityRemaining,
  containerKeyByEquipmentId,
  resolveInventoryContainers,
  syntheticContainerHostEquipment,
} from "@/lib/character/inventory-containers"
import type { InventoryContainerCharacteristic } from "@/lib/compendium/characteristic-modifiers"
import type { Feature } from "@/lib/types"

const deadSpaceContainer: InventoryContainerCharacteristic = {
  id: "mod_dead_space_container",
  type: "inventory_container",
  containerName: "Dead Space",
  capacityMode: "slot_count",
  capacityAmount: 12,
  capacityLabel: "12 Medium or smaller corpses",
  contentKinds: ["corpse", "companion", "freeform"],
  maxCreatureSize: "Medium",
  linkHostItem: true,
}

function deadSpaceFeature(): Feature {
  return {
    name: "Dead Space",
    level: 2,
    description: "Extradimensional corpse storage.",
    linkedModifiers: [
      {
        instanceId: "inst_dead_space",
        catalogRefId: "cat_migrated_inline",
        characteristics: [
          {
            id: "mod_link",
            type: "equipment_and_magic_items",
            mode: "create_mundane",
            itemOptions: ["Bag", "Cloak", "Backpack"],
            choiceCount: 1,
            allowCustom: true,
          },
          deadSpaceContainer,
        ],
      },
    ],
  }
}

describe("inventory containers", () => {
  it("creates a synthetic Gear host when the linked item is custom", () => {
    const feature = deadSpaceFeature()
    const actionId = "class:necromancer:2:Dead Space"
    const containers = resolveInventoryContainers({
      features: [feature],
      ownedEquipment: [],
      featureChoicePicks: {
        [`player-equipment:${actionId}:mod_link`]: ["My Bone Satchel"],
      },
      actionIdByFeatureName: { "Dead Space": actionId },
    })
    expect(containers).toHaveLength(1)
    expect(containers[0]?.linkedHostName).toBe("My Bone Satchel")
    expect(containers[0]?.linkedHostEquipmentId).toBeNull()
    const hosts = syntheticContainerHostEquipment(containers)
    expect(hosts).toHaveLength(1)
    expect(hosts[0]?.name).toBe("My Bone Satchel")
    expect(hosts[0]?.subcategory).toBe("Container")
    expect(containerKeyByEquipmentId(containers).get(hosts[0]!.id)).toBe(containers[0]?.key)
  })

  it("attaches Contents to an owned catalog host instead of synthesizing", () => {
    const feature = deadSpaceFeature()
    const actionId = "class:necromancer:2:Dead Space"
    const bag = {
      id: "eq_bag",
      name: "Bag",
      category: "Adventuring Gear",
      subcategory: null,
      cost: null,
      weight: 1,
      properties: null,
      description: null,
      icon: null,
      source: "srd",
      creator_url: null,
      created_at: new Date(0).toISOString(),
    }
    const containers = resolveInventoryContainers({
      features: [feature],
      ownedEquipment: [bag],
      featureChoicePicks: {
        [`player-equipment:${actionId}:mod_link`]: ["Bag"],
      },
      actionIdByFeatureName: { "Dead Space": actionId },
    })
    expect(containers[0]?.linkedHostEquipmentId).toBe("eq_bag")
    expect(syntheticContainerHostEquipment(containers)).toEqual([])
    expect(containerKeyByEquipmentId(containers).get("eq_bag")).toBe(containers[0]?.key)
  })

  it("tracks slot capacity from entries", () => {
    expect(
      containerCapacityRemaining(deadSpaceContainer, [
        { id: "a", kind: "corpse", label: "Bones", quantity: 3 },
        { id: "b", kind: "companion", label: "Skeleton", quantity: 1 },
      ]),
    ).toBe(8)
  })
})
