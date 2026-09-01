import { describe, expect, it } from "vitest"

import { collectActiveSheetToggleEffects } from "@/lib/character/collect-active-toggle-effects"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import type { Feature } from "@/lib/types"
import { getSheetToggleDefinition } from "@/lib/compendium/sheet-toggle-registry"

function dancerDetail(features: Feature[], subclassFeatures: Feature[] = []): CharacterClassDetail {
  return {
    row: { class_id: "dancer", level: 3, subclass_id: subclassFeatures.length ? "courtesan" : null, order: 0 },
    class: { id: "dancer", name: "Dancer", features } as unknown as CharacterClassDetail["class"],
    subclass: subclassFeatures.length
      ? ({ id: "courtesan", name: "Courtesan", features: subclassFeatures } as unknown as CharacterClassDetail["subclass"])
      : null,
  }
}

describe("collectActiveSheetToggleEffects", () => {
  it("lists Graceful Dodge and the active Dance Style while Dancing", () => {
    const sections = collectActiveSheetToggleEffects({
      focusToggleId: "while_dancing",
      activeToggleIds: ["while_dancing", "dance_style_spinning_shot"],
      definitions: [
        getSheetToggleDefinition("while_dancing")!,
        getSheetToggleDefinition("dance_style_spinning_shot")!,
      ],
      classDetails: [
        dancerDetail(
          [
            {
              level: 2,
              name: "Dance",
              description: "Begin a Dance.",
              linkedModifiers: [
                {
                  instanceId: "modinst_gd",
                  catalogRefId: "cat_char_resource_ability_menu",
                  characteristics: [
                    {
                      id: "mod_gd",
                      type: "resource_ability_menu",
                      resourceKey: "dance_die",
                      limitations: [
                        {
                          id: "lim_d",
                          kind: "sheet_toggle",
                          rule: "requires_active",
                          value: "while_dancing",
                        },
                      ],
                      options: [
                        {
                          name: "Graceful Dodge",
                          description: "Add your Dance Die to your AC against one attack.",
                          resourceCost: 0,
                        },
                      ],
                    },
                  ],
                },
              ],
            } as unknown as Feature,
            {
              level: 2,
              name: "Dance Styles",
              description: "Choose a Dance Style.",
              isChoice: true,
              choices: {
                category: "Dance Style",
                count: 1,
                resourceKey: "dance_styles_known",
                options: [],
              },
            } as Feature,
          ],
        ),
      ],
      catalog: [],
      remainingByToggleId: { while_dancing: "1 minute" },
    })

    expect(sections.map((section) => section.toggleId)).toEqual([
      "while_dancing",
      "dance_style_spinning_shot",
    ])
    expect(sections[0]?.remaining).toBe("1 minute")
    expect(sections[0]?.effects.some((line) => /Graceful Dodge/i.test(line.text))).toBe(true)
    expect(sections[1]?.effects[0]?.text).toMatch(/ranged attack rolls/i)
  })

  it("lists Rage damage resistance when raging", () => {
    const sections = collectActiveSheetToggleEffects({
      focusToggleId: "while_raging",
      activeToggleIds: ["while_raging"],
      definitions: [getSheetToggleDefinition("while_raging")!],
      classDetails: [
        {
          row: { class_id: "barbarian", level: 3, subclass_id: null, order: 0 },
          class: {
            id: "barbarian",
            name: "Barbarian",
            features: [
              {
                level: 1,
                name: "Rage",
                description: "",
                linkedModifiers: [
                  {
                    instanceId: "modinst_rage",
                    catalogRefId: "cat_char_damage_resistance",
                    characteristics: [
                      {
                        id: "mod_rage_res",
                        type: "damage_resistance",
                        damageTypes: ["Bludgeoning", "Piercing", "Slashing"],
                        limitations: [
                          {
                            id: "lim_rage",
                            kind: "sheet_toggle",
                            rule: "requires_active",
                            value: "while_raging",
                          },
                        ],
                      },
                    ],
                  },
                ],
              } as unknown as Feature,
            ],
          } as unknown as CharacterClassDetail["class"],
          subclass: null,
        },
      ],
      catalog: [],
    })

    expect(sections).toHaveLength(1)
    expect(sections[0]?.effects.map((line) => line.text)).toContain(
      "Resistance to Bludgeoning, Piercing, Slashing",
    )
  })

  it("lists injected default Dance Style riders without authored modifiers", () => {
    const sections = collectActiveSheetToggleEffects({
      focusToggleId: "while_dancing",
      activeToggleIds: ["while_dancing", "dance_style_agile_movement"],
      definitions: [
        getSheetToggleDefinition("while_dancing")!,
        getSheetToggleDefinition("dance_style_agile_movement")!,
      ],
      classDetails: [
        dancerDetail([
          {
            level: 2,
            name: "Dance",
            description: "Begin a Dance.",
          } as Feature,
          {
            level: 2,
            name: "Dance Styles",
            description: "Choose a Dance Style.",
            isChoice: true,
            choices: {
              category: "Dance Style",
              count: 1,
              resourceKey: "dance_styles_known",
              options: [],
            },
          } as Feature,
        ]),
      ],
      catalog: [],
    })
    expect(sections[0]?.effects.some((line) => /Graceful Dodge/i.test(line.text))).toBe(true)
    expect(
      sections
        .find((section) => section.toggleId === "dance_style_agile_movement")
        ?.effects.some((line) => /Opportunity Attacks/i.test(line.text)),
    ).toBe(true)
  })

  it("returns nothing when the focus toggle is off", () => {
    expect(
      collectActiveSheetToggleEffects({
        focusToggleId: "while_dancing",
        activeToggleIds: [],
        definitions: [getSheetToggleDefinition("while_dancing")!],
        classDetails: [],
        catalog: [],
      }),
    ).toEqual([])
  })
})
