import { describe, expect, it } from "vitest"
import {
  IMPORT_SPELL_NAME_PREFIX,
  resolveFeatureLinkedSpells,
  resolveLinkedModifierSpells,
} from "@/lib/import/resolve-linked-modifier-spells"
import { enrichAbilityImportRow } from "@/lib/import/enrich-ability-import"
import type { Feature } from "@/lib/types"

const CATALOG = [
  { id: "spell-heroism", name: "Heroism", source: "SRD 5.2.1" },
  { id: "spell-haste", name: "Haste", source: "SRD 5.2.1" },
  { id: "spell-enlarge-reduce", name: "Enlarge/Reduce", source: "SRD 5.2.1" },
  { id: "spell-druidcraft", name: "Druidcraft", source: "SRD 5.2.1" },
]

describe("resolveLinkedModifierSpells", () => {
  it("resolves import placeholders to catalog ids", () => {
    const linked = resolveLinkedModifierSpells(
      [
        {
          instanceId: "modinst_test",
          catalogRefId: "cat_char_spells_known",
          characteristics: [
            {
              id: "mod_test",
              type: "spells_known",
              spells: [
                { spellId: `${IMPORT_SPELL_NAME_PREFIX}heroism` },
                { spellId: `${IMPORT_SPELL_NAME_PREFIX}enlarge/reduce` },
                { spellId: `${IMPORT_SPELL_NAME_PREFIX}unlocked potential` },
              ],
            },
          ],
        },
      ],
      CATALOG,
    )
    const spells = (
      linked?.[0]?.characteristics?.[0] as { spells?: { spellId: string }[] } | undefined
    )?.spells
    expect(spells?.map((entry) => entry.spellId)).toEqual([
      "spell-heroism",
      "spell-enlarge-reduce",
      `${IMPORT_SPELL_NAME_PREFIX}unlocked potential`,
    ])
  })

  it("routes stored alias-stub catalog ids to the canonical spell", () => {
    const catalog = [
      ...CATALOG,
      { id: "stub-feeblemind", name: "Feeblemind", source: "Custom" },
      { id: "srd-befuddlement", name: "Befuddlement", source: "SRD 5.2.1" },
    ]
    const linked = resolveLinkedModifierSpells(
      [
        {
          instanceId: "modinst_test",
          catalogRefId: "cat_char_spells_known",
          characteristics: [
            {
              id: "mod_test",
              type: "spells_known",
              spells: [
                { spellId: "stub-feeblemind" },
                { spellId: `${IMPORT_SPELL_NAME_PREFIX}Feeblemind` },
              ],
            },
          ],
        },
      ],
      catalog,
    )
    const spells = (
      linked?.[0]?.characteristics?.[0] as { spells?: { spellId: string }[] } | undefined
    )?.spells
    expect(spells?.map((entry) => entry.spellId)).toEqual([
      "srd-befuddlement",
      "srd-befuddlement",
    ])
  })

  it("resolves bare spell names left as spellId", () => {
    const linked = resolveLinkedModifierSpells(
      [
        {
          instanceId: "modinst_test",
          catalogRefId: "cat_char_spells_known",
          characteristics: [
            {
              id: "mod_test",
              type: "spells_known",
              spells: [{ spellId: "Haste" }],
            },
          ],
        },
      ],
      CATALOG,
    )
    const spellId = (
      linked?.[0]?.characteristics?.[0] as { spells?: { spellId: string }[] } | undefined
    )?.spells?.[0]?.spellId
    expect(spellId).toBe("spell-haste")
  })

  it("resolves spells on feature choice options", () => {
    const feature = resolveFeatureLinkedSpells(
      {
        level: 1,
        name: "Fey Cantrips",
        description: "Learn a cantrip.",
        linkedModifiers: [],
        choices: {
          category: "Cantrip",
          count: 1,
          options: [
            {
              name: "Druidcraft",
              description: "You know Druidcraft.",
              linkedModifiers: [
                {
                  instanceId: "modinst_opt",
                  catalogRefId: "cat_char_spells_known",
                  characteristics: [
                    {
                      id: "mod_opt",
                      type: "spells_known",
                      spells: [{ spellId: `${IMPORT_SPELL_NAME_PREFIX}Druidcraft` }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      } as Feature,
      CATALOG,
    )
    const spellId = feature.choices?.options?.[0]?.linkedModifiers?.[0]?.characteristics?.find(
      (char) => char.type === "spells_known",
    )
    expect(spellId?.type).toBe("spells_known")
    if (spellId?.type === "spells_known") {
      expect(spellId.spells[0]?.spellId).toBe("spell-druidcraft")
    }
  })

  it("wires Alternate Effects placeholders through ability enrich then resolve", () => {
    const html = `<p><strong>Alternate Effects.</strong> When you learn this discipline, you can use your Psionics feature to cast the following spells.</p><table><tbody><tr><td>Point Cost</td><td>Alternate Effects</td></tr><tr><td>1</td><td>heroism, haste</td></tr></tbody></table>`
    const row = enrichAbilityImportRow({
      name: "Enhancement Discipline",
      ability_role: "discipline",
      description: html,
    })
    const linked = resolveLinkedModifierSpells(
      (row.linkedModifiers ?? row.linked_modifiers) as import("@/lib/compendium/linked-modifiers").LinkedModifierInstance[],
      CATALOG,
    )
    const spellsKnown = linked
      ?.flatMap((instance) => instance.characteristics ?? [])
      .find((char) => char.type === "spells_known")
    expect(spellsKnown?.type).toBe("spells_known")
    if (spellsKnown?.type === "spells_known") {
      expect(spellsKnown.spells.map((entry) => entry.spellId)).toEqual([
        "spell-heroism",
        "spell-haste",
      ])
    }
  })
})
