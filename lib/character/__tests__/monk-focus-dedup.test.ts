import { readFileSync } from "fs"
import { describe, expect, it } from "vitest"
import { collectFeatureUsesResources } from "@/lib/character/collect-feature-uses-resources"
import { enrichClassFeaturesWithResources } from "@/lib/compendium/class-resource-features"
import { enrichClassFeatureWithModifierPresets } from "@/lib/compendium/enrich-srd-class-features"
import { resolveClassResourcesForClass } from "@/lib/compendium/resolve-class-resources"
import type { Feature, DndClass } from "@/lib/types"

describe("Monk Focus Points resource tracker", () => {
  it("lists Focus Points once from class resources and not again from feature uses", () => {
    const classes = JSON.parse(
      readFileSync("lib/srd/seed-data/classes.json", "utf8"),
    ) as { name: string; features: Feature[] }[]
    const monkSeed = classes.find((row) => row.name === "Monk")
    expect(monkSeed).toBeTruthy()

    let features = monkSeed!.features.map((feature) =>
      enrichClassFeatureWithModifierPresets("Monk", feature),
    )
    features = enrichClassFeaturesWithResources("Monk", features)
    const cls = { ...monkSeed!, id: "cls_monk", features, class_resources: null } as unknown as DndClass

    const fromClass = resolveClassResourcesForClass(cls)
    const fromFeatures = collectFeatureUsesResources(
      [{ row: { class_id: "cls_monk", level: 5, subclass_id: null, order: 0 }, class: cls }],
      [],
    )

    expect(fromClass.filter((row) => /focus/i.test(row.name))).toHaveLength(1)
    expect(fromFeatures.filter((row) => /focus/i.test(row.name))).toHaveLength(0)
  })

  it("dedupes identical focus_points ids when embedded twice", () => {
    const classes = JSON.parse(
      readFileSync("lib/srd/seed-data/classes.json", "utf8"),
    ) as { name: string; features: Feature[] }[]
    const monkSeed = classes.find((row) => row.name === "Monk")!
    const focus = {
      id: "focus_points",
      name: "Focus Points",
      description: "dup",
      uses: {
        type: "at_level" as const,
        atLevelMode: "multiply_level" as const,
        recharges: [{ rest: "short_rest" as const }],
        atLevelTable: [{ level: 1, count: 1 }],
      },
    }
    const cls = {
      ...monkSeed,
      id: "cls_monk",
      features: monkSeed.features,
      class_resources: [focus, { ...focus }],
    } as unknown as DndClass

    expect(resolveClassResourcesForClass(cls).filter((row) => row.id === "focus_points")).toHaveLength(
      1,
    )
  })
})
