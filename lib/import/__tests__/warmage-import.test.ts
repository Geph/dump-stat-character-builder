import { describe, expect, it } from "vitest"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import { sanitizeWarmageImportContent } from "@/lib/import/enrichment-presets/packs/warmage"
import { auditImportWiring, summarizeFindings } from "@/lib/import/homebrew-import-ops"
import type { ImportContent } from "@/lib/import/content-schema"
import type { Feature } from "@/lib/types"

function sampleWarmage(): ImportContent {
  return {
    classes: [
      {
        name: "Warmage",
        features: [
          {
            level: 1,
            name: "Spellcasting",
            description: "Intelligence is your spellcasting ability for your Warmage spells.",
            mechanics: [
              {
                kind: "spellcasting_ability",
                spellcastingAbility: "intelligence",
                confidence: "high",
              },
              {
                kind: "spells_known",
                spellChoiceGrants: [{ level: 0, count: 4 }],
                spellChoiceLabel: "Warmage cantrips",
                confidence: "high",
              },
              {
                kind: "spells_known",
                spellChoiceGrants: [{ level: 0, count: 5 }],
                spellChoiceLabel: "Warmage cantrips",
                unlocksAtClassLevel: 3,
                confidence: "medium",
              },
              {
                kind: "spells_known",
                spellChoiceGrants: [{ level: 0, count: 6 }],
                spellChoiceLabel: "Warmage cantrips",
                unlocksAtClassLevel: 5,
                confidence: "medium",
              },
            ],
          },
          {
            level: 2,
            name: "Warmage Tricks",
            description: "You learn tricks.",
            isChoice: true,
            choices: {
              category: "Trick",
              count: 2,
              resourceKey: "tricks_known",
              optionsSource: "class_knacks",
              options: [],
            },
          },
          {
            level: 5,
            name: "Arcane Surge",
            description: "Double cantrip damage dice.",
          },
        ],
      },
    ],
    class_resources: [
      {
        class_name: "Warmage",
        resource_key: "tricks_known",
        name: "Tricks Known",
        uses: { type: "special", atLevelMode: "tier", atLevelTable: [{ level: 2, count: 2 }] },
      },
      {
        class_name: "Warmage",
        resource_key: "cantrip_bonus_dice",
        name: "Cantrip Bonus Dice",
        uses: { type: "special", atLevelMode: "tier", atLevelTable: [{ level: 5, count: 1 }] },
      },
    ],
    subclasses: [
      {
        name: "House of Kings",
        class_name: "Warmage",
        features: [
          {
            level: 3,
            name: "Battle Tactics",
            description: "You learn maneuvers fueled by Battle Dice.",
          },
          {
            level: 15,
            name: "Checkmate [Maneuver]",
            description: "Expend one Battle Die to direct an ally.",
          },
        ],
      },
      {
        name: "House of Bishops",
        class_name: "Warmage",
        features: [
          {
            level: 3,
            name: "Spellcasting",
            description: "You gain spell slots.",
          },
        ],
      },
    ],
    import_proposals: {
      custom_abilities: [
        {
          proposal_id: "blasting_cantrip",
          name: "Blasting Cantrip",
          ability_role: "knack",
          definition: "trick",
          description: "<p>Blasting.</p>",
          source_type: "class",
          source_name: "Warmage",
        },
      ],
    },
  } as ImportContent
}

describe("Warmage enrichment sanitize", () => {
  it("fixes cantrip grants, arcane_surge, Bishops third caster, and Kings maneuvers", () => {
    const sanitized = sanitizeWarmageImportContent(sampleWarmage())
    expect(sanitized.classes?.[0]?.spellcasting).toMatchObject({ ability: "Intelligence" })
    expect(
      (sanitized.classes?.[0]?.spellcasting as { caster_progression?: string } | undefined)
        ?.caster_progression,
    ).toBeUndefined()

    expect(sanitized.class_resources?.some((r) => r.resource_key === "arcane_surge")).toBe(true)
    const surge = sanitized.class_resources?.find((r) => r.resource_key === "arcane_surge")
    expect(surge?.uses.rechargeOnInitiative).toBe(1)

    const spell = sanitized.classes?.[0]?.features?.find((f) => f.name === "Spellcasting")
    const grants = (spell?.mechanics ?? []).flatMap((m) => {
      const row = m as { kind?: string; spellChoiceGrants?: { count?: number; unlocksAtClassLevel?: number }[] }
      return row.kind === "spells_known" ? (row.spellChoiceGrants ?? []) : []
    })
    expect(grants.some((g) => g.count === 4 && g.unlocksAtClassLevel == null)).toBe(true)
    expect(grants.some((g) => g.count === 1 && g.unlocksAtClassLevel === 3)).toBe(true)
    expect(grants.every((g) => g.count !== 5 && g.count !== 6)).toBe(true)

    const bishops = sanitized.subclasses?.find((s) => s.name === "House of Bishops")
    expect(bishops?.spellcasting).toMatchObject({
      ability: "Intelligence",
      caster_progression: "third",
      prepared: true,
    })

    expect(
      sanitized.import_proposals?.custom_abilities?.some(
        (a) => a.name === "Blitz" && a.source_name === "House of Kings",
      ),
    ).toBe(true)
    // Kings maneuvers demoted out of knack pool
    expect(
      sanitized.import_proposals?.custom_abilities?.find((a) => a.name === "Blitz")?.ability_role,
    ).toBeUndefined()

    const kings = sanitized.subclasses?.find((s) => s.name === "House of Kings")
    const tactics = kings?.features?.find((f) => f.name === "Battle Tactics") as Feature | undefined
    const grant = tactics?.linkedModifiers
      ?.flatMap((m) => m.characteristics ?? [])
      .find((c) => c.type === "grant_custom_ability") as { abilityNames?: string[] } | undefined
    expect(grant?.abilityNames).toEqual(
      expect.arrayContaining(["Blitz", "Check", "Gambit", "Stalemate"]),
    )
  })

  it("enrichment path leaves auditor with no errors", () => {
    const enriched = applyImportEnrichmentPresets(sampleWarmage())
    const findings = auditImportWiring(enriched)
    expect(summarizeFindings(findings).errors, JSON.stringify(findings, null, 2)).toBe(0)
  })
})
