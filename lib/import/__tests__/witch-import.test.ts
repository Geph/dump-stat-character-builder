import { describe, expect, it } from "vitest"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import { sanitizeWitchImportContent } from "@/lib/import/enrichment-presets/packs/witch"
import { auditImportWiring, summarizeFindings } from "@/lib/import/homebrew-import-ops"
import type { ImportContent } from "@/lib/import/content-schema"

function sampleWitch(): ImportContent {
  return {
    classes: [
      {
        name: "Witch",
        features: [
          {
            level: 1,
            name: "Spellcasting",
            description: "Charisma is your spellcasting ability for your Witch spells.",
            mechanics: [
              {
                kind: "spellcasting_ability",
                spellcastingAbility: "charisma",
                confidence: "high",
              },
              {
                kind: "spells_known",
                spellChoiceGrants: [{ level: 0, count: 2 }],
                spellChoiceLabel: "Witch cantrips",
                confidence: "high",
              },
              {
                kind: "spells_known",
                spellChoiceGrants: [{ level: 0, count: 3 }],
                spellChoiceLabel: "Witch cantrips",
                unlocksAtClassLevel: 4,
                confidence: "high",
              },
              {
                kind: "spells_known",
                spellChoiceGrants: [{ level: 0, count: 4 }],
                spellChoiceLabel: "Witch cantrips",
                unlocksAtClassLevel: 10,
                confidence: "high",
              },
            ],
          },
          {
            level: 1,
            name: "Hexes",
            description: "You know two Hexes of your choice.",
            mechanics: [
              {
                kind: "spells_known",
                spellChoiceGrants: [{ level: 0, count: 2 }],
                spellChoiceLabel: "Hexes",
                confidence: "high",
              },
              {
                kind: "spells_known",
                spellChoiceGrants: [{ level: 0, count: 3 }],
                spellChoiceLabel: "Hexes",
                unlocksAtClassLevel: 2,
                confidence: "medium",
              },
              {
                kind: "spells_known",
                spellChoiceGrants: [{ level: 0, count: 4 }],
                spellChoiceLabel: "Hexes",
                unlocksAtClassLevel: 5,
                confidence: "medium",
              },
            ],
          },
          {
            level: 11,
            name: "Grand Hex",
            description: "You gain one Grand Hex of your choice.",
            isChoice: true,
            choices: {
              category: "Grand Hex",
              count: 1,
              options: [
                {
                  name: "Abominable Familiar",
                  description: "<p>Shape-shift your familiar.</p>",
                },
              ],
            },
            mechanics: [
              {
                kind: "grant_creature",
                creatureNames: ["Abominable Familiar"],
                confidence: "medium",
              },
            ],
          },
        ],
      },
    ],
    class_resources: [
      {
        class_name: "Witch",
        resource_key: "hexes_known",
        name: "Hexes Known",
        uses: {
          type: "special",
          atLevelMode: "tier",
          atLevelTable: [{ level: 1, count: 2 }],
        },
      },
      {
        class_name: "Witch",
        resource_key: "grand_hexes_known",
        name: "Grand Hexes Known",
        uses: {
          type: "special",
          atLevelMode: "tier",
          atLevelTable: [{ level: 11, count: 1 }],
        },
      },
    ],
  } as ImportContent
}

describe("Witch enrichment sanitize", () => {
  it("fixes spellcasting, grand_hexes key, Abominable auto-grant, and Hex grant shape", () => {
    const sanitized = sanitizeWitchImportContent(sampleWitch())
    expect(sanitized.classes?.[0]?.spellcasting).toMatchObject({
      ability: "Charisma",
      caster_progression: "full",
      prepared: true,
    })
    expect(sanitized.class_resources?.some((r) => r.resource_key === "grand_hexes")).toBe(true)
    expect(sanitized.class_resources?.some((r) => r.resource_key === "grand_hexes_known")).toBe(false)

    const grand = sanitized.classes?.[0]?.features?.find((f) => f.name === "Grand Hex")
    expect(grand?.choices?.resourceKey).toBe("grand_hexes")
    expect(
      (grand?.mechanics ?? []).some((m) => {
        const row = m as { kind?: string; creatureNames?: string[] }
        return row.kind === "grant_creature"
      }),
    ).toBe(false)
    expect(grand?.choices?.options?.some((o) => o.name === "Abominable Familiar")).toBe(true)

    const hexes = sanitized.classes?.[0]?.features?.find((f) => f.name === "Hexes")
    const grants = (hexes?.mechanics ?? []).flatMap((m) => {
      const row = m as { kind?: string; spellChoiceGrants?: { count?: number; unlocksAtClassLevel?: number }[] }
      return row.kind === "spells_known" ? (row.spellChoiceGrants ?? []) : []
    })
    expect(grants.some((g) => g.count === 2 && g.unlocksAtClassLevel == null)).toBe(true)
    expect(grants.some((g) => g.count === 1 && g.unlocksAtClassLevel === 2)).toBe(true)
    expect(grants.every((g) => g.count !== 3 && g.count !== 4)).toBe(true)
  })

  it("enrichment path leaves auditor with no errors", () => {
    const enriched = applyImportEnrichmentPresets(sampleWitch())
    const findings = auditImportWiring(enriched)
    expect(summarizeFindings(findings).errors, JSON.stringify(findings, null, 2)).toBe(0)
    expect(findings.some((f) => f.id === "witch.grand_hex_auto_familiar")).toBe(false)
    expect(findings.some((f) => f.id === "witch.grand_hexes_key")).toBe(false)
  })
})
