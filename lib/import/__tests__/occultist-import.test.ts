import { describe, expect, it } from "vitest"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import { sanitizeOccultistImportContent } from "@/lib/import/enrichment-presets/packs/occultist"
import { auditImportWiring, summarizeFindings } from "@/lib/import/homebrew-import-ops"
import type { ImportContent } from "@/lib/import/content-schema"

function sampleOccultist(): ImportContent {
  // Nested classes[0].subclasses is intentionally invalid ImportContent shape — sanitizer hoists it.
  return {
    classes: [
      {
        name: "Occultist",
        description: null,
        hit_die: 6,
        primary_ability: ["Wisdom"],
        features: [
          {
            level: 1,
            name: "Spellcasting",
            description: "Wisdom is your spellcasting ability for your Occultist spells.",
          },
          {
            level: 1,
            name: "Occult Tradition",
            description: "Choose an occult tradition.",
          },
          {
            level: 2,
            name: "Occult Rites",
            description: "At 2nd level, you gain two occult rites. When you gain a level, you can replace one.",
            isChoice: true,
            choices: {
              category: "Occult Rite",
              count: 2,
              resourceKey: "occult_rites_known",
              optionsSource: "class_knacks",
              swappableOnRest: true,
              swapRestType: "long",
              options: [],
            },
          },
        ],
        subclasses: [
          {
            name: "Witch",
            class_name: "Occultist",
            description: "<p>Tradition of the Witch.</p>",
            features: [
              {
                level: 1,
                name: "Witch's Magic",
                description: "You learn find familiar and two cantrips.",
                mechanics: [
                  {
                    kind: "spells_known",
                    spellChoiceGrants: [
                      { level: 1, count: 1, spellNames: ["Find Familiar"] },
                    ],
                    spellChoiceLabel: "Witch's Magic bonus spell",
                    confidence: "high",
                  },
                  {
                    kind: "spells_known",
                    spellChoiceGrants: [{ level: 0, count: 2 }],
                    spellChoiceLabel: "Witch's Magic bonus cantrips",
                    confidence: "high",
                  },
                ],
              },
            ],
          },
          {
            name: "Hedge Mage",
            class_name: "Occultist",
            description: "<p>Tradition of the Hedge Mage.</p>",
            features: [{ level: 1, name: "Practical Skills", description: "Skills." }],
          },
        ],
      },
    ],
    class_resources: [
      {
        class_name: "Occultist",
        resource_key: "occult_rites_known",
        name: "Occult Rites Known",
        uses: {
          type: "special",
          atLevelMode: "tier",
          atLevelTable: [
            { level: 2, count: 2 },
            { level: 5, count: 3 },
          ],
        },
      },
    ],
    import_proposals: {
      custom_abilities: [
        {
          proposal_id: "alchemical_rites",
          name: "Alchemical Rites",
          ability_role: "knack",
          definition: "rite",
          description: "<p>Alchemy.</p>",
          source_type: "class",
          source_name: "Occultist",
        },
        {
          proposal_id: "animate_broom",
          name: "Animate Broom",
          ability_role: "knack",
          definition: "rite",
          description: "<p>Broom.</p>",
          source_type: "class",
          source_name: "Occultist",
          prerequisite: "12th-level Witch",
        },
        {
          proposal_id: "revelation_of_fire",
          name: "Revelation of Fire",
          ability_role: "knack",
          definition: "rite",
          description: "<p>Fire.</p>",
          source_type: "class",
          source_name: "Occultist",
          prerequisite: "Mystery of Fire",
        },
      ],
    },
  } as unknown as ImportContent
}

describe("Occultist enrichment sanitize", () => {
  it("hoists traditions, sets WIS full known caster, fixes rites, tags tradition knacks", () => {
    const sanitized = sanitizeOccultistImportContent(sampleOccultist())

    expect(sanitized.classes?.[0]?.spellcasting).toMatchObject({
      ability: "Wisdom",
      caster_progression: "full",
      prepared: false,
    })
    expect((sanitized.classes?.[0] as { subclasses?: unknown })?.subclasses).toBeUndefined()
    expect(sanitized.subclasses?.map((s) => s.name).sort()).toEqual(["Hedge Mage", "Witch"])

    const rites = sanitized.classes?.[0]?.features?.find((f) => f.name === "Occult Rites")
    expect(rites?.choices).toMatchObject({
      optionsSource: "class_knacks",
      resourceKey: "occult_rites_known",
      swappableOnRest: false,
    })

    const spell = sanitized.classes?.[0]?.features?.find((f) => f.name === "Spellcasting")
    const grants = (spell?.mechanics ?? []).flatMap((m) => {
      const row = m as {
        kind?: string
        spellChoiceGrants?: { count?: number; level?: number; unlocksAtClassLevel?: number }[]
      }
      return row.kind === "spells_known" ? (row.spellChoiceGrants ?? []) : []
    })
    expect(grants.some((g) => g.level === 0 && g.count === 3 && g.unlocksAtClassLevel == null)).toBe(
      true,
    )
    expect(grants.some((g) => g.level === 0 && g.count === 1 && g.unlocksAtClassLevel === 4)).toBe(true)
    expect(grants.some((g) => g.level === 1 && g.count === 3 && g.unlocksAtClassLevel == null)).toBe(
      true,
    )

    expect(
      sanitized.import_proposals?.custom_abilities?.find((a) => a.name === "Animate Broom"),
    ).toMatchObject({ source_type: "subclass", source_name: "Witch", ability_role: "knack" })
    expect(
      sanitized.import_proposals?.custom_abilities?.find((a) => a.name === "Revelation of Fire"),
    ).toMatchObject({ source_type: "subclass", source_name: "Oracle" })

    const witchMagic = sanitized.subclasses
      ?.find((s) => s.name === "Witch")
      ?.features?.find((f) => f.name === "Witch's Magic")
    const familiar = (witchMagic?.mechanics ?? []).find((m) => {
      const row = m as { kind?: string; spellNames?: string[] }
      return row.kind === "spells_known" && row.spellNames?.includes("Find Familiar")
    })
    expect(familiar).toBeTruthy()
  })

  it("enrichment path leaves auditor with no errors", () => {
    const enriched = applyImportEnrichmentPresets(sampleOccultist())
    const findings = auditImportWiring(enriched)
    expect(summarizeFindings(findings).errors, JSON.stringify(findings, null, 2)).toBe(0)
  })
})
