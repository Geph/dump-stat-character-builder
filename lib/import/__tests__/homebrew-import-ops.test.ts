import { describe, expect, it } from "vitest"
import {
  auditCustomAbilities,
  auditImportWiring,
  extractCustomAbilities,
  extractSourceFeatureHeaders,
  mergeAbilityFillIn,
  mergeSpellFillIn,
  sanitizeHomebrewImportJson,
  summarizeFindings,
} from "@/lib/import/homebrew-import-ops"

describe("homebrew-import-ops", () => {
  it("flags and sanitizes investigator finisher_dice + trinkets picker", () => {
    const raw = {
      classes: [
        {
          name: "Investigator",
          features: [
            {
              name: "Trinkets",
              description: "pool",
              isChoice: true,
              choices: { category: "Trinket", optionsSource: "class_upgrades", options: [] },
            },
            {
              name: "Holy Trinkets",
              description:
                "<p><strong>Amulet of Warding.</strong> Ward.</p><p><strong>Restorative Ankh.</strong> Heal.</p><p><strong>Rune of Banishment.</strong> Ban.</p>",
            },
          ],
        },
      ],
      class_resources: [
        {
          class_name: "Investigator",
          resource_key: "finisher_dice",
          name: "Finisher Dice",
          uses: { type: "special", atLevelTable: [{ level: 2, count: 1 }] },
        },
      ],
    }
    const findings = auditImportWiring(raw)
    expect(findings.some((f) => f.id === "investigator.finisher_key")).toBe(true)
    expect(findings.some((f) => f.id === "investigator.trinkets_picker")).toBe(true)

    const fixed = sanitizeHomebrewImportJson(raw)
    expect(auditImportWiring(fixed).filter((f) => f.severity === "error")).toEqual([])
    const resources = fixed.class_resources as { resource_key: string }[]
    expect(resources[0]).toMatchObject({ resource_key: "finisher" })
    expect((fixed.classes as { features: { name: string; choices?: unknown }[] }[])[0].features[0].choices).toBeUndefined()
    expect((fixed.equipment as { name: string }[]).map((e) => e.name)).toEqual(
      expect.arrayContaining(["Amulet of Warding", "Restorative Ankh", "Rune of Banishment"]),
    )
  })

  it("sanitizes necromancer charnel_touch multiply_level and thralls picker", () => {
    const raw = {
      classes: [
        {
          name: "Necromancer",
          features: [
            {
              name: "Thralls",
              isChoice: true,
              choices: { optionsSource: "class_upgrades", options: [] },
            },
            {
              name: "Lichdom",
              mechanics: [
                {
                  kind: "damage_resistance",
                  damageTypes: ["Necrotic", "Poison"],
                },
              ],
            },
          ],
        },
      ],
      class_resources: [
        {
          resource_key: "charnel_touch",
          uses: { type: "multiply_level", multiplier: 5, recharges: [{ rest: "long_rest" }] },
        },
      ],
    }
    expect(summarizeFindings(auditImportWiring(raw)).ok).toBe(false)
    const fixed = sanitizeHomebrewImportJson(raw)
    const resources = fixed.class_resources as {
      uses: { type: string; atLevelMode: string; atLevelTable: { level: number; count: number }[] }
    }[]
    expect(resources[0]).toMatchObject({
      uses: {
        type: "at_level",
        atLevelMode: "multiply_level",
        atLevelTable: [{ level: 1, count: 5 }],
      },
    })
    expect((fixed.classes as { spellcasting?: unknown }[])[0].spellcasting).toMatchObject({
      ability: "Intelligence",
      caster_progression: "full",
    })
    const lich = (fixed.classes as { features: { name: string; mechanics: { kind: string }[] }[] }[])[0]
      .features[1]
    expect(lich.mechanics[0].kind).toBe("damage_immunity")
    expect(summarizeFindings(auditImportWiring(fixed)).errors).toBe(0)
  })

  it("merges richer spells from incoming while keeping sanitizers", () => {
    const base = {
      classes: [{ name: "Martyr", features: [{ name: "Spellcasting", description: "old" }] }],
      class_resources: [
        {
          resource_key: "spell_uses",
          uses: { type: "at_level", atLevelMode: "tier", atLevelTable: [{ level: 1, count: 2 }] },
        },
      ],
      spells: [{ name: "Command", level: 1, school: "Enchantment", concentration: false }],
    }
    const incoming = {
      classes: [{ name: "Martyr", features: [{ name: "Spellcasting", description: "new" }] }],
      class_resources: [
        {
          resource_key: "spell_uses",
          uses: { type: "at_level", atLevelMode: "tier", atLevelTable: [{ level: 1, count: 2 }] },
        },
      ],
      spells: [
        {
          name: "Command",
          level: 1,
          school: "Enchantment",
          concentration: false,
          description: "<p>Full text</p>",
        },
        { name: "Curse Ward", level: 1, school: "Abjuration", concentration: false, description: "<p>x</p>" },
      ],
    }
    const merged = mergeSpellFillIn(base, incoming)
    expect((merged.spells as unknown[]).length).toBe(2)
    expect((merged.spells as { description?: string }[])[0].description).toContain("Full text")
  })

  it("merges standalone ability catalogs into a class or catalog base", () => {
    const catalog = {
      import_proposals: {
        custom_abilities: [
          {
            proposal_id: "enhancement",
            name: "Enhancement Discipline",
            ability_role: "discipline",
            definition: "short",
            description: "<p>Short</p>",
            source_type: "class",
            source_name: "Psion",
          },
        ],
      },
    }
    const richer = {
      import_proposals: {
        custom_abilities: [
          {
            proposal_id: "enhancement",
            name: "Enhancement Discipline",
            ability_role: "discipline",
            definition: "full",
            description: "<p>Much longer discipline write-up with talents.</p>",
            source_type: "class",
            source_name: "Psion",
          },
          {
            proposal_id: "telekinetic_bolt",
            name: "Telekinetic Bolt",
            ability_role: "psionic_power",
            definition: "power",
            description: "<p>Bolt</p>",
            source_type: "class",
            source_name: "Psion",
          },
        ],
      },
    }
    const mergedCatalog = mergeAbilityFillIn(catalog, richer)
    const rows = extractCustomAbilities(mergedCatalog)
    expect(rows).toHaveLength(2)
    expect(String(rows.find((r) => r.name === "Enhancement Discipline")?.description)).toContain("Much longer")

    const classBase = {
      classes: [{ name: "Psion", features: [{ name: "Psionics", description: "core" }] }],
      import_proposals: { custom_abilities: [] },
    }
    const intoClass = mergeAbilityFillIn(classBase, richer)
    expect(extractCustomAbilities(intoClass)).toHaveLength(2)
    expect((intoClass.classes as { name: string }[])[0].name).toBe("Psion")
  })

  it("audits ability catalogs for missing names and empty catalogs", () => {
    expect(
      auditImportWiring({ import_proposals: { custom_abilities: [] } }).some(
        (f) => f.id === "abilities.empty_catalog",
      ),
    ).toBe(true)
    const findings = auditCustomAbilities({
      import_proposals: {
        custom_abilities: [
          { proposal_id: "x", name: "", definition: "x", description: "x" },
          {
            proposal_id: "enhancement",
            name: "Enhancement Discipline",
            definition: "d",
            description: "<p>ok</p>",
            source_type: "class",
            source_name: "Psion",
          },
        ],
      },
    })
    expect(findings.some((f) => f.id === "abilities.missing_name")).toBe(true)
    expect(findings.some((f) => f.id === "abilities.missing_role")).toBe(true)
  })

  it("extracts LEVEL N feature headers from source prose", () => {
    const headers = extractSourceFeatureHeaders(`
LEVEL 1: RITUALIST
You learn rituals.
LEVEL 2: FINISHER
Bloodied strike.
Level 3: Trinkets
Subclass options.
`)
    expect(headers.map((h) => h.name.toLowerCase())).toEqual(
      expect.arrayContaining(["ritualist", "finisher", "trinkets"]),
    )
  })
})
