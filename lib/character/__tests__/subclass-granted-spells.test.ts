import { describe, expect, it } from "vitest"

import {
  collectSubclassAlwaysPreparedSpells,
  collectSubclassAlwaysPreparedSpellIds,
} from "@/lib/character/subclass-granted-spells"
import type { Feature, Subclass } from "@/lib/types"

const SPELL_CATALOG = [
  { id: "spell-aid", name: "Aid" },
  { id: "spell-bless", name: "Bless" },
  { id: "spell-cure-wounds", name: "Cure Wounds" },
  { id: "spell-lesser-restoration", name: "Lesser Restoration" },
  { id: "spell-revivify", name: "Revivify" },
  { id: "spell-death-ward", name: "Death Ward" },
]

const lifeDomainSpellsFeature: Feature = {
  level: 3,
  name: "Life Domain Spells",
  description: [
    "Your connection to this divine domain ensures you always have certain spells ready.",
    "**Life Domain Spells**",
    "<table><thead><tr><th>Cleric Level</th><th>Prepared Spells</th></tr></thead><tbody>",
    "<tr><td>3</td><td>Aid, Bless, Cure Wounds, Lesser Restoration</td></tr>",
    "<tr><td>5</td><td>Revivify</td></tr>",
    "<tr><td>7</td><td>Death Ward</td></tr>",
    "</tbody></table>",
  ].join("\n"),
}

describe("collectSubclassAlwaysPreparedSpells", () => {
  it("parses a domain spell table and level-gates entries", () => {
    const atLevel3 = collectSubclassAlwaysPreparedSpells([lifeDomainSpellsFeature], 3, SPELL_CATALOG)
    expect(atLevel3.map((g) => g.spellId).sort()).toEqual(
      ["spell-aid", "spell-bless", "spell-cure-wounds", "spell-lesser-restoration"].sort(),
    )

    const atLevel5 = collectSubclassAlwaysPreparedSpells([lifeDomainSpellsFeature], 5, SPELL_CATALOG)
    expect(atLevel5.map((g) => g.spellId)).toContain("spell-revivify")
    expect(atLevel5.map((g) => g.spellId)).not.toContain("spell-death-ward")

    const atLevel7 = collectSubclassAlwaysPreparedSpells([lifeDomainSpellsFeature], 7, SPELL_CATALOG)
    expect(atLevel7.map((g) => g.spellId)).toContain("spell-death-ward")
  })

  it("prefers already-wired spells_known modifiers over parsing", () => {
    const wired: Feature = {
      level: 3,
      name: "Mind Domain Spells",
      description: "Always prepared spells from your domain.",
      linkedModifiers: [
        {
          instanceId: "modinst_mind",
          catalogRefId: "cat_char_spells_known",
          characteristics: [
            {
              id: "mod_mind",
              type: "spells_known",
              alwaysPrepared: true,
              spells: [
                { spellId: "spell-bless", prepared: true, alwaysPrepared: true, unlocksAtClassLevel: 3 },
                { spellId: "spell-death-ward", prepared: true, alwaysPrepared: true, unlocksAtClassLevel: 7 },
              ],
            },
          ],
        },
      ],
    }
    const atLevel3 = collectSubclassAlwaysPreparedSpells([wired], 3, SPELL_CATALOG)
    expect(atLevel3.map((g) => g.spellId)).toEqual(["spell-bless"])
  })

  it("excludes features above the current class level", () => {
    const result = collectSubclassAlwaysPreparedSpells([lifeDomainSpellsFeature], 2, SPELL_CATALOG)
    expect(result).toEqual([])
  })

  it("collectSubclassAlwaysPreparedSpellIds dedups across subclasses", () => {
    const subclass = { features: [lifeDomainSpellsFeature] } as unknown as Subclass
    const ids = collectSubclassAlwaysPreparedSpellIds(
      [
        { subclass, classLevel: 5 },
        { subclass, classLevel: 5 },
      ],
      SPELL_CATALOG,
    )
    expect(ids.sort()).toEqual(
      [
        "spell-aid",
        "spell-bless",
        "spell-cure-wounds",
        "spell-lesser-restoration",
        "spell-revivify",
      ].sort(),
    )
  })
})
