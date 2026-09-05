import { describe, expect, it } from "vitest"
import {
  collectGrantedEquipmentFromFeatures,
  grantedEquipmentFeatureId,
  grantedEquipmentSignature,
  planEquipmentGrants,
  resolveGrantedEquipmentHoldings,
  stampGrantedEquipmentSource,
} from "@/lib/character/granted-equipment"
import { aggregateCharacteristics } from "@/lib/compendium/characteristic-modifiers"
import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import type { Equipment, Feature } from "@/lib/types"

function item(id: string, name: string): Equipment {
  return {
    id,
    name,
    category: "Adventuring Gear",
    subcategory: null,
    description: null,
  } as unknown as Equipment
}

const catalog = [
  item("eq-fogstone", "Fogstone Periapt"),
  item("eq-medallion", "Glass Medallion"),
  item("eq-key", "Skeleton's Key"),
]

function grantMod(names: string[], quantityPerItem?: number): CharacteristicModifier {
  return {
    id: "mod-1",
    type: "grant_equipment",
    equipmentNames: names,
    quantityPerItem,
  } as CharacteristicModifier
}

describe("grant_equipment aggregation", () => {
  it("collects granted item names with a default quantity of one", () => {
    const aggregated = aggregateCharacteristics([grantMod(["Fogstone Periapt", "Glass Medallion"])])
    expect(aggregated.grantedEquipment).toEqual([
      { name: "Fogstone Periapt", quantity: 1 },
      { name: "Glass Medallion", quantity: 1 },
    ])
  })

  it("grants a repeated name once, at the larger requested count", () => {
    const aggregated = aggregateCharacteristics([
      grantMod(["Fogstone Periapt"]),
      grantMod(["fogstone periapt"], 3),
    ])
    expect(aggregated.grantedEquipment).toEqual([{ name: "Fogstone Periapt", quantity: 3 }])
  })

  it("skips blank names", () => {
    expect(aggregateCharacteristics([grantMod(["", "  "])]).grantedEquipment).toEqual([])
  })

  it("copies grantedBy from the granting modifier and keeps name-keyed dedupe", () => {
    const first = stampGrantedEquipmentSource(
      [{ ...grantMod(["Fogstone Periapt"]), id: "mod-holy" }],
      "feature:investigator:holy-trinkets:3",
    )
    const second = stampGrantedEquipmentSource(
      [{ ...grantMod(["fogstone periapt"], 2), id: "mod-reimport" }],
      "feature:investigator:holy-trinkets:3-reimport",
    )
    expect(aggregateCharacteristics([...first, ...second]).grantedEquipment).toEqual([
      {
        name: "Fogstone Periapt",
        quantity: 2,
        grantedBy: { featureId: "feature:investigator:holy-trinkets:3", modifierId: "mod-holy" },
      },
    ])
  })
})

describe("planEquipmentGrants", () => {
  it("adds unowned granted items and records each grant as honored", () => {
    const plan = planEquipmentGrants({
      grants: [{ name: "Fogstone Periapt", quantity: 1 }],
      catalog,
      equipmentIds: [],
      quantities: {},
      alreadyGrantedNames: [],
    })
    expect(plan?.equipmentIds).toEqual(["eq-fogstone"])
    expect(plan?.addedItems.map((entry) => entry.id)).toEqual(["eq-fogstone"])
    expect(plan?.grantedNames).toEqual(["Fogstone Periapt"])
  })

  it("does nothing once the grant has been honored, so a dropped item stays dropped", () => {
    const plan = planEquipmentGrants({
      grants: [{ name: "Fogstone Periapt", quantity: 1 }],
      catalog,
      equipmentIds: [],
      quantities: {},
      alreadyGrantedNames: ["Fogstone Periapt"],
    })
    expect(plan).toBeNull()
  })

  it("matches the honored record case-insensitively", () => {
    const plan = planEquipmentGrants({
      grants: [{ name: "Fogstone Periapt", quantity: 1 }],
      catalog,
      equipmentIds: [],
      quantities: {},
      alreadyGrantedNames: ["  fogstone periapt "],
    })
    expect(plan).toBeNull()
  })

  it("honors the grant without topping up a stack the player already owns", () => {
    const plan = planEquipmentGrants({
      grants: [{ name: "Fogstone Periapt", quantity: 1 }],
      catalog,
      equipmentIds: ["eq-fogstone"],
      quantities: { "eq-fogstone": 4 },
      alreadyGrantedNames: [],
    })
    expect(plan?.quantities["eq-fogstone"]).toBe(4)
    expect(plan?.addedItems).toEqual([])
    expect(plan?.grantedNames).toEqual(["Fogstone Periapt"])
  })

  it("keeps previously honored names when a later feature grants more", () => {
    const plan = planEquipmentGrants({
      grants: [
        { name: "Fogstone Periapt", quantity: 1 },
        { name: "Glass Medallion", quantity: 1 },
      ],
      catalog,
      equipmentIds: ["eq-fogstone"],
      quantities: {},
      alreadyGrantedNames: ["Fogstone Periapt"],
    })
    expect(plan?.grantedNames).toEqual(["Fogstone Periapt", "Glass Medallion"])
    expect(plan?.equipmentIds).toEqual(["eq-fogstone", "eq-medallion"])
  })

  it("reports names missing from the compendium instead of failing", () => {
    const plan = planEquipmentGrants({
      grants: [
        { name: "Fogstone Periapt", quantity: 1 },
        { name: "Nonexistent Bauble", quantity: 1 },
      ],
      catalog,
      equipmentIds: [],
      quantities: {},
      alreadyGrantedNames: [],
    })
    expect(plan?.unresolvedNames).toEqual(["Nonexistent Bauble"])
    expect(plan?.equipmentIds).toEqual(["eq-fogstone"])
    expect(plan?.grantedNames).toEqual(["Fogstone Periapt"])
  })

  it("returns null when nothing is granted", () => {
    expect(
      planEquipmentGrants({
        grants: [],
        catalog,
        equipmentIds: [],
        quantities: {},
        alreadyGrantedNames: [],
      }),
    ).toBeNull()
  })

  it("grants multiple copies when asked", () => {
    const plan = planEquipmentGrants({
      grants: [{ name: "Skeleton's Key", quantity: 2 }],
      catalog,
      equipmentIds: [],
      quantities: {},
      alreadyGrantedNames: [],
    })
    expect(plan?.quantities["eq-key"]).toBe(2)
  })

  it("carries grantedBy onto the inventory holding without using it as the honor key", () => {
    const grants = [
      {
        name: "Fogstone Periapt",
        quantity: 1,
        grantedBy: { featureId: "feature:inv:trinkets:3", modifierId: "mod-grant" },
      },
    ]
    const first = planEquipmentGrants({
      grants,
      catalog,
      equipmentIds: [],
      quantities: {},
      alreadyGrantedNames: [],
    })
    expect(first?.holdings).toEqual([
      {
        id: "eq-fogstone",
        name: "Fogstone Periapt",
        quantity: 1,
        grantedBy: { featureId: "feature:inv:trinkets:3", modifierId: "mod-grant" },
      },
    ])

    const replay = planEquipmentGrants({
      grants: [
        {
          name: "Fogstone Periapt",
          quantity: 1,
          grantedBy: { featureId: "feature:inv:trinkets:3", modifierId: "mod-regenerated" },
        },
      ],
      catalog,
      equipmentIds: first?.equipmentIds ?? [],
      quantities: first?.quantities,
      alreadyGrantedNames: first?.grantedNames,
    })
    expect(replay).toBeNull()
  })
})

