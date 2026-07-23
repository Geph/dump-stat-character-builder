import { describe, expect, it } from "vitest"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import { sanitizeInventorImportContent } from "@/lib/import/enrichment-presets/packs/inventor"
import { auditImportWiring, summarizeFindings } from "@/lib/import/homebrew-import-ops"
import type { ImportContent } from "@/lib/import/content-schema"

function sampleInventor(): ImportContent {
  return {
    classes: [
      {
        name: "Inventor",
        description: null,
        hit_die: 8,
        primary_ability: ["Intelligence"],
        features: [
          {
            level: 1,
            name: "Inventor Specialization",
            description: "Choose a specialization.",
            isChoice: true,
            choices: {
              category: "Specialization",
              count: 1,
              options: [{ name: "Gadgetsmith", description: "stub" }],
            },
          },
          {
            level: 2,
            name: "Spellcasting",
            description: "You know Inventor spells. Intelligence is your spellcasting ability.",
          },
          {
            level: 3,
            name: "Inventor Specialization feature",
            description: "You gain a feature from your Inventor Specialization.",
          },
          {
            level: 3,
            name: "Specialization Upgrade",
            description: "Choose an upgrade from your specialization list. Exchange one when you gain a level.",
            isChoice: true,
            choices: {
              category: "Upgrade",
              count: 1,
              resourceKey: "upgrades",
              optionsSource: "class_upgrades",
              swappableOnRest: true,
              options: [],
            },
          },
        ],
        subclasses: [
          {
            name: "Gadgetsmith",
            class_name: "Inventor",
            description: "<p>Gadgets.</p>",
            features: [
              {
                level: 1,
                name: "Gadgetsmith's Proficiency",
                description: "Tools.",
              },
            ],
          },
        ],
      },
    ],
    class_resources: [
      {
        class_name: "Inventor",
        resource_key: "upgrades",
        name: "Upgrades",
        uses: {
          type: "at_level",
          atLevelMode: "tier",
          atLevelTable: [
            { level: 3, count: 1 },
            { level: 5, count: 2 },
          ],
          recharges: [{ rest: "long_rest" }],
        },
      },
    ],
    import_proposals: {
      custom_abilities: [
        {
          proposal_id: "gadgetsmith_airburst_mine",
          name: "Airburst Mine",
          definition: "Gadget.",
          description: "<p>Blast.</p>",
          level_requirement: null,
          source_type: "subclass",
          source_name: "Gadgetsmith",
        },
        {
          proposal_id: "inventor_shield_proficiency",
          name: "Shield Proficiency",
          definition: "Generic.",
          description: "<p>Shields.</p>",
          level_requirement: null,
          source_type: "subclass",
          source_name: "Gadgetsmith",
        },
      ],
    },
    creatures: [
      {
        name: "Golem",
        category: "companion",
        size: "Medium",
        type: "construct",
        alignment: "unaligned",
        ac: "14",
        hp: "10",
        speed: "30 ft.",
        ability_scores: {
          strength: 14,
          dexterity: 10,
          constitution: 14,
          intelligence: 3,
          wisdom: 8,
          charisma: 1,
        },
      },
    ],
    subclasses: [
      {
        name: "Golemsmith",
        class_name: "Inventor",
        description: "<p>Golem.</p>",
        features: [
          {
            level: 1,
            name: "Mechanical Golem",
            description: "You forge a mechanical golem.",
          },
        ],
      },
    ],
  } as unknown as ImportContent
}

