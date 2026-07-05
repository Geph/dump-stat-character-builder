import { readFileSync } from "fs"
import { describe, expect, it } from "vitest"
import { collectFeatureUsesResources } from "@/lib/character/collect-feature-uses-resources"
import { enrichClassFeaturesWithResources } from "@/lib/compendium/class-resource-features"
import { enrichClassFeatureWithModifierPresets } from "@/lib/compendium/enrich-srd-class-features"
import { resolveClassResourcesForClass } from "@/lib/compendium/resolve-class-resources"
import type { Feature } from "@/lib/types"

describe("Bardic Inspiration resource tracker dedup", () => {
  it("does not duplicate bardic inspiration from class resources and feature uses", () => {
    const classes = JSON.parse(
      readFileSync("lib/srd/seed-data/classes.json", "utf8"),
    ) as { name: string; features: Feature[] }[]
    const bardSeed = classes.find((row) => row.name === "Bard")
    expect(bardSeed).toBeTruthy()

    let features = bardSeed!.features.map((feature) =>
      enrichClassFeatureWithModifierPresets("Bard", feature),
    )
    features = enrichClassFeaturesWithResources("Bard", features)
    const cls = { ...bardSeed!, id: "cls_bard", features, class_resources: null }

    const fromClass = resolveClassResourcesForClass(cls)
    const fromFeatures = collectFeatureUsesResources(
      [{ row: { class_id: "cls_bard", level: 5, subclass_id: null }, class: cls }],
      [],
    )

    expect(fromClass.map((row) => row.name)).toContain("Bardic Inspiration")
    expect(fromFeatures.map((row) => row.name)).not.toContain("Bardic Inspiration")
  })

  it("still tracks standalone feature pools like Innate Arcanum", () => {
    const entries = collectFeatureUsesResources(
      [
        {
          row: { class_id: "cls_wiz", level: 11, subclass_id: null },
          class: {
            id: "cls_wiz",
            name: "Wizard",
            features: [
              {
                level: 11,
                name: "Mystic Arcanum",
                description: "",
                linkedModifiers: [
                  {
                    instanceId: "modinst_arcanum",
                    catalogRefId: "cat_char_uses",
                    characteristics: [
                      {
                        id: "mod_arcanum",
                        type: "uses",
                        label: "Innate Arcanum",
                        uses: { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
      [],
    )

    expect(entries).toHaveLength(1)
    expect(entries[0]?.name).toBe("Innate Arcanum")
  })
})