describe("builder starting-inventory holdings", () => {
  it("round-trips a grant list into owned holdings with grantedBy", () => {
    const grants = [
      {
        name: "Fogstone Periapt",
        quantity: 1,
        grantedBy: { featureId: "feature:inv:trinkets:3", modifierId: "mod-1" },
      },
      { name: "Skeleton's Key", quantity: 2 },
    ]
    const holdings = resolveGrantedEquipmentHoldings(grants, catalog)
    expect(holdings.ids).toEqual(["eq-fogstone", "eq-key"])
    expect(holdings.quantities).toEqual({ "eq-key": 2 })
    expect(holdings.names).toEqual(["Fogstone Periapt", "Skeleton's Key"])
    expect(holdings.holdings).toEqual([
      {
        id: "eq-fogstone",
        name: "Fogstone Periapt",
        quantity: 1,
        grantedBy: { featureId: "feature:inv:trinkets:3", modifierId: "mod-1" },
      },
      { id: "eq-key", name: "Skeleton's Key", quantity: 2 },
    ])
  })

  it("omits names with no compendium row so the sheet can grant them later", () => {
    expect(
      resolveGrantedEquipmentHoldings(
        [
          { name: "Fogstone Periapt", quantity: 1 },
          { name: "Nonexistent Bauble", quantity: 1 },
        ],
        catalog,
      ).names,
    ).toEqual(["Fogstone Periapt"])
  })

  it("is stable for equal grant lists and empty for none", () => {
    const a = grantedEquipmentSignature([{ name: "Glass Medallion", quantity: 1 }])
    const b = grantedEquipmentSignature([{ name: "Glass Medallion", quantity: 1 }])
    expect(a).toBe(b)
    expect(resolveGrantedEquipmentHoldings([], catalog).ids).toEqual([])
  })

  it("walks a feature and stamps feature id + modifier id on the holding", () => {
    const feature = {
      id: "feat-trinkets",
      name: "Trinkets",
      level: 3,
      description: "",
      linkedModifiers: [
        {
          instanceId: "inst-1",
          catalogRefId: "cat_char_grant_equipment",
          characteristics: [grantMod(["Glass Medallion"])],
        },
      ],
    } as Feature
    const grants = collectGrantedEquipmentFromFeatures([
      { feature, ownerId: "investigator" },
    ])
    expect(grants[0]?.grantedBy).toEqual({
      featureId: "feat-trinkets",
      modifierId: "mod-1",
    })
    expect(grantedEquipmentFeatureId({ ownerId: "Investigator", featureName: "Holy Trinkets", level: 3 })).toBe(
      "feature:investigator:holy_trinkets:3",
    )
    const holdings = resolveGrantedEquipmentHoldings(grants, catalog)
    expect(holdings.holdings[0]?.grantedBy).toEqual(grants[0]?.grantedBy)
  })
})
