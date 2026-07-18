import { describe, expect, it } from "vitest"
import {
  alternateEffectsSpellsKnownModifier,
  applySpecializationAlternateEffectsChoice,
  parseAlternateEffectsSpellNames,
  parseSpecializationAlternateEffects,
} from "@/lib/import/parse-alternate-effects-table"
import { detectFeatureModifiers } from "@/lib/import/detect-feature-modifiers"
import { enrichAbilityImportRow } from "@/lib/import/enrich-ability-import"

describe("parseAlternateEffectsSpellNames", () => {
  it("extracts spell names from a Kibbles Alternate Effects HTML table", () => {
    const html = `<p><strong>Alternate Effects.</strong> When you learn this discipline, you can use your Psionics feature to cast the following spells.</p><table><tbody><tr><td>Point Cost</td><td>Alternate Effects</td></tr><tr><td>1</td><td>heroism, longstrider, unlocked potential</td></tr><tr><td>2</td><td>alter self, enlarge/reduce, lesser restoration</td></tr><tr><td>3</td><td>haste, protection from energy</td></tr></tbody></table>`
    expect(parseAlternateEffectsSpellNames(html)).toEqual([
      "heroism",
      "longstrider",
      "unlocked potential",
      "alter self",
      "enlarge/reduce",
      "lesser restoration",
      "haste",
      "protection from energy",
    ])
  })

  it("ignores non-Alternate-Effects tables", () => {
    const html = `<table><tr><td>Level</td><td>Features</td></tr><tr><td>1</td><td>Psionics</td></tr></table>`
    expect(parseAlternateEffectsSpellNames(html)).toEqual([])
  })

  it("strips trailing homebrew K markers and ignores specialization replacement tables in the base list", () => {
    const html = `<p><strong>Alternate Effects.</strong></p><table><tbody><tr><td>Point Cost</td><td>Alternate Effects</td></tr><tr><td>1</td><td>burning hands, lightning tendrilK</td></tr><tr><td>2</td><td>flaming sphere, scorching ray</td></tr></tbody></table><p><strong>Specializations.</strong></p><p><strong>Cryokinetic.</strong> Its Alternate Effects replace the default table: 1—arctic breathK, entombK; 2—cold snapK.</p>`
    expect(parseAlternateEffectsSpellNames(html)).toEqual([
      "burning hands",
      "lightning tendril",
      "flaming sphere",
      "scorching ray",
    ])
  })

  it("builds a spells_known modifier with per-spell psi cast costs", () => {
    const mod = alternateEffectsSpellsKnownModifier(
      [
        { pointCost: 1, spellNames: ["heroism"] },
        { pointCost: 3, spellNames: ["haste"] },
      ],
      "test_enhancement",
    )
    expect(mod?.catalogRefId).toBe("cat_char_spells_known")
    const char = mod?.characteristics?.[0]
    expect(char?.type).toBe("spells_known")
    if (char?.type === "spells_known") {
      expect(char.spells).toEqual([
        {
          spellId: "import_spell_name:heroism",
          alwaysPrepared: true,
          castCost: { resourceKey: "psi_points", amount: 1 },
        },
        {
          spellId: "import_spell_name:haste",
          alwaysPrepared: true,
          castCost: { resourceKey: "psi_points", amount: 3 },
        },
      ])
      expect(char.label).toContain("Alternate Effects")
    }
  })
})

