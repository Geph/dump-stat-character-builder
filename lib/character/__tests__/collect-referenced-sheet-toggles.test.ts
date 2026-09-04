import { describe, expect, it } from "vitest"
import {
  buildCharacterSheetToggleDefinitions,
  collectReferencedSheetToggleIds,
} from "@/lib/character/collect-referenced-sheet-toggles"
import type { Feature } from "@/lib/types"

describe("collectReferencedSheetToggleIds", () => {
  it("includes rage when a feature modifier requires while_raging", () => {
    const ids = collectReferencedSheetToggleIds({
      features: [
        {
          level: 1,
          name: "Rage",
          description: "",
          linkedModifiers: [
            {
              instanceId: "modinst_rage",
              catalogRefId: "cat_char_damage_roll_modifiers",
              characteristics: [
                {
                  id: "mod_rage",
                  type: "damage_roll_modifiers",
                  entries: [{ bonus: 2, target: "melee" }],
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
      feats: [],
      catalog: [],
    })
    expect(ids.has("while_raging")).toBe(true)
    expect(ids.has("form_of_dread")).toBe(false)
  })

  it("includes while_dancing from Dance uses even without authored limitations", () => {
    const ids = collectReferencedSheetToggleIds({
      features: [
        {
          level: 2,
          name: "Dance",
          description: "Bonus Action Dance.",
          limitedUses: {
            type: "class_resource",
            classResourceKey: "dances",
            classResourceAmount: 1,
          },
          linkedModifiers: [
            {
              instanceId: "modinst_gd",
              catalogRefId: "cat_char_resource_ability_menu",
              characteristics: [
                {
                  id: "mod_gd",
                  type: "resource_ability_menu",
                  resourceKey: "dance_die",
                  options: [
                    {
                      name: "Graceful Dodge",
                      description: "Add your Dance Die to your AC against one attack.",
                      resourceCost: 0,
                      bonusConfig: {
                        mode: "die",
                        dieScaling: "class_resource",
                        classResourceKey: "dance_die",
                      },
                    },
                  ],
                },
              ],
            },
          ],
        } as unknown as Feature,
      ],
      feats: [],
      catalog: [],
    })
    expect(ids.has("while_dancing")).toBe(true)
  })

  it("includes default Dance Style toggles from the Dance Styles picker", () => {
    const ids = collectReferencedSheetToggleIds({
      features: [
        {
          level: 2,
          name: "Dance Styles",
          description: "When you begin your Dance, choose a Dance Style.",
          isChoice: true,
          choices: {
            category: "Dance Style",
            count: 1,
            resourceKey: "dance_styles_known",
            optionsSource: "class_upgrades",
            options: [],
          },
        } as Feature,
        {
          level: 3,
          name: "Enthralling Movement [Dance Style]",
          description: "",
        } as Feature,
      ],
      feats: [],
      catalog: [],
    })
    expect(ids.has("dance_style_agile_movement")).toBe(true)
    expect(ids.has("dance_style_elegant_form")).toBe(true)
    expect(ids.has("dance_style_retaliatory_swipe")).toBe(true)
    expect(ids.has("dance_style_spinning_shot")).toBe(true)
    expect(ids.has("dance_style_enthralling_movement")).toBe(true)
  })

  it("includes first_turn_of_combat from an incoming-attack FeatureEffect", () => {
    const ids = collectReferencedSheetToggleIds({
      features: [
        {
          level: 2,
          name: "Nimble Start",
          description: "Attacks against you during the first round of combat have Disadvantage.",
          linkedModifiers: [
            {
              instanceId: "modinst_nimble",
              catalogRefId: "cat_fx_check_roll_modifier",
              activation: {
                effects: [
                  {
                    id: "mod_nimble",
                    kind: "check_roll_modifier",
                    incomingAttackMode: "disadvantage",
                    limitations: [
                      {
                        id: "lim_round1",
                        kind: "sheet_toggle",
                        rule: "requires_active",
                        value: "first_turn_of_combat",
                      },
                    ],
                  },
                ],
              },
            },
          ],
        } as unknown as Feature,
      ],
      feats: [],
      catalog: [],
    })
    expect(ids.has("first_turn_of_combat")).toBe(true)
  })

  it("includes Magic Weapon from prepared spell names, not from an unselected catalog ability", () => {
    const fromSpell = collectReferencedSheetToggleIds({
      features: [],
      feats: [],
      extraActionNames: ["Magic Weapon"],
      catalog: [],
    })
    expect(fromSpell.has("magic_weapon_active")).toBe(true)

    const fromCatalogLeak = collectReferencedSheetToggleIds({
      features: [],
      feats: [],
      catalog: [],
    })
    expect(fromCatalogLeak.has("magic_weapon_active")).toBe(false)
  })

  it("buildCharacterSheetToggleDefinitions omits unreferenced builtins and optional toggles", () => {
    const defs = buildCharacterSheetToggleDefinitions(new Set(["while_raging"]), [])
    expect(defs.map((entry) => entry.id)).toEqual(["while_raging"])
    expect(defs.some((entry) => entry.id === "in_combat_or_high_stakes")).toBe(false)
  })

  it("resolves optional psion toggles when referenced by a feature", () => {
    const defs = buildCharacterSheetToggleDefinitions(
      new Set(["in_combat_or_high_stakes"]),
      [],
    )
    expect(defs.map((entry) => entry.id)).toEqual(["in_combat_or_high_stakes"])
  })
})
