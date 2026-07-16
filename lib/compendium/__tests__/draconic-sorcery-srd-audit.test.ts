import { describe, expect, it } from "vitest"
import { enrichClassFeatureWithModifierPresets } from "@/lib/compendium/enrich-srd-class-features"

describe("Draconic Sorcery SRD preset audit (2024)", () => {
  it("wires Draconic Resilience as +1 HP/level and AC 10 + DEX + CHA", () => {
    const feature = enrichClassFeatureWithModifierPresets(
      "Sorcerer",
      {
        level: 3,
        name: "Draconic Resilience",
        description:
          "Your Hit Point maximum increases by 3, and it increases by 1 whenever you gain another Sorcerer level. While you aren't wearing armor, your base Armor Class equals 10 plus your Dexterity and Charisma modifiers.",
      },
      "Draconic Sorcery",
      { skipMechanicalDetection: true },
    )

    const characteristics = (feature.linkedModifiers ?? []).flatMap(
      (entry) => entry.characteristics ?? [],
    )
    const hp = characteristics.find((c) => c.type === "hit_points")
    expect(hp).toMatchObject({ type: "hit_points", mode: "per_level", value: 1 })

    const ac = characteristics.find((c) => c.type === "ac")
    expect(ac).toMatchObject({
      type: "ac",
      mode: "ability_modifiers",
      base: 10,
      abilities: ["DEX", "CHA"],
    })
  })

  it("wires Dragon Wings as 1/LR restoreable with 3 Sorcery Points and toggle-gated fly", () => {
    const feature = enrichClassFeatureWithModifierPresets(
      "Sorcerer",
      {
        level: 14,
        name: "Dragon Wings",
        description:
          "As a Bonus Action, you can cause draconic wings to appear. Fly Speed 60 ft. Once per Long Rest unless you spend 3 Sorcery Points to restore it.",
      },
      "Draconic Sorcery",
      { skipMechanicalDetection: true },
    )

    expect(feature.activation?.bonusAction).toBe(true)

    const characteristics = (feature.linkedModifiers ?? []).flatMap(
      (entry) => entry.characteristics ?? [],
    )
    const uses = characteristics.find((c) => c.type === "uses")
    expect(uses).toMatchObject({
      type: "uses",
      uses: {
        type: "fixed",
        fixedAmount: 1,
        restoreByResource: {
          resourceKey: "sorcery_points",
          resourceAmount: 3,
          restores: 1,
        },
      },
    })

    const fly = characteristics.find((c) => c.type === "speed" && c.speedType === "fly")
    expect(fly).toMatchObject({ type: "speed", speedType: "fly", mode: "add", value: 60 })
    expect(fly?.limitations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "sheet_toggle",
          rule: "requires_active",
          value: "dragon_wings_active",
        }),
      ]),
    )
  })

  it("expands Elemental Affinity into a damage-type choice with Resistance + CHA damage", () => {
    const feature = enrichClassFeatureWithModifierPresets(
      "Sorcerer",
      {
        level: 6,
        name: "Elemental Affinity",
        description:
          "Choose Acid, Cold, Fire, Lightning, or Poison. Resistance to that type; add CHA to one damage roll of a spell of that type.",
      },
      "Draconic Sorcery",
      { skipMechanicalDetection: true },
    )

    expect(feature.isChoice).toBe(true)
    expect(feature.choices?.options?.map((o) => o.name)).toEqual([
      "Acid",
      "Cold",
      "Fire",
      "Lightning",
      "Poison",
    ])

    const fire = feature.choices?.options?.find((o) => o.name === "Fire")
    const fireChars = (fire?.linkedModifiers ?? []).flatMap((entry) => entry.characteristics ?? [])
    expect(fireChars.some((c) => c.type === "damage_resistance" && c.damageTypes?.includes("Fire"))).toBe(
      true,
    )
    expect(fireChars.some((c) => c.type === "on_cast_spell_trigger")).toBe(true)
  })
})
