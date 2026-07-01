import { describe, expect, it } from "vitest"
import { enrichSrdFeatRow, presetForFeatName } from "@/lib/compendium/enrich-srd-feats"
import { SRD_SOURCE } from "@/lib/srd/source"

describe("enrichSrdFeatRow SRD presets", () => {
  it("wires Alert with initiative proficiency bonus", () => {
    const row = enrichSrdFeatRow({
      name: "Alert",
      source: SRD_SOURCE,
      description: "Initiative Proficiency",
    })
    const linked = (row.linked_modifiers ?? []) as { catalogRefId?: string }[]
    expect(linked.some((inst) => inst.catalogRefId === "cat_fx_check_roll_modifier")).toBe(true)
  })

  it("wires Skilled with shared skill/tool choice pool", () => {
    const row = enrichSrdFeatRow({
      name: "Skilled",
      source: SRD_SOURCE,
      description: "Three skills or tools",
    })
    const linked = (row.linked_modifiers ?? []) as { characteristics?: { sharedChoiceGroup?: string }[] }[]
    const skills = linked.flatMap((inst) => inst.characteristics ?? []).find((c) => c.sharedChoiceGroup === "skilled_proficiencies")
    expect(skills).toBeTruthy()
  })

  it("wires Magic Initiate as repeatable with spell picks", () => {
    const row = enrichSrdFeatRow({
      name: "Magic Initiate",
      source: SRD_SOURCE,
      description: "Cantrips and level-1 spell",
    })
    expect(row.repeatable).toBe(true)
    const linked = (row.linked_modifiers ?? []) as { characteristics?: { type: string }[] }[]
    expect(linked.flatMap((inst) => inst.characteristics ?? []).some((c) => c.type === "spells_known")).toBe(true)
  })

  it("does not overwrite existing linked modifiers", () => {
    const existing = [{ instanceId: "custom", catalogRefId: "cat_char_ac", characteristics: [] }]
    const row = enrichSrdFeatRow({
      name: "Alert",
      source: SRD_SOURCE,
      description: "Initiative",
      linked_modifiers: existing,
    })
    expect(row.linked_modifiers).toEqual(existing)
  })

  it("wires Grappler with punch-and-grab on-hit trigger", () => {
    const row = enrichSrdFeatRow({
      name: "Grappler",
      source: SRD_SOURCE,
      description: "Punch and Grab",
    })
    const linked = (row.linked_modifiers ?? []) as { characteristics?: { type: string }[] }[]
    expect(linked.flatMap((inst) => inst.characteristics ?? []).some((c) => c.type === "on_hit_trigger")).toBe(
      true,
    )
  })

  it("exposes presets only for bundled SRD feats", () => {
    for (const name of ["Alert", "Skilled", "Archery", "Boon of Truesight"]) {
      expect(presetForFeatName(name)?.linkedModifiers?.length).toBeGreaterThan(0)
    }
    expect(presetForFeatName("Lucky")).toBeUndefined()
    expect(presetForFeatName("Tough")).toBeUndefined()
  })
})
