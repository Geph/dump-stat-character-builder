import { describe, expect, it } from "vitest"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import { sanitizeBeastheartImportContent } from "@/lib/import/enrichment-presets/packs/beastheart"
import { auditImportWiring, summarizeFindings } from "@/lib/import/homebrew-import-ops"
import type { ImportContent } from "@/lib/import/content-schema"

function sampleBeastheart(): ImportContent {
  return {
    classes: [
      {
        name: "Beastheart",
        description: null,
        hit_die: 8,
        primary_ability: ["Strength", "Wisdom"],
        features: [
          {
            level: 1,
            name: "Companion",
            description: "You gain a companion.",
            mechanics: [
              {
                kind: "grant_creature",
                creatureNames: ["Basilisk Companion"],
                creatureChoiceOptions: ["Basilisk Companion"],
                confidence: "high",
              },
            ],
          },
          {
            level: 2,
            name: "Primal Exploits",
            description: "Exploit save DC uses Wisdom.",
            isChoice: true,
            mechanics: [
              {
                kind: "spellcasting_ability",
                spellcastingAbility: "wisdom",
                confidence: "medium",
              },
            ],
            choices: {
              category: "Primal Exploit",
              count: 3,
              optionsSource: "class_knacks",
              options: [],
            },
          },
          {
            level: 3,
            name: "Companion Bond",
            description: "Choose a bond.",
            isChoice: true,
            choices: {
              category: "Bond",
              count: 1,
              options: [{ name: "Infernal Bond", description: "stub" }],
            },
          },
        ],
      },
    ],
    class_resources: [
      {
        class_name: "Beastheart",
        resource_key: "ferocity",
        name: "Ferocity",
        description: "Incomplete stub.",
        uses: { type: "special", atLevelMode: "tier", atLevelTable: [] },
      },
    ],
    subclasses: [
      {
        name: "Infernal Bond",
        class_name: "Beastheart",
        description: null,
        features: [
          {
            level: 3,
            name: "Infernal Exploits",
            description: "Gain infernal exploits.",
            isChoice: true,
            choices: {
              category: "Infernal Exploit",
              count: 1,
              optionsSource: "class_knacks",
              options: [],
            },
          },
        ],
      },
      {
        name: "Primordial Bond",
        class_name: "Beastheart",
        description: null,
        features: [
          {
            level: 3,
            name: "Nature Exploits",
            description: "Gain nature exploits.",
            isChoice: true,
            choices: {
              category: "Nature Exploit",
              count: 1,
              optionsSource: "class_knacks",
              options: [],
            },
          },
        ],
      },
      {
        name: "Protector Bond",
        class_name: "Beastheart",
        description: null,
        features: [
          {
            level: 15,
            name: "Undying Protector",
            description:
              "<p>Spend 2 ferocity.</p><p><em>Note: this feature's text was interleaved with Primordial Bond's Allied Weather in the source PDF's column layout and has been reconstructed from context.</em></p>",
          },
        ],
      },
    ],
    creatures: [
      {
        name: "Basilisk Companion",
        category: "companion",
        description: null,
        actions: [
          {
            name: "Bite (Signature Attack)",
            tag: null,
            text: "Melee attack.",
          },
          {
            name: "Poison Spittle",
            tag: "2 Ferocity",
            unlock_level_label: "1st Level",
            unlock_level_number: 1,
            text: "Spend ferocity.",
          },
        ],
      },
    ],
    import_proposals: {
      custom_abilities: [
        {
          proposal_id: "aid_us",
          name: "Aid Us, Friend",
          ability_role: "knack",
          definition: "Primal Exploit",
          description: "<p>Primal.</p>",
          source_type: "class",
          source_name: "Beastheart",
          prerequisite: "2th-level Beastheart",
        },
        {
          proposal_id: "drain_them",
          name: "Drain Them",
          ability_role: "knack",
          definition: "Infernal Exploit",
          description: "<p>Infernal.</p>",
          source_type: "subclass",
          source_name: "Infernal Bond",
          prerequisite: "3th-level Beastheart",
        },
        {
          proposal_id: "elemental_shield",
          name: "Elemental Shield",
          ability_role: "knack",
          definition: "Nature Exploit",
          description: "<p>Nature.</p>",
          source_type: "subclass",
          source_name: "Primordial Bond",
        },
      ],
    },
  } as unknown as ImportContent
}

describe("Beastheart enrichment sanitize", () => {
  it("fixes ferocity, demotes subclass exploit knacks, and normalizes companions", () => {
    const sanitized = sanitizeBeastheartImportContent(sampleBeastheart())

    const ferocity = sanitized.class_resources?.find((r) => r.resource_key === "ferocity")
    expect(ferocity?.uses.type).toBe("special")
    expect(ferocity?.description).toMatch(/Rampage/i)
    expect(sanitized.class_resources?.some((r) => r.resource_key === "primal_exploits_known")).toBe(
      true,
    )

    const primal = sanitized.classes?.[0]?.features?.find((f) => f.name === "Primal Exploits")
    expect(primal?.choices).toMatchObject({
      optionsSource: "class_knacks",
      resourceKey: "primal_exploits_known",
    })
    expect(primal?.mechanics?.some((m) => (m as { kind?: string }).kind === "spellcasting_ability")).toBe(
      false,
    )

    const bond = sanitized.classes?.[0]?.features?.find((f) => f.name === "Companion Bond")
    expect(bond?.isChoice).toBeFalsy()
    expect(bond?.choices).toBeUndefined()

    expect(
      sanitized.import_proposals?.custom_abilities?.find((a) => a.name === "Drain Them")
        ?.ability_role,
    ).toBeUndefined()
    expect(
      sanitized.import_proposals?.custom_abilities?.find((a) => a.name === "Aid Us, Friend")
        ?.prerequisite,
    ).toMatch(/2nd-level/)

    const infernal = sanitized.subclasses?.find((s) => s.name === "Infernal Bond")
    const infernalExploits = infernal?.features?.find((f) => f.name === "Infernal Exploits")
    expect(infernalExploits?.choices?.optionsSource).toBeUndefined()
    expect(infernalExploits?.choices?.options?.map((o) => o.name)).toContain("Drain Them")

    const bite = (sanitized.creatures?.[0] as { actions?: { name?: string; tag?: string | null }[] })
      ?.actions?.[0]
    expect(bite?.name).toBe("Bite")
    expect(bite?.tag).toBe("Signature Attack")

    const undying = sanitized.subclasses
      ?.find((s) => s.name === "Protector Bond")
      ?.features?.find((f) => f.name === "Undying Protector")
    expect(undying?.description).not.toMatch(/interleaved/i)
  })

  it("enrichment path leaves auditor with no errors", () => {
    const enriched = applyImportEnrichmentPresets(sampleBeastheart())
    const findings = auditImportWiring(enriched)
    expect(summarizeFindings(findings).errors, JSON.stringify(findings, null, 2)).toBe(0)
  })
})
