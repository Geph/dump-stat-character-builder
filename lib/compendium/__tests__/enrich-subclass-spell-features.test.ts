import { describe, expect, it } from "vitest"
import { enrichSubclassSpellTableFeatures } from "@/lib/compendium/enrich-subclass-spell-features"
import type { Feature } from "@/lib/types"

describe("enrichSubclassSpellTableFeatures", () => {
  it("does not auto-wire a multi-table 'choose a subtype' spell feature", () => {
    const feature: Feature = {
      id: "feat_land_spells",
      name: "Circle of the Land Spells",
      level: 3,
      description:
        "<h3>Arid Land</h3><table><tbody><tr><td>Druid Level</td><td>Circle Spells</td></tr>" +
        "<tr><td>3</td><td>Blur</td></tr></tbody></table>" +
        "<h3>Polar Land</h3><table><tbody><tr><td>Druid Level</td><td>Circle Spells</td></tr>" +
        "<tr><td>3</td><td>Fog Cloud</td></tr></tbody></table>",
    } as Feature
    const row = { features: [feature] } as Record<string, unknown>
    const catalog = [
      { id: "spell_blur", name: "Blur" },
      { id: "spell_fog_cloud", name: "Fog Cloud" },
    ]

    const result = enrichSubclassSpellTableFeatures(row, catalog) as { features: Feature[] }

    expect(result.features[0]?.linkedModifiers ?? []).toEqual([])
  })

  it("still wires an unambiguous single-table always-prepared spell feature", () => {
    const feature: Feature = {
      id: "feat_moon_spells",
      name: "Circle of the Moon Spells",
      level: 3,
      description:
        "<table><tbody><tr><td>Druid Level</td><td>Prepared Spells</td></tr>" +
        "<tr><td>3</td><td>Cure Wounds</td></tr><tr><td>5</td><td>Conjure Animals</td></tr></tbody></table>",
    } as Feature
    const row = { features: [feature] } as Record<string, unknown>
    const catalog = [
      { id: "spell_cure_wounds", name: "Cure Wounds" },
      { id: "spell_conjure_animals", name: "Conjure Animals" },
    ]

    const result = enrichSubclassSpellTableFeatures(row, catalog) as { features: Feature[] }
    const linked = result.features[0]?.linkedModifiers ?? []
    const spells = linked.flatMap((inst) =>
      (inst.characteristics ?? []).flatMap((c) =>
        c.type === "spells_known" ? c.spells.map((s) => [s.spellId, s.unlocksAtClassLevel]) : [],
      ),
    )
    expect(spells).toEqual([
      ["spell_cure_wounds", 3],
      ["spell_conjure_animals", 5],
    ])
  })
})
