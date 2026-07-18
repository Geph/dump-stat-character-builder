import { describe, expect, it } from "vitest"
import { enrichSubclassSpellTableFeatures } from "@/lib/compendium/enrich-subclass-spell-features"
import type { Feature } from "@/lib/types"

describe("enrichSubclassSpellTableFeatures", () => {
  it("does not auto-wire a multi-table feature without choice options", () => {
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

  it("wires Spells Known onto each land choice option", () => {
    const feature: Feature = {
      id: "feat_land_spells",
      name: "Circle of the Land Spells",
      level: 3,
      description: "Choose a land type.",
      isChoice: true,
      choices: {
        category: "Land type",
        count: 1,
        swappableOnRest: true,
        swapRestType: "long",
        options: [
          {
            name: "Arid",
            description:
              "**Arid Land**\n<table><tbody><tr><td>Druid Level</td><td>Circle Spells</td></tr>" +
              "<tr><td>3</td><td>Blur, Burning Hands</td></tr>" +
              "<tr><td>5</td><td>Fireball</td></tr></tbody></table>",
            linkedModifiers: [],
          },
          {
            name: "Polar",
            description:
              "**Polar Land**\n<table><tbody><tr><td>Druid Level</td><td>Circle Spells</td></tr>" +
              "<tr><td>3</td><td>Fog Cloud</td></tr></tbody></table>",
            linkedModifiers: [],
          },
        ],
      },
      linkedModifiers: [
        {
          instanceId: "modinst_empty",
          catalogRefId: "cat_char_spells_known",
          characteristics: [
            { id: "mod_empty", type: "spells_known", spells: [], alwaysPrepared: true },
          ],
        },
      ],
    } as Feature
    const catalog = [
      { id: "spell_blur", name: "Blur" },
      { id: "spell_burning_hands", name: "Burning Hands" },
      { id: "spell_fireball", name: "Fireball" },
      { id: "spell_fog_cloud", name: "Fog Cloud" },
    ]

    const result = enrichSubclassSpellTableFeatures({ features: [feature] }, catalog) as {
      features: Feature[]
    }
    const arid = result.features[0]?.choices?.options?.find((o) => o.name === "Arid")
    const aridSpells = arid?.linkedModifiers
      ?.flatMap((m) => m.characteristics ?? [])
      .find((c) => c.type === "spells_known")
    expect(aridSpells?.type).toBe("spells_known")
    if (aridSpells?.type === "spells_known") {
      expect(aridSpells.spells.map((s) => [s.spellId, s.unlocksAtClassLevel])).toEqual([
        ["spell_blur", 3],
        ["spell_burning_hands", 3],
        ["spell_fireball", 5],
      ])
    }
    // Empty feature-level placeholder removed once options are wired.
    expect(
      (result.features[0]?.linkedModifiers ?? []).flatMap((m) => m.characteristics ?? []),
    ).toEqual([])
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
