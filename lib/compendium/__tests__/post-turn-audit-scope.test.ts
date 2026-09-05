import { describe, expect, it } from "vitest"
import {
  knownGrantedEquipmentKeysFromSource,
  knownResourceGraphKeysFromSource,
  parseSnapshotJson,
} from "@/lib/compendium/post-turn-audit-baselines"
import {
  classNamesFromAuditPath,
  isPostTurnAuditTriggerPath,
  resolvePostTurnAuditScope,
} from "@/lib/compendium/post-turn-audit-scope"

describe("post-turn audit scope", () => {
  it("treats import, compendium, and character paths as triggers", () => {
    expect(isPostTurnAuditTriggerPath("lib/import/enrichment-presets/packs/investigator.ts")).toBe(
      true,
    )
    expect(isPostTurnAuditTriggerPath("lib/compendium/audit-resource-graph.ts")).toBe(true)
    expect(isPostTurnAuditTriggerPath("lib/character/granted-equipment.ts")).toBe(true)
    expect(isPostTurnAuditTriggerPath("app/import/page.tsx")).toBe(false)
  })

  it("maps seed, preset, and test filenames to class names", () => {
    expect(
      classNamesFromAuditPath("lib/seed-packs/mage-hand-press/magehandpress-investigator-class.json"),
    ).toEqual(["Investigator"])
    expect(classNamesFromAuditPath("lib/import/enrichment-presets/packs/necromancer.ts")).toEqual([
      "Necromancer",
    ])
    expect(classNamesFromAuditPath("lib/import/__tests__/investigator-import-audit.test.ts")).toEqual(
      ["Investigator"],
    )
    expect(classNamesFromAuditPath("lib/import/__tests__/mhp-necromancer-feature-wiring.test.ts")).toEqual(
      ["Necromancer"],
    )
  })

  it("scopes to those classes when every trigger file is class-specific", () => {
    expect(
      resolvePostTurnAuditScope([
        "lib/import/enrichment-presets/packs/investigator.ts",
        "lib/seed-packs/mage-hand-press/magehandpress-investigator-class.json",
        "app/import/page.tsx",
      ]),
    ).toEqual({ full: false, classes: ["Investigator"] })
  })

  it("full-sweeps shared audit or runtime files", () => {
    expect(
      resolvePostTurnAuditScope([
        "lib/import/enrichment-presets/packs/investigator.ts",
        "lib/character/granted-equipment.ts",
      ]),
    ).toEqual({ full: true, classes: [] })
    expect(resolvePostTurnAuditScope(["lib/compendium/characteristic-modifiers.ts"])).toEqual({
      full: true,
      classes: [],
    })
  })

  it("full-sweeps unmapped trigger files", () => {
    expect(resolvePostTurnAuditScope(["lib/import/content-schema.ts"])).toEqual({
      full: true,
      classes: [],
    })
  })
})

describe("post-turn audit baselines", () => {
  it("parses vitest snapshots that use trailing commas", () => {
    expect(
      parseSnapshotJson(`
      [
        {
          "class": "Investigator",
          "feature": "Holy Trinkets",
          "level": 7,
        },
      ]
    `),
    ).toEqual([{ class: "Investigator", feature: "Holy Trinkets", level: 7 }])
  })

  it("loads Investigator resource-graph misses from the shipped snapshot", () => {
    const source = `
      expect(shipped.misses).toMatchInlineSnapshot(\`
      [
        {
          "class": "Investigator",
          "feature": "Holy Trinkets",
          "level": 7,
          "phrase": "You can use the following trinkets (expending a use of your Trinkets to do so)",
          "resource": "Trinkets",
        },
      ]
    \`)
      expect(shipped.orphanSpends).toMatchInlineSnapshot(\`[]\`)
    `
    const keys = knownResourceGraphKeysFromSource(source)
    expect([...keys.misses]).toEqual([
      "Investigator|Holy Trinkets|7|Trinkets|You can use the following trinkets (expending a use of your Trinkets to do so)",
    ])
    expect(keys.orphans.size).toBe(0)
    expect(knownGrantedEquipmentKeysFromSource("expect(x).toMatchInlineSnapshot(`[]`)").size).toBe(0)
  })
})
