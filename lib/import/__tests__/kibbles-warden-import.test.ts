import { describe, expect, it } from "vitest"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import {
  isKibblesTastyWarden,
  sanitizeKibblesWardenImportContent,
} from "@/lib/import/enrichment-presets/packs/kibbles-warden"
import { auditImportWiring, summarizeFindings } from "@/lib/import/homebrew-import-ops"
import type { ImportContent } from "@/lib/import/content-schema"

function sampleKibblesWarden(): ImportContent {
  // Nested classes[0].subclasses is intentionally invalid ImportContent shape — sanitizer hoists it.
  return {
    classes: [
      {
        name: "Warden",
        description: null,
        hit_die: 12,
        primary_ability: ["Strength", "Constitution"],
        features: [
          {
            level: 1,
            name: "Mystic Bulwark",
            description: "Reduce bludgeoning, piercing, or slashing damage by 2.",
          },
          {
            level: 1,
            name: "Warden Bond",
            description: "Choose a Warden Bond. Your choice grants features at 1st, 3rd, 7th, 14th, and 17th levels.",
            isChoice: true,
            choices: {
              category: "Warden Bond",
              count: 1,
              options: [{ name: "Elemental Soul", description: "stub" }],
            },
          },
          {
            level: 2,
            name: "Endurance Dice",
            description:
              "You gain three d8 Endurance Dice. Once per turn, when you take damage, you can roll an Endurance Die to reduce the damage.",
          },
          {
            level: 3,
            name: "Primal Manifestations",
            description: "You gain two Primal Manifestations. When you gain a level, you can replace one.",
            isChoice: true,
            choices: {
              category: "Primal Manifestation",
              count: 2,
              resourceKey: "primal_manifestations_known",
              optionsSource: "class_knacks",
              swappableOnRest: true,
              options: [],
            },
          },
          {
            level: 6,
            name: "Empowered Endurance",
            description:
              "If you roll for initiative with no Endurance Dice remaining, you regain one Endurance Die.",
          },
        ],
        subclasses: [
          {
            name: "Elemental Soul",
            class_name: "Warden",
            description: "<p>Elemental planes.</p>",
            features: [
              {
                level: 1,
                name: "Elemental Armaments",
                description: "Manifest elemental weapons.",
              },
            ],
          },
        ],
      },
    ],
    class_resources: [
      {
        class_name: "Warden",
        resource_key: "endurance_dice",
        name: "Endurance Dice",
        uses: {
          type: "at_level",
          atLevelMode: "tier",
          atLevelTable: [
            { level: 2, count: 3 },
            { level: 5, count: 4 },
          ],
          dieSidesByLevel: [
            { level: 2, count: 8 },
            { level: 5, count: 10 },
            { level: 11, count: 12 },
          ],
          recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
        },
      },
      {
        class_name: "Warden",
        resource_key: "primal_manifestations_known",
        name: "Primal Manifestations Known",
        uses: {
          type: "special",
          atLevelMode: "tier",
          atLevelTable: [
            { level: 3, count: 2 },
            { level: 6, count: 3 },
          ],
        },
      },
    ],
    import_proposals: {
      custom_abilities: [
        {
          proposal_id: "warden_manifestation_balanced_assault",
          name: "Balanced Assault",
          definition: "Primal Manifestation.",
          description: "<p>You gain Two-Weapon Fighting.</p>",
          level_requirement: null,
          source_type: "class",
          source_name: "Warden",
        },
      ],
    },
  } as unknown as ImportContent
}

describe("KibblesTasty Warden enrichment sanitize", () => {
  it("detects Kibbles Warden and not MHP Interrupt Warden", () => {
    expect(isKibblesTastyWarden(sampleKibblesWarden())).toBe(true)
    expect(
      isKibblesTastyWarden({
        classes: [
          {
            name: "Warden",
            description: null,
            hit_die: 10,
            primary_ability: ["Strength"],
            features: [
              { level: 1, name: "Interrupt", description: "Interrupt." },
              { level: 1, name: "Survive", description: "Survive." },
            ],
          },
        ],
      }),
    ).toBe(false)
  })

  it("remaps manifestation resource key, ensures die size, and strips Bond picker", () => {
    const sanitized = sanitizeKibblesWardenImportContent(sampleKibblesWarden())
    const keys = (sanitized.class_resources ?? []).map((r) => r.resource_key)
    expect(keys).toContain("endurance_dice")
    expect(keys).toContain("endurance_die_size")
    expect(keys).toContain("primal_manifestations")
    expect(keys).not.toContain("primal_manifestations_known")

    const dieSize = sanitized.class_resources?.find((r) => r.resource_key === "endurance_die_size")
    expect(dieSize?.uses.type).toBe("special")
    expect(dieSize?.uses.dieType).toBe("d12")

    const bond = sanitized.classes?.[0]?.features?.find((f) => f.name === "Warden Bond")
    expect(bond?.isChoice).toBeUndefined()
    expect(bond?.choices).toBeUndefined()

    const manifestations = sanitized.classes?.[0]?.features?.find(
      (f) => f.name === "Primal Manifestations",
    )
    expect(manifestations?.choices?.optionsSource).toBe("class_knacks")
    expect(manifestations?.choices?.resourceKey).toBe("primal_manifestations")
    expect(manifestations?.choices?.swappableOnRest).toBe(false)

    expect(sanitized.subclasses?.some((sc) => sc.name === "Elemental Soul")).toBe(true)
    expect(sanitized.import_proposals?.custom_abilities?.[0]?.ability_role).toBe("knack")
  })

  it("sets endurance_dice rechargeOnInitiative from Empowered Endurance", () => {
    const enriched = applyImportEnrichmentPresets(sampleKibblesWarden())
    const dice = enriched.class_resources?.find((r) => r.resource_key === "endurance_dice")
    expect(dice?.uses.rechargeOnInitiative).toBe(1)
  })

  it("audits clean after sanitize", () => {
    const sanitized = sanitizeKibblesWardenImportContent(sampleKibblesWarden())
    const summary = summarizeFindings(auditImportWiring(sanitized))
    expect(summary.errors).toBe(0)
  })
})
