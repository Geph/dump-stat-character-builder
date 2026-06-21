import { describe, expect, it } from "vitest"
import {
  applyImportRenames,
  buildImportCollisions,
  defaultRenameMap,
} from "@/lib/import/import-collisions"
import type { ImportContent } from "@/lib/import/content-schema"

describe("buildImportCollisions", () => {
  it("detects class name conflicts and suggests alternate names", () => {
    const content: ImportContent = {
      classes: [{ name: "Fighter", features: [] }],
    }
    const collisions = buildImportCollisions(content, {
      class: [{ name: "Fighter", source: "SRD" }],
    })
    expect(collisions).toHaveLength(1)
    expect(collisions[0].suggestedName).toBe("Alternate Fighter")
    expect(collisions[0].suggestedResourcePrefix).toBe("alternate_fighter")
  })

  it("applies renames and prefixes class resource keys", () => {
    const content: ImportContent = {
      classes: [{ name: "Fighter", features: [] }],
      class_resources: [
        {
          class_name: "Fighter",
          resource_key: "exploit_dice",
          name: "Exploit Dice",
          uses: { type: "at_level", atLevelTable: [{ level: 2, count: 2 }] },
        },
      ],
      spells: [{ name: "Test", classes: ["Fighter"] }],
    }
    const collisions = buildImportCollisions(content, {
      class: [{ name: "Fighter", source: "SRD" }],
    })
    const renameMap = defaultRenameMap(collisions)
    const next = applyImportRenames(content, renameMap)
    expect(next.classes?.[0].name).toBe("Alternate Fighter")
    expect(next.class_resources?.[0].resource_key).toBe("alternate_fighter_exploit_dice")
    expect(next.spells?.[0].classes).toEqual(["Alternate Fighter"])
  })
})
