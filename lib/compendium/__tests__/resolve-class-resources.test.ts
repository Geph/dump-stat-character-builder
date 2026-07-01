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
    expect(resolved[0]?.uses.dieSidesByLevel).toContainEqual({ level: 2, count: 6 })
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
