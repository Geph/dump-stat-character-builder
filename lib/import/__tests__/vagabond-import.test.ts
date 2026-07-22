import { describe, expect, it } from "vitest"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import { sanitizeVagabondImportContent } from "@/lib/import/enrichment-presets/packs/vagabond"
import { auditImportWiring, summarizeFindings } from "@/lib/import/homebrew-import-ops"
import type { ImportContent } from "@/lib/import/content-schema"
import type { Feature } from "@/lib/types"

function sampleVagabond(): ImportContent {
  return {
    classes: [
      {
        name: "Vagabond",
        features: [
          {
            level: 1,
            name: "Battle Tactics",
            description: "Learn maneuvers fueled by Battle Dice.",
            isChoice: true,
            choices: {
              category: "Maneuver",
              count: 3,
              resourceKey: "maneuvers_known",
              optionsSource: "class_knacks",
              options: [],
              choiceCountByLevel: [
                { level: 1, count: 3 },
                { level: 2, count: 4 },
              ],
            },
          },
          {
            level: 2,
            name: "Desperate Attack",
            description: "You have Advantage on attack rolls while you are Bloodied.",
          },
        ],
      },
    ],
    class_resources: [
      {
        class_name: "Vagabond",
        resource_key: "battle_dice",
        name: "Battle Dice",
        uses: {
          type: "at_level",
          atLevelMode: "tier",
          atLevelTable: [{ level: 1, count: 2 }],
          recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
          rechargeOnInitiative: true,
        },
      },
    ],
    subclasses: [
      {
        name: "Brigand",
        class_name: "Vagabond",
        features: [
          {
            level: 3,
            name: "Ambush [Maneuver]",
            description: "Expend one Battle Die to Ambush.",
          },
        ],
      },
      {
        name: "Mage Brand",
        class_name: "Vagabond",
        features: [
          {
            level: 3,
            name: "Spellbranding",
            description: "Cantrips and Spellbrand Spellcasting.",
            mechanics: [
              {
                kind: "spellcasting_ability",
                spellcastingAbility: "charisma",
                confidence: "high",
              },
              {
                kind: "spells_known",
                spellChoiceGrants: [{ level: 0, count: 2 }],
                spellChoiceLabel: "Sorcerer cantrips",
                confidence: "high",
              },
            ],
          },
        ],
      },
    ],
    import_proposals: {
      custom_abilities: [
        {
          proposal_id: "battle_edge",
          name: "Battle Edge",
          ability_role: "knack",
          source_type: "class",
          source_name: "Vagabond",
          description: "Expend one Battle Die.",
        },
        {
          proposal_id: "ambush",
          name: "Ambush",
          ability_role: "knack",
          source_type: "subclass",
          source_name: "Brigand",
          description: "Expend one Battle Die to Ambush.",
        },
      ],
    },
  } as ImportContent
}

describe("Vagabond enrichment sanitize", () => {
  it("strips Battle Tactics resourceKey and demotes subclass maneuver knacks", () => {
    const sanitized = sanitizeVagabondImportContent(sampleVagabond())
    const tactics = sanitized.classes?.[0]?.features?.find((f) => f.name === "Battle Tactics")
    expect(tactics?.choices?.optionsSource).toBe("class_knacks")
    expect(tactics?.choices?.resourceKey).toBeUndefined()

    const ambush = sanitized.import_proposals?.custom_abilities?.find((a) => a.name === "Ambush")
    expect(ambush?.ability_role).toBeUndefined()
    expect(sanitized.import_proposals?.custom_abilities?.find((a) => a.name === "Battle Edge")?.ability_role).toBe(
      "knack",
    )

    const brigand = sanitized.subclasses?.find((s) => s.name === "Brigand")
    const feat = brigand?.features?.find((f) => f.name === "Ambush [Maneuver]") as Feature | undefined
    const grant = feat?.linkedModifiers
      ?.flatMap((m) => m.characteristics ?? [])
      .find((c) => c.type === "grant_custom_ability") as { abilityNames?: string[] } | undefined
    expect(grant?.abilityNames).toEqual(["Ambush"])
  })

  it("adds Mage Brand level-10 cantrip grant", () => {
    const sanitized = sanitizeVagabondImportContent(sampleVagabond())
    const spellbrand = sanitized.subclasses
      ?.find((s) => s.name === "Mage Brand")
      ?.features?.find((f) => f.name === "Spellbranding")
    const grants = (spellbrand?.mechanics ?? []).flatMap((m) => {
      if (!m || typeof m !== "object" || Array.isArray(m)) return []
      const row = m as { kind?: string; spellChoiceGrants?: { level?: number; unlocksAtClassLevel?: number }[] }
      return row.kind === "spells_known" ? (row.spellChoiceGrants ?? []) : []
    })
    expect(grants.some((g) => g.level === 0 && g.unlocksAtClassLevel === 10)).toBe(true)
  })

  it("enrichment path leaves auditor with no errors", () => {
    const enriched = applyImportEnrichmentPresets(sampleVagabond())
    const findings = auditImportWiring(enriched)
    expect(summarizeFindings(findings).errors, JSON.stringify(findings, null, 2)).toBe(0)
    expect(findings.some((f) => f.id === "vagabond.subclass_maneuver_knack")).toBe(false)
    expect(findings.some((f) => f.id === "vagabond.battle_tactics_resource_key")).toBe(false)
  })
})
