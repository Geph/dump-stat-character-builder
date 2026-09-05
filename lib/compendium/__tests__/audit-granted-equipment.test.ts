import { describe, expect, it } from "vitest"
import {
  auditGrantedEquipment,
  auditMageHandPressGrantedEquipment,
} from "@/lib/compendium/audit-granted-equipment"
import type { ImportContent } from "@/lib/import/content-schema"
import type { Feature } from "@/lib/types"

function grantFeature(params: {
  name: string
  level: number
  items: string[]
  abilityNames?: string[]
  modifierId?: string
}): Feature {
  return {
    name: params.name,
    level: params.level,
    description: "",
    linkedModifiers: [
      {
        instanceId: "inst-grant",
        catalogRefId: "cat_char_grant_equipment",
        characteristics: [
          {
            id: params.modifierId ?? "mod-grant",
            type: "grant_equipment",
            equipmentNames: params.items,
          },
          ...(params.abilityNames?.length
            ? [
                {
                  id: "mod-abilities",
                  type: "grant_custom_ability" as const,
                  abilityNames: params.abilityNames,
                },
              ]
            : []),
        ],
      },
    ],
  } as Feature
}

function fixtureContent(overrides?: Partial<ImportContent>): ImportContent {
  return {
    classes: [
      {
        name: "Investigator",
        features: [
          grantFeature({
            name: "Holy Trinkets",
            level: 3,
            items: ["Amulet of Warding"],
            abilityNames: ["Amulet of Warding"],
          }),
        ],
      },
    ],
    subclasses: [
      {
        name: "Detective",
        class_name: "Investigator",
        features: [
          grantFeature({
            name: "Trinkets",
            level: 3,
            items: ["Fogstone Periapt"],
            abilityNames: ["Fogstone Periapt"],
          }),
        ],
      },
    ],
    class_resources: [
      {
        class_name: "Investigator",
        resource_key: "trinkets",
        name: "Trinkets",
        uses: { type: "at_level", atLevelTable: [{ level: 3, count: 2 }] },
      },
    ],
    equipment: [
      {
        name: "Amulet of Warding",
        category: "Wondrous Item",
        subcategory: null,
        description: "A holy trinket.",
      },
      {
        name: "Fogstone Periapt",
        category: "Wondrous Item",
        subcategory: null,
        description: "Cast Misty Step.",
      },
    ],
    import_proposals: {
      custom_abilities: [
        {
          proposal_id: "amulet",
          name: "Amulet of Warding",
          definition: "Holy Trinket.",
          description: "As a Bonus Action, you place a ward.",
          source_type: "class",
          source_name: "Investigator",
          level_requirement: 3,
          prerequisite: null,
          casting_time: "1 bonus action",
          ability_role: "upgrade",
          uses: {
            type: "class_resource",
            classResourceKey: "trinkets",
            classResourceAmount: 1,
          },
        },
        {
          proposal_id: "periapt",
          name: "Fogstone Periapt",
          definition: "Trinket.",
          description: "You can cast Misty Step.",
          source_type: "subclass",
          source_name: "Detective",
          level_requirement: 3,
          prerequisite: null,
          casting_time: "Bonus Action",
          ability_role: "upgrade",
          uses: {
            type: "class_resource",
            classResourceKey: "trinkets",
            classResourceAmount: 1,
          },
        },
      ],
    },
    ...overrides,
  } as ImportContent
}

describe("audit-granted-equipment", () => {
  it("accepts a grant that produces a grantedBy holding, a sheet action, and a resource bind", () => {
    expect(auditGrantedEquipment([fixtureContent()]).violations).toEqual([])
  })

  it("flags a grant whose modifier has no id, so the holding cannot carry grantedBy", () => {
    const content = fixtureContent({
      classes: [
        {
          name: "Investigator",
          features: [
            grantFeature({
              name: "Holy Trinkets",
              level: 3,
              items: ["Amulet of Warding"],
              abilityNames: ["Amulet of Warding"],
              modifierId: "",
            }),
          ],
        },
      ],
    })
    expect(auditGrantedEquipment([content]).violations).toEqual([
      expect.objectContaining({
        class: "Investigator",
        feature: "Holy Trinkets",
        item: "Amulet of Warding",
        kind: "missing_granted_by",
      }),
    ])
  })

  it("flags a granted activation that never reaches the sheet action list", () => {
    const content = fixtureContent()
    const proposals = content.import_proposals?.custom_abilities ?? []
    content.import_proposals = {
      ...content.import_proposals,
      custom_abilities: proposals.filter((row) => row.name !== "Fogstone Periapt"),
    }
    expect(
      auditGrantedEquipment([content]).violations.some(
        (row) => row.kind === "missing_sheet_action" && row.item === "Fogstone Periapt",
      ),
    ).toBe(true)
  })

  it("flags a granted item whose uses are a loose counter instead of a class resource", () => {
    const content = fixtureContent()
    const periapt = content.import_proposals?.custom_abilities?.find(
      (row) => row.name === "Fogstone Periapt",
    ) as { uses?: { type?: string } }
    periapt.uses = { type: "fixed", fixedAmount: 1 } as { type: string }
    expect(
      auditGrantedEquipment([content]).violations.some(
        (row) => row.kind === "loose_use_counter" && row.item === "Fogstone Periapt",
      ),
    ).toBe(true)
  })

  const shipped = auditMageHandPressGrantedEquipment()

  it("walks Investigator trinket grants in the MHP pack", () => {
    expect(shipped.grants.some((row) => row.item === "Fogstone Periapt")).toBe(true)
    expect(shipped.grants.some((row) => row.item === "Amulet of Warding")).toBe(true)
  })

  it("snapshots current MHP granted-equipment violations", () => {
    expect(shipped.violations).toMatchInlineSnapshot(`
      []
    `)
  })
})
