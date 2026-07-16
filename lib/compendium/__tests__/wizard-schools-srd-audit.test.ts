import { describe, expect, it } from "vitest"
import { aggregateCharacteristics } from "@/lib/compendium/characteristic-modifiers"
import { enrichClassFeatureWithModifierPresets } from "@/lib/compendium/enrich-srd-class-features"
import { aiMechanicsToDetections } from "@/lib/import/parse-ai-mechanics"

describe("Wizard school SRD preset audit (2024)", () => {
  it("uses the free-spell schoolSavantPreset label for Evocation Savant (not 2014 half cost)", () => {
    const feature = enrichClassFeatureWithModifierPresets(
      "Wizard",
      {
        level: 3,
        name: "Evocation Savant",
        description: "Choose two Wizard Evocation spells of level 2 or lower and add them to your spellbook for free.",
      },
      "Evoker",
      { skipMechanicalDetection: true },
    )
    const spellsKnown = (feature.linkedModifiers ?? [])
      .flatMap((entry) => entry.characteristics ?? [])
      .find((c) => c.type === "spells_known")
    expect(spellsKnown?.type).toBe("spells_known")
    if (spellsKnown?.type === "spells_known") {
      expect(spellsKnown.label).toMatch(/free|spellbook/i)
      expect(spellsKnown.label).not.toMatch(/half time|gold/i)
    }
  })

  it("labels Empowered Evocation as +INT to Evocation spell damage", () => {
    const feature = enrichClassFeatureWithModifierPresets(
      "Wizard",
      {
        level: 10,
        name: "Empowered Evocation",
        description: "Add your Intelligence modifier to one damage roll of an Evocation Wizard spell.",
      },
      "Evoker",
      { skipMechanicalDetection: true },
    )
    const trigger = (feature.linkedModifiers ?? [])
      .flatMap((entry) => entry.characteristics ?? [])
      .find((c) => c.type === "on_cast_spell_trigger")
    expect(trigger?.type).toBe("on_cast_spell_trigger")
    if (trigger?.type === "on_cast_spell_trigger") {
      expect(trigger.spellSchool).toBe("Evocation")
      expect(trigger.label).toMatch(/\+INT/i)
    }
  })

  it("fills The Third Eye with Darkvision / Greater Comprehension / See Invisibility options", () => {
    const feature = enrichClassFeatureWithModifierPresets(
      "Wizard",
      {
        level: 10,
        name: "The Third Eye",
        description:
          "As a Bonus Action, choose Darkvision 120 ft., read any language, or cast See Invisibility without a slot.",
      },
      "Diviner",
      { skipMechanicalDetection: true },
    )
    expect(feature.isChoice).toBe(true)
    expect(feature.choices?.options?.map((o) => o.name)).toEqual([
      "Darkvision",
      "Greater Comprehension",
      "See Invisibility",
    ])

    const darkvision = feature.choices?.options?.[0]
    expect(
      (darkvision?.linkedModifiers ?? [])
        .flatMap((e) => e.characteristics ?? [])
        .some((c) => c.type === "vision" && c.rangeFeet === 120),
    ).toBe(true)

    const seeInvis = feature.choices?.options?.[2]
    const castFx = seeInvis?.linkedModifiers?.find((e) =>
      e.activation?.effects?.some((fx) => fx.kind === "cast_spell" && fx.castSpellName === "See Invisibility"),
    )
    expect(castFx?.activation?.effects?.[0]).toMatchObject({
      kind: "cast_spell",
      castSpellWithoutSlot: true,
    })
  })

  it("wires Spell Resistance damage half as fromSpells (sheet token: Spell damage)", () => {
    const feature = enrichClassFeatureWithModifierPresets(
      "Wizard",
      {
        level: 14,
        name: "Spell Resistance",
        description: "Advantage on saves against spells; Resistance to damage of spells.",
      },
      "Abjurer",
      { skipMechanicalDetection: true },
    )
    const characteristics = (feature.linkedModifiers ?? []).flatMap(
      (entry) => entry.characteristics ?? [],
    )
    const resistance = characteristics.find((c) => c.type === "damage_resistance")
    expect(resistance).toMatchObject({ type: "damage_resistance", fromSpells: true })

    const aggregated = aggregateCharacteristics(characteristics)
    expect(aggregated.resistances).toContain("Spell damage")
  })

  it("maps AI damageTypes ['Spells'] to fromSpells resistance", () => {
    const detections = aiMechanicsToDetections(
      [
        {
          kind: "damage_resistance",
          damageTypes: ["Spells"],
          sourcePhrase: "you have Resistance to the damage of spells",
        },
      ],
      { contentKind: "class_feature", sourceName: "Wizard", featureName: "Spell Resistance" },
    )
    expect(detections).toHaveLength(1)
    expect(detections[0]?.ruleId).toBe("ai.resistance.spell_damage")
    const mod = detections[0]?.instance.characteristics?.[0]
    expect(mod).toMatchObject({
      type: "damage_resistance",
      damageTypes: [],
      fromSpells: true,
    })
  })
})
