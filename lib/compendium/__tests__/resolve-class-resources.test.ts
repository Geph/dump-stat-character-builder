import { describe, expect, it } from "vitest"
import { resolveClassResourcesForClass } from "@/lib/compendium/resolve-class-resources"
import type { ClassResource, ClassResourceRow } from "@/lib/types"

describe("resolveClassResourcesForClass", () => {
  it("prefers class_resources table rows over SRD defaults", () => {
    const resources: ClassResource[] = [
      {
        id: "exploit_dice",
        name: "Exploit Dice",
        uses: {
          type: "at_level",
          atLevelMode: "tier",
          atLevelTable: [{ level: 2, count: 2 }],
          dieSidesByLevel: [{ level: 2, count: 6 }],
          dieType: "d6",
        },
      },
    ]

    const tableRows: ClassResourceRow[] = [
      {
        id: "r1",
        class_id: "cls-1",
        resource_key: "exploit_dice",
        name: "Exploit Dice",
        description: null,
        prerequisite_rules: [{ category: "other", value: "Subclass: Way of the Brawler" }],
        uses: resources[0].uses,
        icon: null,
        source: "Custom",
        creator_url: null,
        created_at: "",
      },
    ]

    const resolved = resolveClassResourcesForClass(
      { id: "cls-1", name: "Fighter", class_resources: null },
      tableRows,
    )
    expect(resolved).toHaveLength(1)
    expect(resolved[0]?.id).toBe("exploit_dice")
    expect(resolved[0]?.subclassName).toBe("Way of the Brawler")
    expect(resolved[0]?.uses.dieSidesByLevel).toContainEqual({ level: 2, count: 6 })
  })

  it("maps seed-pack resource_key onto ClassResource.id", () => {
    const resolved = resolveClassResourcesForClass({
      id: "cls_gunslinger",
      name: "Gunslinger",
      class_resources: [
        {
          id: "",
          name: "Risk Dice",
          uses: {
            type: "at_level",
            atLevelMode: "tier",
            atLevelTable: [{ level: 2, count: 4 }],
          },
        } as ClassResource & { resource_key?: string },
      ],
    })
    const withKey = resolveClassResourcesForClass({
      id: "cls_gunslinger",
      name: "Gunslinger",
      class_resources: [
        {
          id: "",
          name: "Risk Dice",
          resource_key: "risk_dice",
          uses: {
            type: "at_level",
            atLevelMode: "tier",
            atLevelTable: [{ level: 2, count: 4 }],
          },
        } as ClassResource & { resource_key?: string },
      ],
    })
    expect(resolved).toEqual([])
    expect(withKey[0]?.id).toBe("risk_dice")
  })

  it("normalizes subclass_name on embedded seed resources", () => {
    const resolved = resolveClassResourcesForClass({
      id: "cls-inventor",
      name: "Inventor",
      class_resources: [
        {
          id: "runes_marked",
          name: "Runes Marked",
          uses: { type: "special", atLevelTable: [{ level: 3, count: 2 }] },
          subclass_name: "Runesmith",
        } as ClassResource,
      ],
    })
    expect(resolved[0]?.subclassName).toBe("Runesmith")
  })

  it("backfills subclass ownership on legacy table rows", () => {
    const resolved = resolveClassResourcesForClass(
      { id: "cls-witch", name: "Witch", class_resources: null },
      [
        {
          id: "remedy",
          class_id: "cls-witch",
          resource_key: "remedy_dice",
          name: "Remedy Dice",
          description: null,
          uses: {
            type: "at_level",
            atLevelMode: "multiply_level",
            atLevelTable: [{ level: 1, count: 1 }],
          },
          icon: null,
          source: "Mage Hand Press",
          creator_url: null,
          created_at: "",
        },
      ],
    )
    expect(resolved[0]?.subclassName).toBe("White Magic")
  })

  it("falls back to SRD defaults when no homebrew resources exist", () => {
    const resolved = resolveClassResourcesForClass({
      id: "cls-barb",
      name: "Barbarian",
      class_resources: null,
    })
    expect(resolved.some((resource) => resource.id === "rage")).toBe(true)
  })
})
