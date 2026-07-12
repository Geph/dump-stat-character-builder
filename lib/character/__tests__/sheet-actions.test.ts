import { describe, expect, it } from "vitest"

import { collectSheetActions } from "@/lib/character/sheet-actions"
import type { CharacterClassDetail } from "@/lib/character/character-classes"
import { enrichSrdClassList } from "@/lib/compendium/enrich-srd-classes"
import classes from "@/lib/srd/seed-data/classes.json"
import type { Feature, Species } from "@/lib/types"

function classDetail(
  features: Feature[],
  level = 5,
  opts: { subclassFeatures?: Feature[] } = {},
): CharacterClassDetail {
  return {
    row: { class_id: "class-1", level, subclass_id: opts.subclassFeatures ? "sub-1" : null, order: 0 },
    class: { id: "class-1", name: "Tester", features } as unknown as CharacterClassDetail["class"],
    subclass: opts.subclassFeatures
      ? ({ id: "sub-1", name: "Test Path", features: opts.subclassFeatures } as unknown as CharacterClassDetail["subclass"])
      : null,
  }
}

describe("collectSheetActions", () => {
  it("includes features with a top-level activation", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail([
          { level: 1, name: "Channel Divinity", description: "x", activation: { action: true } },
        ]),
      ],
      species: null,
    })
    expect(actions.map((a) => a.name)).toContain("Channel Divinity")
    expect(actions.find((a) => a.name === "Channel Divinity")?.kinds).toEqual(["action"])
  })

  it("excludes features whose level exceeds the class level", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail(
          [{ level: 11, name: "High Level Action", description: "x", activation: { action: true } }],
          5,
        ),
      ],
      species: null,
    })
    expect(actions.map((a) => a.name)).not.toContain("High Level Action")
  })

  it("derives kinds from a healing dice pool characteristic when the feature has no activation", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail([
          {
            level: 1,
            name: "Healing Light",
            description: "Spend dice to heal.",
            linkedModifiers: [
              {
                instanceId: "modinst_healing_light",
                catalogRefId: "cat_char_healing_dice_pool",
                characteristics: [
                  {
                    id: "mod_hl",
                    type: "healing_dice_pool",
                    dieType: "d6",
                    poolSize: 6,
                    activation: "bonus_action",
                  },
                ],
              },
            ],
          } as unknown as unknown as Feature,
        ]),
      ],
      species: null,
    })
    const healing = actions.find((a) => a.name === "Healing Light")
    expect(healing).toBeTruthy()
    expect(healing?.kinds).toEqual(["bonus"])
  })

  it("derives a reaction from a trigger characteristic with useReaction", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail([
          {
            level: 2,
            name: "Deflect",
            description: "React to halve damage.",
            linkedModifiers: [
              {
                instanceId: "modinst_deflect",
                catalogRefId: "cat_char_damage_halving_reaction",
                characteristics: [
                  { id: "mod_def", type: "damage_halving_reaction", useReaction: true },
                ],
              },
            ],
          } as unknown as unknown as Feature,
        ]),
      ],
      species: null,
    })
    expect(actions.find((a) => a.name === "Deflect")?.kinds).toEqual(["reaction"])
  })

  it("derives the activation from a linked modifier instance activation", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail([
          {
            level: 1,
            name: "Imported Maneuver",
            description: "x",
            linkedModifiers: [
              {
                instanceId: "modinst_maneuver",
                catalogRefId: "cat_fx_extra_action",
                activation: { bonusAction: true, effects: [] },
              },
            ],
          } as unknown as unknown as Feature,
        ]),
      ],
      species: null,
    })
    expect(actions.find((a) => a.name === "Imported Maneuver")?.kinds).toEqual(["bonus"])
  })

  it("binds an action to a class resource pool via resource_ability_menu", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail([
          {
            level: 1,
            name: "Maneuver Menu",
            description: "x",
            activation: { bonusAction: true },
            linkedModifiers: [
              {
                instanceId: "modinst_menu",
                catalogRefId: "cat_char_resource_ability_menu",
                characteristics: [
                  {
                    id: "mod_menu",
                    type: "resource_ability_menu",
                    resourceKey: "battle_dice",
                    options: [],
                  },
                ],
              },
            ],
          } as unknown as unknown as Feature,
        ]),
      ],
      species: null,
    })
    expect(actions.find((a) => a.name === "Maneuver Menu")?.classResourceKey).toBe("battle_dice")
  })

  it("ignores purely passive features", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail([
          {
            level: 1,
            name: "Darkvision Trait",
            description: "x",
            linkedModifiers: [
              {
                instanceId: "modinst_vision",
                catalogRefId: "cat_char_vision",
                characteristics: [{ id: "mod_v", type: "vision", senses: [] } as never],
              },
            ],
          } as unknown as unknown as Feature,
        ]),
      ],
      species: null,
    })
    expect(actions.map((a) => a.name)).not.toContain("Darkvision Trait")
  })

  it("surfaces a utility trait whose action economy is only described in prose (Stonecunning)", () => {
    const species = {
      id: "species-1",
      name: "Dwarf",
      traits: [
        {
          name: "Stonecunning",
          description:
            "As a Bonus Action, you gain Tremorsense with a range of 60 feet for 10 minutes. You must be on a stone surface or touching a stone surface to use this Tremorsense.",
        },
      ],
    } as unknown as unknown as Species
    const actions = collectSheetActions({ classDetails: [classDetail([], 5)], species })
    const stonecunning = actions.find((a) => a.name === "Stonecunning")
    expect(stonecunning).toBeTruthy()
    expect(stonecunning?.kinds).toEqual(["bonus"])
    expect(stonecunning?.category).toBe("utility")
  })

  it("classifies attack/damage features as combat and senses/movement as utility", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail([
          {
            level: 1,
            name: "Frenzied Strike",
            description: "As a Bonus Action, make a weapon attack that deals extra damage.",
            activation: { bonusAction: true },
          },
          {
            level: 1,
            name: "Misty Step",
            description: "As a Bonus Action, you teleport up to 30 feet to an unoccupied space you can see.",
          },
        ]),
      ],
      species: null,
    })
    expect(actions.find((a) => a.name === "Frenzied Strike")?.category).toBe("combat")
    expect(actions.find((a) => a.name === "Misty Step")?.category).toBe("utility")
  })

  it("surfaces a background feature action and labels it from Background", () => {
    const actions = collectSheetActions({
      classDetails: [classDetail([], 3)],
      species: null,
      backgroundFeature: {
        name: "Wand Tinker",
        description: "As a Magic Action, you can expend a charge to produce a minor effect.",
      },
    })
    const tinker = actions.find((a) => a.name === "Wand Tinker")
    expect(tinker?.kinds).toEqual(["action"])
    expect(tinker?.sourceLabel).toBe("Background")
  })

  it("surfaces species traits whose action economy lives in linked modifiers", () => {
    const species = {
      id: "species-1",
      name: "Dragonborn",
      traits: [
        {
          name: "Breath Weapon",
          description: "Exhale destructive energy.",
          linkedModifiers: [
            {
              instanceId: "modinst_breath",
              catalogRefId: "cat_char_special_attack",
              activation: { action: true, effects: [] },
            },
          ],
        },
      ],
    } as unknown as unknown as Species
    const actions = collectSheetActions({
      classDetails: [classDetail([], 5)],
      species,
    })
    const breath = actions.find((a) => a.name === "Breath Weapon")
    expect(breath).toBeTruthy()
    expect(breath?.kinds).toEqual(["action"])
    expect(breath?.sourceLabel).toBe("Dragonborn")
  })

  it("surfaces psionic custom abilities with casting headers in the Actions panel", () => {
    const actions = collectSheetActions({
      classDetails: [classDetail([], 5)],
      species: null,
      customAbilities: [
        {
          id: "power-1",
          name: "Enhancing Surge",
          description: "<p>Empower yourself.</p>",
          prerequisites: null,
          characteristics: null,
          attached_to_type: "class",
          attached_to_id: "class-1",
          uses: {
            type: "class_resource",
            classResourceKey: "psi_points",
            classResourceAmount: 2,
          },
          show_in_builder: true,
          ability_role: "psionic_power",
          casting_time: "1 bonus action",
          range: "Self",
          duration: "1 minute",
          psionic_augments: {
            resourceKey: "psi_points",
            allowMultiple: false,
            augments: [
              {
                id: "extend",
                name: "Extend",
                description: "Double duration.",
                resourceKey: "psi_points",
                cost: { fixed: 2 },
              },
            ],
          },
          icon: null,
          source: "KibblesTasty Psion",
          creator_url: null,
          created_at: "",
          updated_at: "",
        },
      ],
    })
    const surge = actions.find((a) => a.name === "Enhancing Surge")
    expect(surge?.kinds).toEqual(["bonus"])
    expect(surge?.castingTime).toBe("1 bonus action")
    expect(surge?.psionicAugments?.augments).toHaveLength(1)
    expect(surge?.classResourceKey).toBe("psi_points")
  })

  it("lists Action Surge on the combat tab only", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail([
          {
            level: 2,
            name: "Action Surge",
            description: "Take one additional action on your turn.",
            activation: { action: true },
            limitedUses: {
              type: "class_resource",
              classResourceKey: "action_surge",
              classResourceAmount: 1,
            },
            linkedModifiers: [
              {
                instanceId: "modinst_action_surge",
                catalogRefId: "cat_fx_extra_action",
                activation: { action: true, effects: [{ id: "fx1", kind: "extra_action" }] },
              },
            ],
          } as unknown as unknown as Feature,
        ], 5),
      ],
      species: null,
    })
    const surge = actions.find((a) => a.name === "Action Surge")
    expect(surge?.category).toBe("combat")
    expect(surge?.classResourceKey).toBe("action_surge")
  })

  it("expands Cunning Action into bonus-action Dash, Disengage, and Hide on the combat tab", () => {
    const enriched = enrichSrdClassList(classes as Record<string, unknown>[])
    const rogue = enriched.find((row) => row.name === "Rogue")!
    const actions = collectSheetActions({
      classDetails: [
        {
          row: { class_id: String(rogue.id), level: 5, subclass_id: null, order: 0 },
          class: rogue as unknown as CharacterClassDetail["class"],
          subclass: null,
        },
      ],
      species: null,
    })
    expect(actions.map((action) => action.name)).not.toContain("Cunning Action")
    const dash = actions.find((action) => action.name === "Dash")
    const disengage = actions.find((action) => action.name === "Disengage")
    const hide = actions.find((action) => action.name === "Hide")
    expect(dash?.kinds).toEqual(["bonus"])
    expect(dash?.sourceLabel).toBe("Cunning Action")
    expect(dash?.category).toBe("combat")
    expect(disengage?.kinds).toEqual(["bonus"])
    expect(disengage?.sourceLabel).toBe("Cunning Action")
    expect(hide?.kinds).toEqual(["bonus"])
    expect(hide?.sourceLabel).toBe("Cunning Action")
  })

  it("honors sheetDisplay when combat or utility actions are disabled", () => {
    const hidden = collectSheetActions({
      classDetails: [
        classDetail([
          {
            level: 2,
            name: "Action Surge",
            description: "Take one additional action on your turn.",
            activation: { action: true },
            sheetDisplay: {
              featuresTab: true,
              combatActions: false,
              abilitiesActions: false,
            },
          },
        ]),
      ],
      species: null,
    })
    expect(hidden.map((action) => action.name)).not.toContain("Action Surge")

    const utilityOnly = collectSheetActions({
      classDetails: [
        classDetail([
          {
            level: 1,
            name: "Channel Divinity",
            description: "As a magic action, you present your holy symbol.",
            activation: { action: true },
            sheetDisplay: {
              featuresTab: true,
              combatActions: false,
              abilitiesActions: true,
            },
          },
        ]),
      ],
      species: null,
    })
    const channel = utilityOnly.find((action) => action.name === "Channel Divinity")
    expect(channel?.category).toBe("utility")
  })

  it("surfaces a picked choice option with bonus-action modifiers (Eagle)", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail(
          [],
          3,
          {
            subclassFeatures: [
              {
                level: 3,
                name: "Rage of the Wilds",
                description: "Choose Bear, Eagle, or Wolf.",
                isChoice: true,
                choices: {
                  category: "Rage Option",
                  count: 1,
                  options: [
                    {
                      name: "Eagle",
                      description:
                        "While your Rage is active, you can take a Bonus Action to take the Disengage and Dash actions.",
                      linkedModifiers: [
                        {
                          instanceId: "modinst_eagle",
                          catalogRefId: "cat_fx_movement_option",
                          activation: {
                            bonusAction: true,
                            requirements: [{ kind: "while_raging" }],
                            effects: [
                              {
                                id: "fx_eagle",
                                kind: "movement_option",
                                label: "Take the Disengage and Dash actions",
                              },
                            ],
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        ),
      ],
      species: null,
      featureChoicePicks: {
        "class-1:L3:Rage of the Wilds": ["Eagle"],
      },
    })
    const eagle = actions.find((action) => action.name === "Eagle")
    expect(eagle).toBeTruthy()
    expect(eagle?.kinds).toEqual(["bonus"])
    expect(eagle?.description).toContain("Disengage and Dash")
  })
})
