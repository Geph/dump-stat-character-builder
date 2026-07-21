import { describe, expect, it } from "vitest"
import {
  applyImportCollisionResolutions,
  applyImportRenames,
  buildImportCollisions,
  defaultCollisionResolutionMap,
  defaultRenameMap,
  type ImportCollisionKind,
} from "@/lib/import/import-collisions"
import type { ImportContent } from "@/lib/import/content-schema"
import { COMPENDIUM_TABLES, resolveTable } from "@/lib/db/tables"

describe("buildImportCollisions", () => {
  it("maps collision kinds to valid compendium tables", async () => {
    const { fetchExistingForImportCollisions } = await import("@/lib/import/fetch-import-collisions")
    const kinds: ImportCollisionKind[] = ["class", "feat", "species", "spell", "background", "ability"]
    const tableByKind: Record<ImportCollisionKind, string> = {
      class: "classes",
      feat: "feats",
      species: "species",
      spell: "spells",
      background: "backgrounds",
      ability: "custom_abilities",
    }
    for (const kind of kinds) {
      const table = resolveTable(tableByKind[kind]) ?? tableByKind[kind]
      expect(COMPENDIUM_TABLES).toContain(table)
    }
    // Smoke: module exports without throwing on table resolution
    expect(typeof fetchExistingForImportCollisions).toBe("function")
  })

  it("detects class name conflicts and suggests alternate names", () => {
    const content = {
      classes: [{ name: "Fighter", features: [] }],
    }
    const collisions = buildImportCollisions(content as unknown as ImportContent, {
      class: [{ name: "Fighter", source: "SRD" }],
    })
    expect(collisions).toHaveLength(1)
    expect(collisions[0].suggestedName).toBe("Alternate Fighter")
    expect(collisions[0].suggestedResourcePrefix).toBe("alternate_fighter")
  })

  it("applies renames and prefixes class resource keys", () => {
    const content = {
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
    const collisions = buildImportCollisions(content as unknown as ImportContent, {
      class: [{ name: "Fighter", source: "SRD" }],
    })
    const renameMap = { [collisions[0].id]: collisions[0].suggestedName }
    const next = applyImportRenames(content as unknown as ImportContent, renameMap)
    expect(next.classes?.[0].name).toBe("Alternate Fighter")
    expect(next.class_resources?.[0].resource_key).toBe("alternate_fighter_exploit_dice")
    expect(next.spells?.[0].classes).toEqual(["Alternate Fighter"])
  })

  it("leaves class Import-as blank until the user chooses a name", () => {
    const collisions = buildImportCollisions(
      { classes: [{ name: "Warden", features: [] }] } as unknown as ImportContent,
      { class: [{ name: "Warden", source: "KibblesTasty" }] },
    )
    expect(defaultRenameMap(collisions)).toEqual({})
    expect(collisions[0]?.suggestedName).toBe("Mage Hand Press Warden")
  })

  it("keeps the original name when overwrite is selected", () => {
    const content = {
      spells: [
        {
          name: "Searing Orb",
          level: 2,
          school: "Evocation",
          casting_time: "1 action",
          range: "60 feet",
          components: ["S"],
          duration: "Instantaneous",
          concentration: false,
          description: "Updated text",
          classes: [],
        },
      ],
    }
    const collisions = buildImportCollisions(content as unknown as ImportContent, {
      spell: [{ name: "Searing Orb", source: "Homebrew" }],
    })
    const next = applyImportCollisionResolutions(
      content as unknown as ImportContent,
      collisions,
      { [collisions[0].id]: "overwrite" },
      defaultRenameMap(collisions),
    )
    expect(next.spells?.[0].name).toBe("Searing Orb")
    expect(next.spells?.[0].description).toBe("Updated text")
  })

  it("defaults spell collisions to link and drops them from the import payload", () => {
    const content = {
      spells: [
        {
          name: "Fireball",
          level: 3,
          school: "Evocation",
          casting_time: "1 action",
          range: "150 feet",
          components: ["V", "S", "M"],
          duration: "Instantaneous",
          concentration: false,
          description: "Import stub — should not overwrite SRD",
          classes: ["Wizard"],
        },
        {
          name: "Brand New Bolt",
          level: 1,
          school: "Evocation",
          casting_time: "1 action",
          range: "60 feet",
          components: ["V"],
          duration: "Instantaneous",
          concentration: false,
          description: "Novel spell",
          classes: [],
        },
      ],
    }
    const collisions = buildImportCollisions(content as unknown as ImportContent, {
      spell: [{ name: "Fireball", source: "SRD" }],
    })
    expect(defaultCollisionResolutionMap(collisions)).toEqual({
      [collisions[0].id]: "link",
    })
    const next = applyImportCollisionResolutions(
      content as unknown as ImportContent,
      collisions,
      defaultCollisionResolutionMap(collisions),
      defaultRenameMap(collisions),
    )
    expect(next.spells?.map((spell) => spell.name)).toEqual(["Brand New Bolt"])
  })

  it("drops skipped collision rows from the import payload", () => {
    const content = {
      feats: [
        { name: "Alert", description: "Incoming", level_requirement: 1 },
        { name: "Fresh Feat", description: "Keep me", level_requirement: 1 },
      ],
    }
    const collisions = buildImportCollisions(content as unknown as ImportContent, {
      feat: [{ name: "Alert", source: "SRD" }],
    })
    const next = applyImportCollisionResolutions(
      content as unknown as ImportContent,
      collisions,
      { [collisions[0].id]: "skip" },
      defaultRenameMap(collisions),
    )
    expect(next.feats?.map((feat) => feat.name)).toEqual(["Fresh Feat"])
  })
})
