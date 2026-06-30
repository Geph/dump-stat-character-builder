import { describe, expect, it } from "vitest"
import { enrichSrdFeatRow, presetForFeatName } from "@/lib/compendium/enrich-srd-feats"
import { PHB_SOURCE, SRD_SOURCE } from "@/lib/srd/source"

describe("enrichSrdFeatRow PHB presets", () => {
  it("wires Tough with per-level hit points", () => {
    const row = enrichSrdFeatRow({
      name: "Tough",
      source: PHB_SOURCE,
      description: "HP bonus per level",
    })
    const linked = (row.linked_modifiers ?? []) as { characteristics?: { type: string; mode?: string; value?: number }[] }[]
    const hp = linked.flatMap((inst) => inst.characteristics ?? []).find((c) => c.type === "hit_points")
    expect(hp?.mode).toBe("per_level")
    expect(hp?.value).toBe(2)
  })

  it("wires Crafter with three artisan tool picks", () => {
    const row = enrichSrdFeatRow({
      name: "Crafter",
      source: PHB_SOURCE,
      description: "Artisan tools",
    })
    const linked = (row.linked_modifiers ?? []) as { characteristics?: { type: string; choiceCount?: number }[] }[]
    const tools = linked.flatMap((inst) => inst.characteristics ?? []).find((c) => c.type === "tool_proficiencies")
    expect(tools?.choiceCount).toBe(3)
  })

  it("wires Lucky with proficiency-scaled luck points", () => {
    const row = enrichSrdFeatRow({
      name: "Lucky",
      source: PHB_SOURCE,
      description: "Luck points",
    })
    const linked = (row.linked_modifiers ?? []) as { characteristics?: { type: string; uses?: { type: string } }[] }[]
    const uses = linked.flatMap((inst) => inst.characteristics ?? []).find((c) => c.type === "uses")
    expect(uses?.uses?.type).toBe("proficiency")
  })

  it("does not overwrite existing linked modifiers", () => {
    const existing = [{ instanceId: "custom", catalogRefId: "cat_char_ac", characteristics: [] }]
    const row = enrichSrdFeatRow({
      name: "Tough",
      source: SRD_SOURCE,
      description: "HP",
      linked_modifiers: existing,
    })
    expect(row.linked_modifiers).toEqual(existing)
  })

  it("exposes presets for all PHB general feats in the bundle", () => {
    for (const name of ["Actor", "War Caster", "Polearm Master", "Resilient", "Dueling"]) {
      expect(presetForFeatName(name)?.linkedModifiers?.length).toBeGreaterThan(0)
    }
  })
})