describe("KibblesTasty Inventor enrichment sanitize", () => {
  it("forces upgrades to special and strips specialization picker / placeholders", () => {
    const sanitized = sanitizeInventorImportContent(sampleInventor())
    const upgrades = sanitized.class_resources?.find((r) => r.resource_key === "upgrades")
    expect(upgrades?.uses.type).toBe("special")
    expect(upgrades?.uses.recharges).toBeUndefined()

    const names = (sanitized.classes?.[0]?.features ?? []).map((f) => f.name)
    expect(names).not.toContain("Inventor Specialization feature")

    const spec = sanitized.classes?.[0]?.features?.find((f) => f.name === "Inventor Specialization")
    expect(spec?.isChoice).toBeUndefined()
    expect(spec?.choices).toBeUndefined()

    const upgradeFeat = sanitized.classes?.[0]?.features?.find(
      (f) => f.name === "Specialization Upgrade",
    )
    expect(upgradeFeat?.choices?.optionsSource).toBe("class_upgrades")
    expect(upgradeFeat?.choices?.resourceKey).toBe("upgrades")
    expect(upgradeFeat?.choices?.swappableOnRest).toBe(false)

    expect(sanitized.subclasses?.some((sc) => sc.name === "Gadgetsmith")).toBe(true)
    const shield = sanitized.import_proposals?.custom_abilities?.find(
      (a) => a.name === "Shield Proficiency",
    )
    expect(shield?.source_type).toBe("class")
    expect(shield?.source_name).toBe("Inventor")
    expect(shield?.ability_role).toBe("upgrade")
  })

  it("wires INT half Spells Known and Golem grant_creature", () => {
    const sanitized = sanitizeInventorImportContent(sampleInventor())
    expect(sanitized.classes?.[0]?.spellcasting).toMatchObject({
      ability: "Intelligence",
      caster_progression: "half",
      prepared: false,
    })
    const spellcasting = sanitized.classes?.[0]?.features?.find((f) => f.name === "Spellcasting")
    const grants = (spellcasting?.mechanics ?? []).find(
      (m) => (m as { kind?: string }).kind === "spells_known",
    ) as { spellChoiceGrants?: { count: number; unlocksAtClassLevel?: number }[] } | undefined
    expect(grants?.spellChoiceGrants?.[0]).toMatchObject({ count: 3 })
    expect(grants?.spellChoiceGrants?.some((g) => g.unlocksAtClassLevel === 3 && g.count === 1)).toBe(
      true,
    )

    const golem = sanitized.subclasses?.find((sc) => sc.name === "Golemsmith")
    const mech = golem?.features?.find((f) => f.name === "Mechanical Golem")
    const grant = (mech?.mechanics ?? []).find(
      (m) => (m as { kind?: string }).kind === "grant_creature",
    ) as { creatureNames?: string[] } | undefined
    expect(grant?.creatureNames).toContain("Golem")
  })

  it("audits clean after sanitize", () => {
    const sanitized = sanitizeInventorImportContent(sampleInventor())
    const summary = summarizeFindings(auditImportWiring(sanitized))
    expect(summary.errors).toBe(0)
  })

  it("applyImportEnrichmentPresets runs inventor sanitize", () => {
    const enriched = applyImportEnrichmentPresets(sampleInventor())
    expect(enriched.class_resources?.find((r) => r.resource_key === "upgrades")?.uses.type).toBe(
      "special",
    )
  })

  it("ensures Runesmith runes_marked, Justicar second path, and folds spell notes", () => {
    const content = {
      ...sampleInventor(),
      subclasses: [
        ...(sampleInventor().subclasses ?? []),
        {
          name: "Runesmith",
          class_name: "Inventor",
          description: "<p>Runes.</p>",
          features: [
            {
              level: 1,
              name: "Runic Marks",
              description: "You can mark two runes.",
            },
            {
              level: 14,
              name: "Twin Flares",
              description:
                'cause the active effect of any two runes or glyphs [SOURCE TEXT TRUNCATED: cuts off mid-sentence]',
            },
          ],
        },
        {
          name: "Relicsmith",
          class_name: "Inventor",
          description: "<p>Relics.</p>",
          features: [
            {
              level: 3,
              name: "Ordained Path",
              description: "Select a path.",
              isChoice: true,
              choices: {
                category: "Ordained Path",
                count: 1,
                options: [
                  { name: "Path of Justice", description: "Justice." },
                  { name: "Path of Salvation", description: "Salvation." },
                ],
              },
            },
            {
              level: 14,
              name: "Justicar Savant",
              description: "Select an additional Ordained Path.",
            },
          ],
        },
      ],
      spells: [
        {
          name: "Disorient",
          level: 2,
          school: "Unknown",
          casting_time: null,
          range: null,
          components: null,
          duration: null,
          concentration: false,
          description: null,
          classes: ["Inventor"],
          note: "Stub only; level inferred from Curse Bringer table.",
        } as unknown as NonNullable<ImportContent["spells"]>[number],
      ],
    } as ImportContent

    const sanitized = sanitizeInventorImportContent(content)
    const runes = sanitized.class_resources?.find((r) => r.resource_key === "runes_marked")
    expect(runes?.uses.type).toBe("special")
    expect(runes?.subclass_name).toBe("Runesmith")

    const twin = sanitized.subclasses
      ?.find((sc) => sc.name === "Runesmith")
      ?.features?.find((f) => f.name === "Twin Flares")
    expect(twin?.description).toContain("[Source ends mid-entry]")
    expect(twin?.description).not.toContain("SOURCE TEXT TRUNCATED")

    const justicar = sanitized.subclasses
      ?.find((sc) => sc.name === "Relicsmith")
      ?.features?.find((f) => f.name === "Justicar Savant")
    expect(justicar?.isChoice).toBe(true)
    expect(justicar?.choices?.options?.map((o) => o.name)).toEqual([
      "Path of Justice",
      "Path of Salvation",
    ])

    const spell = sanitized.spells?.find((s) => s.name === "Disorient")
    expect(spell?.description).toContain("Import note:")
    expect((spell as { note?: string } | undefined)?.note).toBeUndefined()

    const summary = summarizeFindings(auditImportWiring(sanitized))
    expect(summary.errors).toBe(0)
  })
})