describe("Psychokinesis-style specialization Alternate Effects", () => {
  const psychokinesisDescription = `<p>Psychokinesis is the mental art of energy.</p><p><strong>Energy Manipulation.</strong> As an action…</p><p><strong>Alternate Effects.</strong> When you learn this discipline, you can use your Psionics feature to cast the following spells.</p><table><tbody><tr><td>Point Cost</td><td>Alternate Effects</td></tr><tr><td>1</td><td>burning hands, lightning tendrilK</td></tr><tr><td>2</td><td>flaming sphere, scorching ray</td></tr><tr><td>3</td><td>aether lanceK, fireball</td></tr><tr><td>4</td><td>jumping joltK, wall of fire</td></tr><tr><td>5</td><td>aether stormK, cone of cold</td></tr></tbody></table><p><strong>Specializations.</strong> You can select one specialization only when gaining this discipline.</p><p><strong>Cryokinetic.</strong> You can deal only cold damage with Elemental Blast. Its Alternate Effects replace the default table: 1—arctic breathK, entombK; 2—cold snapK; 3—flash freezeK, sleet storm; 4—ice storm, ice spikeK; 5—cone of cold.</p><p><strong>Electrokinetic.</strong> You can deal only lightning damage with Elemental Blast. Its Alternate Effects replace the default table: 1—lightning tendrilK, thunder punchK; 2—crackleK, lightning chargedK; 3—electrocuteK, lightning bolt; 4—jumping joltK; 5—sky burstK.</p><p><strong>Pyrokinetic.</strong> You can deal only fire damage with Elemental Blast. Its Alternate Effects replace the default table: 1—burning hands, hellish rebuke; 2—flaming sphere, scorching ray; 3—fireball, fire cycloneK; 4—fire shield, wall of fire; 5—flame strike.</p>`

  it("parses specialization replacement prose cost lists", () => {
    const specs = parseSpecializationAlternateEffects(psychokinesisDescription)
    expect(specs.map((s) => s.name)).toEqual(["Cryokinetic", "Electrokinetic", "Pyrokinetic"])
    expect(specs[0]?.costRows.map((r) => r.spellNames).flat()).toEqual([
      "arctic breath",
      "entomb",
      "cold snap",
      "flash freeze",
      "sleet storm",
      "ice storm",
      "ice spike",
      "cone of cold",
    ])
    expect(specs[1]?.costRows[0]?.spellNames).toEqual(["lightning tendril", "thunder punch"])
    expect(specs[2]?.costRows[4]?.spellNames).toEqual(["flame strike"])
  })

  it("writes specialization_choices beside Discipline Talents without clobbering them", () => {
    const row = applySpecializationAlternateEffectsChoice({
      name: "Psychokinesis Discipline",
      description: psychokinesisDescription,
      choices: {
        category: "Discipline Talents",
        count: 1,
        options: [{ name: "Elemental Aegis", description: "Shield of fire, ice, or lightning." }],
      },
    })
    expect((row.choices as { category: string }).category).toBe("Discipline Talents")
    expect((row.choices as { options: unknown[] }).options).toHaveLength(1)
    const spec = row.specialization_choices as {
      category: string
      options: { name: string; linkedModifiers?: { characteristics?: { type?: string; spells?: { spellId: string }[] }[] }[] }[]
    }
    expect(spec.category).toBe("Specialization")
    expect(spec.options.map((o) => o.name)).toEqual([
      "Cryokinetic",
      "Electrokinetic",
      "Pyrokinetic",
    ])
    const cryoSpells = spec.options[0]?.linkedModifiers?.[0]?.characteristics?.[0]
    expect(cryoSpells?.type).toBe("spells_known")
    if (cryoSpells?.type === "spells_known") {
      expect(cryoSpells.spells?.some((s) => /arctic breath/i.test(s.spellId))).toBe(true)
    }
  })

  it("enriches via ability import without treating Cryokinetic as a talent", () => {
    const enriched = enrichAbilityImportRow({
      name: "Psychokinesis Discipline",
      description: psychokinesisDescription,
      ability_role: "discipline",
      source_type: "class",
      source_name: "Psion",
      choices: {
        category: "Discipline Talents",
        count: 1,
        options: [{ name: "Elemental Aegis", description: "Shield of fire, ice, or lightning." }],
      },
    })
    expect((enriched.choices as { category: string }).category).toBe("Discipline Talents")
    expect(
      (enriched.specialization_choices as { options: { name: string }[] }).options.map((o) => o.name),
    ).toEqual(["Cryokinetic", "Electrokinetic", "Pyrokinetic"])
  })
})

describe("grant.creature.mephit_choice", () => {
  it("wires Ice / Magma / Dust Mephit as a grant_creature choice", () => {
    const text =
      "While in an elemental emotion, you can expend 2 psi points as a bonus action to manifest it as a mephit: an ice mephit for cold, magma mephit for fire, or dust mephit for lightning."
    const detections = detectFeatureModifiers(text, {
      contentKind: "ability",
      featureName: "Manifested Emotions",
      sourceName: "Psion",
    })
    const mephit = detections.find((d) => d.ruleId === "grant.creature.mephit_choice")
    expect(mephit).toBeDefined()
    const char = mephit?.instance.characteristics?.[0]
    expect(char?.type).toBe("grant_creature")
    if (char?.type === "grant_creature") {
      expect(char.choiceOptions).toEqual(["Ice Mephit", "Magma Mephit", "Dust Mephit"])
      expect(char.count).toBe(1)
    }
  })
})
