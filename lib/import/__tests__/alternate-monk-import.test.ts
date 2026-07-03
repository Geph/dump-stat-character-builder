import { describe, expect, it } from "vitest"
import { enrichMonkClassFeatures, remapKiResourceKey } from "@/lib/import/enrich-monk-class-features"
import { enrichWildcardFeaturePresets } from "@/lib/compendium/enrich-srd-class-features"
import { detectFeatureModifiers } from "@/lib/import/detect-feature-modifiers"
import { enrichImportedClassRow } from "@/lib/import/enrich-import-classes"
import type { Feature } from "@/lib/types"

describe("remapKiResourceKey", () => {
  it("prefixes ki for Alternate Monk but not SRD Monk", () => {
    expect(remapKiResourceKey("Alternate Monk", "ki_points")).toBe("alternate_monk_ki_points")
    expect(remapKiResourceKey("Monk", "ki_points")).toBe("ki_points")
  })
})

describe("enrichMonkClassFeatures", () => {
  it("wires Unarmored Defense for homebrew monk classes", () => {
    const [next] = enrichMonkClassFeatures(
      [{ level: 1, name: "Unarmored Defense", description: "" }],
      "Alternate Monk",
    )
    expect(next.linkedModifiers?.some((inst) =>
      inst.characteristics?.some((char) => char.type === "ac"),
    )).toBe(true)
  })

  it("remaps focus_points to prefixed ki on Flurry preset", () => {
    const feature = enrichWildcardFeaturePresets({
      level: 2,
      name: "Flurry of Blows",
      description: "",
    } as Feature)
    const [next] = enrichMonkClassFeatures([feature], "Alternate Monk")
    const json = JSON.stringify(next.linkedModifiers ?? [])
    expect(json).toContain("alternate_monk_ki_points")
    expect(json).not.toContain("focus_points")
  })
})

describe("Alternate Monk import wiring", () => {
  it("detects Warrior's Spirit turn-start Ki regain", () => {
    const detections = detectFeatureModifiers(
      "You regain 1 Ki at the start of each of your turns in combat, so long as you are not Incapacitated.",
      {
        contentKind: "class_feature",
        sourceName: "Alternate Monk",
        featureName: "Warrior's Spirit",
        level: 6,
      },
    )
    expect(detections.some((row) => row.ruleId === "resource.turn_start_regain_ki")).toBe(true)
  })

  it("detects Mystic Technique on-hit once per turn", () => {
    const detections = detectFeatureModifiers(
      "Once per turn when you hit a creature with an attack, you can spend 2 Ki to deal extra force damage.",
      {
        contentKind: "feat",
        sourceName: "Crushing Palm",
        featureName: "Crushing Palm",
      },
    )
    const hit = detections.find((row) => row.ruleId === "technique.on_hit_once_per_turn")
    expect(hit?.instance.characteristics?.[0]?.type).toBe("on_hit_trigger")
    expect((hit?.instance.characteristics?.[0] as { oncePerTurn?: boolean }).oncePerTurn).toBe(true)
  })

  it("enriches class row with special_ability and starting equipment", () => {
    const row = enrichImportedClassRow(
      {
        name: "Alternate Monk",
        description: `
Your Technique save DC = 8 + your proficiency bonus + your Wisdom modifier.

Starting Equipment
Choose: (a) a shortsword; or (b) any simple weapon

Multiclassing
Prerequisites: 13 Dexterity, 13 Wisdom
Proficiencies Gained: Simple weapons, shortswords
`,
        features: [],
        hit_die: 8,
      },
      [],
    )
    expect(row.special_ability).toMatchObject({ save_dc_ability: "wisdom" })
    expect(
      (row.starting_equipment_groups as { options: unknown[] }[])?.[0]?.options.length,
    ).toBeGreaterThan(0)
    expect(row.multiclass_prerequisites).toEqual(
      expect.arrayContaining([
        { ability: "Dexterity", minimum: 13 },
        { ability: "Wisdom", minimum: 13 },
      ]),
    )
  })
})
