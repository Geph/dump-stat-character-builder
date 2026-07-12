import { describe, expect, it } from "vitest"
import {
  buildImportStages,
  IMPORT_STAGE_PREVIEW_KEYS,
  importModifierMatchesStage,
} from "@/lib/import/import-staging"
import { collectImportContentPreview } from "@/lib/import/import-content-preview"
import type { ImportContent } from "@/lib/import/content-schema"

describe("import staging progressive review", () => {
  it("builds stages in review order", () => {
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
      "subclasses",
      "feats",
      "spells",
      "equipment",
      "proposals",
    ])
  })

  it("filters preview sections to the active stage", () => {
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
    expect(core.map((section) => section.key)).toEqual(["classes"])
    expect(core[0]?.items[0]?.name).toBe("Fighter")

    const subclasses = collectImportContentPreview(content, {
      sectionKeys: IMPORT_STAGE_PREVIEW_KEYS.subclasses,
    })
    expect(subclasses.map((section) => section.key)).toEqual(["subclasses"])
  })

  it("matches modifier source labels to stages", () => {
    expect(importModifierMatchesStage("Class: Fighter", "core")).toBe(true)
    expect(importModifierMatchesStage("Subclass: Champion (Fighter)", "subclasses")).toBe(true)
    expect(importModifierMatchesStage("Feat: Archery", "feats")).toBe(true)
    expect(importModifierMatchesStage("Class: Fighter", "feats")).toBe(false)
  })
})
