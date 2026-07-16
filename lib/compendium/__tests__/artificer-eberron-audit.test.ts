import { describe, expect, it } from "vitest"
import { enrichClassFeatureWithModifierPresets } from "@/lib/compendium/enrich-srd-class-features"
import { getSpellSlotTable } from "@/lib/compendium/spell-slots"
import type { DndClass } from "@/lib/types"

function chars(feature: ReturnType<typeof enrichClassFeatureWithModifierPresets>) {
  return (feature.linkedModifiers ?? []).flatMap((entry) => entry.characteristics ?? [])
}

describe("Eberron Artificer 2024 preset wiring", () => {
  it("aliases Tinker's Magic to create_mundane + Mending", () => {
    const feature = enrichClassFeatureWithModifierPresets(
      "Artificer",
      {
        level: 1,
        name: "Tinker’s Magic",
        description: "You know the Mending cantrip. Create mundane items with Tinker's Tools.",
      },
      null,
      { skipMechanicalDetection: true },
    )
    const types = chars(feature).map((c) => c.type)
    expect(types).toContain("equipment_and_magic_items")
    expect(types).toContain("spells_known")
    const gear = chars(feature).find((c) => c.type === "equipment_and_magic_items")
    expect(gear).toMatchObject({ mode: "create_mundane", usesAbility: "intelligence" })
  })

  it("wires Flash of Genius as INT uses + ability_modifier reaction", () => {
    const feature = enrichClassFeatureWithModifierPresets(
      "Artificer",
      {
        level: 7,
        name: "Flash of Genius",
        description:
          "When you or a creature within 30 feet fails a check or save, Reaction to add Intelligence modifier.",
      },
      null,
      { skipMechanicalDetection: true },
    )
    expect(feature.activation?.reaction).toBe(true)
    const reaction = chars(feature).find((c) => c.type === "d20_test_reaction")
    expect(reaction).toMatchObject({
      dieSource: "ability_modifier",
      dieAbility: "intelligence",
      useReaction: true,
      rangeFeet: 30,
    })
    const uses = chars(feature).find((c) => c.type === "uses")
    expect(uses?.type).toBe("uses")
    if (uses?.type === "uses") {
      expect(uses.uses).toMatchObject({ type: "ability_modifier", abilityModifier: "INT" })
    }
  })

  it("populates Replicate Magic Item plan tables", () => {
    const feature = enrichClassFeatureWithModifierPresets(
      "Artificer",
      { level: 2, name: "Replicate Magic Item", description: "Learn magic item plans." },
      null,
      { skipMechanicalDetection: true },
    )
    const replicate = chars(feature).find((c) => c.type === "equipment_and_magic_items")
    expect(replicate?.type).toBe("equipment_and_magic_items")
    if (replicate?.type !== "equipment_and_magic_items") return
    expect(replicate.planTables?.length).toBe(4)
    expect(replicate.planTables?.[0]?.items).toEqual(expect.arrayContaining(["Bag of Holding"]))
    expect(replicate.planTables?.[3]?.items).toEqual(expect.arrayContaining(["Flame Tongue"]))
  })

  it("wires Magic Item Tinker, Spell-Storing Item, Advanced Artifice, Soul of Artifice", () => {
    for (const name of [
      "Magic Item Tinker",
      "Spell-Storing Item",
      "Advanced Artifice",
      "Soul of Artifice",
    ]) {
      const feature = enrichClassFeatureWithModifierPresets(
        "Artificer",
        { level: 6, name, description: name },
        null,
        { skipMechanicalDetection: true },
      )
      expect(chars(feature).length, name).toBeGreaterThan(0)
    }
    const advanced = enrichClassFeatureWithModifierPresets(
      "Artificer",
      { level: 14, name: "Advanced Artifice", description: "Attune to five items." },
      null,
      { skipMechanicalDetection: true },
    )
    expect(chars(advanced).some((c) => c.type === "attunement_slots")).toBe(true)
  })

  it("honors Artificer explicit_slot_progression at level 1", () => {
    const spellcasting: NonNullable<DndClass["spellcasting"]> = {
      ability: "Intelligence",
      caster_progression: "half",
      explicit_slot_progression: [
        { level: 1, slots: [2, 0, 0, 0, 0] },
        { level: 5, slots: [4, 2, 0, 0, 0] },
      ],
    }
    const table = getSpellSlotTable("Artificer", 1, spellcasting)
    expect(table?.slotsByLevel.slice(0, 2)).toEqual([2, 0])
  })

  it("wires all five Eberron subclasses' signature features", () => {
    const cases: Array<{ subclass: string; feature: string; expectType: string }> = [
      { subclass: "Alchemist", feature: "Experimental Elixir", expectType: "uses" },
      { subclass: "Alchemist", feature: "Alchemical Savant", expectType: "on_cast_spell_trigger" },
      { subclass: "Alchemist", feature: "Chemical Mastery", expectType: "damage" },
      { subclass: "Armorer", feature: "Armor Model", expectType: "feature_option_picker" },
      { subclass: "Artillerist", feature: "Eldritch Cannon", expectType: "feature_option_picker" },
      { subclass: "Battle Smith", feature: "Battle Ready", expectType: "weapon_proficiencies" },
      { subclass: "Battle Smith", feature: "Steel Defender", expectType: "feature_option_picker" },
      { subclass: "Cartographer", feature: "Mapping Magic", expectType: "uses" },
      { subclass: "Cartographer", feature: "Ingenious Movement", expectType: "movement_option" },
    ]
    for (const row of cases) {
      const feature = enrichClassFeatureWithModifierPresets(
        "Artificer",
        { level: 3, name: row.feature, description: row.feature },
        row.subclass,
        { skipMechanicalDetection: true },
      )
      const types = chars(feature).map((c) => c.type)
      const effects = (feature.linkedModifiers ?? []).flatMap((entry) =>
        (entry.activation?.effects ?? []).map((fx) => fx.kind),
      )
      const hit =
        types.some((t) => t.includes(row.expectType) || t === row.expectType) ||
        effects.includes(row.expectType as never) ||
        (row.expectType === "damage" &&
          types.some((t) => t === "damage_resistance" || t === "condition_immunity")) ||
        (row.expectType === "feature_option_picker" &&
          (feature.isChoice === true || types.some((t) => t === "catalog_option"))) ||
        (row.expectType === "movement_option" && effects.includes("movement_option"))
      expect(
        hit,
        `${row.subclass}::${row.feature} → ${row.expectType} (got ${types.join(",")}; isChoice=${feature.isChoice})`,
      ).toBe(true)
    }
  })
})
