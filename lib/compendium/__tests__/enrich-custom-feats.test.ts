import { describe, expect, it } from "vitest"
import { enrichCustomFeatRow, presetForCustomFeatName } from "@/lib/compendium/enrich-custom-feats"
import { SRD_SOURCE } from "@/lib/srd/source"

const PHB_SOURCE = "Player's Handbook"

describe("enrichCustomFeatRow PHB presets", () => {
  it("wires Actor with Charisma ASI and deception/performance advantage", () => {
    const row = enrichCustomFeatRow({
      name: "Actor",
      source: PHB_SOURCE,
      description: "Impersonation and Mimicry",
    })
    const linked = (row.linked_modifiers ?? []) as { characteristics?: { type: string; label?: string }[] }[]
    const chars = linked.flatMap((inst) => inst.characteristics ?? [])
    expect(chars.some((c) => c.type === "ability_scores")).toBe(true)
    expect(linked.some((inst) => inst.characteristics?.some((c) => c.type === "skills") === false)).toBe(true)
    expect(linked.some((i) => (i as { catalogRefId?: string }).catalogRefId === "cat_fx_check_roll_modifier")).toBe(
      true,
    )
  })

  it("wires Fey Touched with spell picks and Misty Step", () => {
    const row = enrichCustomFeatRow({
      name: "Fey Touched",
      source: PHB_SOURCE,
      description: "Fey Magic",
    })
    const linked = (row.linked_modifiers ?? []) as { characteristics?: { type: string }[] }[]
    expect(linked.flatMap((inst) => inst.characteristics ?? []).some((c) => c.type === "spells_known")).toBe(true)
    expect(row.repeatable).not.toBe(true)
  })

  it("wires Elemental Adept as repeatable with damage type choice", () => {
    const row = enrichCustomFeatRow({
      name: "Elemental Adept",
      source: PHB_SOURCE,
      description: "Energy Mastery",
    })
    expect(row.repeatable).toBe(true)
    const linked = (row.linked_modifiers ?? []) as { characteristics?: { choiceOptions?: string[] }[] }[]
    const resist = linked
      .flatMap((inst) => inst.characteristics ?? [])
      .find((c) => Array.isArray(c.choiceOptions) && c.choiceOptions.includes("Fire"))
    expect(resist).toBeTruthy()
  })

  it("wires Charger with dash speed and charge rider", () => {
    const row = enrichCustomFeatRow({
      name: "Charger",
      source: PHB_SOURCE,
      description: "Improved Dash and Charge Attack",
    })
    const linked = (row.linked_modifiers ?? []) as { catalogRefId?: string; characteristics?: { type: string }[] }[]
    expect(linked.some((i) => i.characteristics?.some((c) => c.type === "speed"))).toBe(true)
    expect(linked.some((i) => i.catalogRefId === "cat_fx_rider_damage")).toBe(true)
  })

  it("does not apply custom presets to SRD-source rows", () => {
    const row = enrichCustomFeatRow({
      name: "Actor",
      source: SRD_SOURCE,
      description: "Should not wire",
    })
    expect(row.linked_modifiers ?? []).toHaveLength(0)
  })

  it("does not overwrite existing linked modifiers", () => {
    const existing = [{ instanceId: "custom", catalogRefId: "cat_char_ac", characteristics: [] }]
    const row = enrichCustomFeatRow({
      name: "Actor",
      source: PHB_SOURCE,
      description: "Actor",
      linked_modifiers: existing,
    })
    expect(row.linked_modifiers).toEqual(existing)
  })

  it("exposes presets for PHB origin, general, and fighting style feats", () => {
    for (const name of [
      "Alert",
      "Magic Initiate",
      "Tough",
      "Lucky",
      "Actor",
      "War Caster",
      "Blind Fighting",
      "Unarmed Fighting",
    ]) {
      expect(presetForCustomFeatName(name)?.linkedModifiers?.length).toBeGreaterThan(0)
    }
  })

  it("applies Magic Initiate preset even when LLM set isChoice spell-list shells", () => {
    const row = enrichCustomFeatRow({
      name: "Magic Initiate",
      source: PHB_SOURCE,
      description: "Two Cantrips and a Level 1 Spell",
      isChoice: true,
      choices: {
        category: "Spell List",
        count: 1,
        options: [{ name: "Wizard", description: "Wizard list" }],
      },
    })
    expect(row.isChoice).toBe(false)
    const linked = (row.linked_modifiers ?? []) as { characteristics?: { type: string }[] }[]
    expect(linked.flatMap((inst) => inst.characteristics ?? []).some((c) => c.type === "spells_known")).toBe(
      true,
    )
  })
})
