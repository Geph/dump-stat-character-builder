import { describe, expect, it } from "vitest"
import { enrichCustomFeatRow, presetForCustomFeatName } from "@/lib/compendium/enrich-custom-feats"
import { SRD_SOURCE } from "@/lib/srd/source"

const PHB_SOURCE = "Player's Handbook"

describe("enrichCustomFeatRow PHB presets", () => {
  it("wires Actor with fixed +1 Charisma (not a player-choice pool)", () => {
    const row = enrichCustomFeatRow({
      name: "Actor",
      source: PHB_SOURCE,
      description: "Impersonation and Mimicry",
    })
    const linked = (row.linked_modifiers ?? []) as {
      characteristics?: { type: string; mode?: string; bonuses?: Record<string, number>; label?: string }[]
    }[]
    const chars = linked.flatMap((inst) => inst.characteristics ?? [])
    const asi = chars.find((c) => c.type === "ability_scores")
    expect(asi).toMatchObject({
      mode: "fixed",
      bonuses: { charisma: 1 },
      label: "+1 Charisma",
    })
    expect(linked.some((i) => (i as { catalogRefId?: string }).catalogRefId === "cat_fx_check_roll_modifier")).toBe(
      true,
    )
  })

  it("wires Athlete as a 1-point pool restricted to Strength or Dexterity", () => {
    const row = enrichCustomFeatRow({
      name: "Athlete",
      source: PHB_SOURCE,
      description: "Athlete",
    })
    const linked = (row.linked_modifiers ?? []) as {
      characteristics?: {
        type: string
        mode?: string
        points?: number
        allowedAbilities?: string[]
      }[]
    }[]
    const asi = linked.flatMap((inst) => inst.characteristics ?? []).find((c) => c.type === "ability_scores")
    expect(asi).toMatchObject({
      mode: "asi_pool",
      points: 1,
      allowedAbilities: ["strength", "dexterity"],
    })
  })

  it("repairs legacy Actor asi_pool wiring to fixed Charisma", () => {
    const row = enrichCustomFeatRow({
      name: "Actor",
      source: PHB_SOURCE,
      description: "Actor",
      linked_modifiers: [
        {
          instanceId: "modinst_actor_asi",
          catalogRefId: "cat_char_ability_scores",
          characteristics: [
            {
              id: "mod_modinst_actor_asi_asi",
              type: "ability_scores",
              mode: "asi_pool",
              points: 1,
              bonuses: {},
              label: "+1 Charisma",
            },
          ],
        },
      ],
    })
    const asi = ((row.linked_modifiers ?? []) as { characteristics?: { mode?: string; bonuses?: object }[] }[])
      .flatMap((i) => i.characteristics ?? [])
      .find((c) => (c as { type?: string }).type === "ability_scores")
    expect(asi).toMatchObject({ mode: "fixed", bonuses: { charisma: 1 } })
  })

  it("applies default icons matching the curated feat set", () => {
    const actor = enrichCustomFeatRow({
      name: "Actor",
      source: PHB_SOURCE,
      description: "Actor",
    })
    expect(actor.icon).toBe("theater-curtains")

    const lucky = enrichCustomFeatRow({
      name: "Lucky",
      source: PHB_SOURCE,
      description: "Lucky",
    })
    expect(lucky.icon).toBe("clover")
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
