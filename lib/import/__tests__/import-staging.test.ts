import { describe, expect, it } from "vitest"
import {
  buildImportStages,
  IMPORT_STAGE_PREVIEW_KEYS,
  importModifierMatchesStage,
} from "@/lib/import/import-staging"
import { collectImportContentPreview } from "@/lib/import/import-content-preview"
import {
  renameImportClassAtIndex,
  renameImportSubclassAtIndex,
} from "@/lib/import/rename-import-preview"
import type { ImportContent } from "@/lib/import/content-schema"

describe("import staging progressive review", () => {
  it("builds stages with class and subclasses combined", () => {
    const content = {
      classes: [{ name: "Fighter", hit_die: 10, description: null, primary_ability: ["Strength"], features: [] }],
      subclasses: [{ name: "Champion", class_name: "Fighter", description: null, features: [] }],
      feats: [{ name: "Archery", description: null }],
      spells: [
        {
          name: "Fire Bolt",
          level: 0,
          school: "Evocation",
          casting_time: null,
          range: null,
          components: null,
          duration: null,
          concentration: false,
          description: null,
          classes: ["Wizard"],
        },
      ],
      equipment: [{ name: "Longsword", category: "Weapon", description: null }],
      class_resources: [{ name: "Second Wind", class_name: "Fighter" }],
    } as unknown as ImportContent

    expect(buildImportStages(content).map((stage) => stage.id)).toEqual([
      "core",
      "feats",
      "spells",
      "equipment",
      "proposals",
    ])
    expect(buildImportStages(content)[0]?.label).toBe("Class & subclasses")
  })

  it("filters preview sections to the active stage with subclasses under core", () => {
    const content = {
      classes: [
        {
          name: "Fighter",
          hit_die: 10,
          description: "A martial warrior.",
          primary_ability: ["Strength"],
          features: [{ name: "Fighting Style", level: 1, description: "Choose a style." }],
        },
      ],
      subclasses: [
        { name: "Champion", class_name: "Fighter", description: null, features: [] },
      ],
      feats: [{ name: "Archery", description: null }],
      spells: [
        {
          name: "Fire Bolt",
          level: 0,
          school: "Evocation",
          casting_time: null,
          range: null,
          components: null,
          duration: null,
          concentration: false,
          description: null,
          classes: ["Wizard"],
        },
      ],
    } as unknown as ImportContent

    const core = collectImportContentPreview(content, {
      sectionKeys: IMPORT_STAGE_PREVIEW_KEYS.core,
    })
    expect(core.map((section) => section.key)).toEqual(["classes", "subclasses"])
    expect(core[0]?.items[0]?.name).toBe("Fighter")
    expect(core[0]?.items[0]?.nameKind).toBe("class")
    expect(core[1]?.items[0]?.nameKind).toBe("subclass")
  })

  it("matches modifier source labels to stages", () => {
    expect(importModifierMatchesStage("Class: Fighter", "core")).toBe(true)
    expect(importModifierMatchesStage("Subclass: Champion (Fighter)", "core")).toBe(true)
    expect(importModifierMatchesStage("Feat: Archery", "feats")).toBe(true)
    expect(importModifierMatchesStage("Class: Fighter", "feats")).toBe(false)
  })
})

describe("rename import preview", () => {
  it("renames a class and cascades subclass parent links", () => {
    const content = {
      classes: [{ name: "Warden", hit_die: 10, features: [] }],
      subclasses: [{ name: "Beastblood Guardian", class_name: "Warden", features: [] }],
      class_resources: [{ name: "Survive", class_name: "Warden", resource_key: "survive" }],
      spells: [{ name: "Test", classes: ["Warden"] }],
    } as unknown as ImportContent

    const next = renameImportClassAtIndex(content, 0, "Mage Hand Press Warden")
    expect(next.classes?.[0]?.name).toBe("Mage Hand Press Warden")
    expect(next.subclasses?.[0]?.class_name).toBe("Mage Hand Press Warden")
    expect(next.class_resources?.[0]?.class_name).toBe("Mage Hand Press Warden")
    expect(next.spells?.[0]?.classes).toEqual(["Mage Hand Press Warden"])
  })

  it("renames a subclass without changing the parent class", () => {
    const content = {
      classes: [{ name: "Warden", features: [] }],
      subclasses: [{ name: "Beastblood Guardian", class_name: "Warden", features: [] }],
    } as unknown as ImportContent

    const next = renameImportSubclassAtIndex(content, 0, "Beastblood")
    expect(next.subclasses?.[0]?.name).toBe("Beastblood")
    expect(next.subclasses?.[0]?.class_name).toBe("Warden")
    expect(next.classes?.[0]?.name).toBe("Warden")
  })
})
