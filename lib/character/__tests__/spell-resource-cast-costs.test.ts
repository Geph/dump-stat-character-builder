import { describe, expect, it } from "vitest"
import {
  collectSpellResourceCastCosts,
  formatResourceKeyDisplayName,
} from "@/lib/character/spell-resource-cast-costs"
import { abilitySpecializationChoiceKey } from "@/lib/import/parse-alternate-effects-table"
import type { CustomAbility, Spell } from "@/lib/types"

const catalog: Pick<Spell, "id" | "name">[] = [
  { id: "spell_heroism", name: "Heroism" },
  { id: "spell_haste", name: "Haste" },
  { id: "spell_arctic", name: "Arctic Breath" },
]

describe("collectSpellResourceCastCosts", () => {
  it("reads castCost from spells_known modifiers", () => {
    const abilities = [
      {
        id: "enhancement",
        name: "Enhancement Discipline",
        linkedModifiers: [
          {
            id: "mod",
            catalogRefId: "cat_char_spells_known",
            characteristics: [
              {
                id: "sk",
                type: "spells_known",
                label: "Alternate Effects",
                spells: [
                  {
                    spellId: "spell_heroism",
                    alwaysPrepared: true,
                    castCost: { resourceKey: "psi_points", amount: 1 },
                  },
                  {
                    spellId: "spell_haste",
                    alwaysPrepared: true,
                    castCost: { resourceKey: "psi_points", amount: 3 },
                  },
                ],
              },
            ],
          },
        ],
      },
    ] as unknown as CustomAbility[]

    const costs = collectSpellResourceCastCosts({
      customAbilities: abilities,
      spellCatalog: catalog,
    })
    expect(costs.get("spell_heroism")).toEqual({ resourceKey: "psi_points", amount: 1 })
    expect(costs.get("spell_haste")).toEqual({ resourceKey: "psi_points", amount: 3 })
  })

  it("falls back to parsing Alternate Effects tables from descriptions", () => {
    const abilities = [
      {
        id: "enhancement",
        name: "Enhancement Discipline",
        description: `<p><strong>Alternate Effects.</strong></p><table><tbody><tr><td>Point Cost</td><td>Alternate Effects</td></tr><tr><td>1</td><td>heroism</td></tr><tr><td>3</td><td>haste</td></tr></tbody></table>`,
        linkedModifiers: [],
      },
    ] as unknown as CustomAbility[]

    const costs = collectSpellResourceCastCosts({
      customAbilities: abilities,
      spellCatalog: catalog,
    })
    expect(costs.get("spell_heroism")?.amount).toBe(1)
    expect(costs.get("spell_haste")?.amount).toBe(3)
  })

  it("uses specialization replacement when picked", () => {
    const abilityId = "psychokinesis"
    const abilities = [
      {
        id: abilityId,
        name: "Psychokinesis Discipline",
        description: `<p><strong>Alternate Effects.</strong></p><table><tbody><tr><td>Point Cost</td><td>Alternate Effects</td></tr><tr><td>1</td><td>heroism</td></tr></tbody></table>`,
        linkedModifiers: [
          {
            id: "default",
            catalogRefId: "cat_char_spells_known",
            characteristics: [
              {
                id: "sk",
                type: "spells_known",
                label: "Alternate Effects",
                spells: [
                  {
                    spellId: "spell_heroism",
                    castCost: { resourceKey: "psi_points", amount: 1 },
                  },
                ],
              },
            ],
          },
        ],
        specialization_choices: {
          category: "Specialization",
          count: 1,
          options: [
            {
              name: "Cryokinetic",
              description: "1—arctic breath",
              linkedModifiers: [
                {
                  id: "cryo",
                  catalogRefId: "cat_char_spells_known",
                  characteristics: [
                    {
                      id: "sk2",
                      type: "spells_known",
                      label: "Cryokinetic Alternate Effects",
                      spells: [
                        {
                          spellId: "spell_arctic",
                          castCost: { resourceKey: "psi_points", amount: 1 },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    ] as unknown as CustomAbility[]

    const costs = collectSpellResourceCastCosts({
      customAbilities: abilities,
      featureChoicePicks: {
        [abilitySpecializationChoiceKey(abilityId)]: ["Cryokinetic"],
      },
      spellCatalog: catalog,
    })
    expect(costs.has("spell_heroism")).toBe(false)
    expect(costs.get("spell_arctic")).toEqual({ resourceKey: "psi_points", amount: 1 })
  })
})

describe("formatResourceKeyDisplayName", () => {
  it("title-cases resource keys", () => {
    expect(formatResourceKeyDisplayName("psi_points")).toBe("Psi Points")
    expect(formatResourceKeyDisplayName("sorcery_points")).toBe("Sorcery Points")
  })
})
