import { describe, expect, it } from "vitest"
import { ImportMechanicSchema } from "@/lib/import/content-schema"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { aiMechanicsToDetections } from "@/lib/import/parse-ai-mechanics"

describe("Dance/Glamour follow-up mechanics", () => {
  it("accepts damage_reduction kind instead of silently dropping it", () => {
    const parsed = ImportMechanicSchema.safeParse({
      kind: "damage_reduction",
      reductionMode: "evasion",
      sourcePhrase: "take no damage if you succeed… half if you fail",
      confidence: "high",
    })
    expect(parsed.success).toBe(true)

    const detections = aiMechanicsToDetections([parsed.data!], {
      contentKind: "subclass_feature",
      featureName: "Leading Evasion",
    })
    expect(detections.some((row) => row.ruleId === "ai.damage_reduction.evasion")).toBe(true)
    expect(detections[0]?.instance.catalogRefId).toBe("cat_fx_damage_reduction")
  })

  it("rejects invented mechanic kinds that are not in AI_MECHANIC_KINDS", () => {
    expect(
      ImportMechanicSchema.safeParse({
        kind: "invented_from_catalog_suffix",
        sourcePhrase: "x",
        confidence: "high",
      }).success,
    ).toBe(false)
  })

  it("wires Evasion via basedOnSrdFeature when the display name differs", () => {
    const enriched = enrichImportContentModifiers({
      subclasses: [
        {
          name: "College of Dance",
          class_name: "Bard",
          description: null,
          features: [
            {
              level: 6,
              name: "Leading Evasion",
              description:
                "When you are subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage if you succeed on the saving throw, and only half damage if you fail. You can also protect one ally.",
              basedOnSrdFeature: "Evasion",
            },
          ],
        },
      ],
    })
    const feature = enriched.subclasses?.[0]?.features?.[0] as
      | { linkedModifiers?: { catalogRefId: string }[] }
      | undefined
    const catalogs = feature?.linkedModifiers?.map((entry) => entry.catalogRefId) ?? []
    expect(catalogs).toContain("cat_fx_damage_reduction")
  })
})
