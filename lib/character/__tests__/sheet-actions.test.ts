import { describe, expect, it } from "vitest"

import {
  collectSheetActions,
  flexibleEconomyKindsFromText,
  selectableEconomyKinds,
} from "@/lib/character/sheet-actions"
import { attachClassDetails, type CharacterClassDetail } from "@/lib/character/character-classes"
import { enrichSrdClassList } from "@/lib/compendium/enrich-srd-classes"
import classes from "@/lib/srd/seed-data/classes.json"
import type { DndClass, Feat, Feature, Species } from "@/lib/types"

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
  it("shows Sacrifice Foe as a notice on Sacrificial Strike and Skill", () => {
    const [detail] = attachClassDetails(
      [{ class_id: "cls_martyr", level: 7, order: 0 }],
      [
        {
          id: "cls_martyr",
          name: "Martyr",
          features: [
            {
              name: "Sacrificial Strike",
              level: 1,
              description: "Bonus Action: take 5 Radiant and deal +10 Radiant.",
              activation: { bonusAction: true },
              sheetDisplay: { combatActions: true },
            },
            {
              name: "Sacrificial Skill",
              level: 1,
              description: "When you fail a D20 Test, take 10 Radiant for +5.",
              sheetDisplay: { combatActions: true },
            },
            {
              name: "Sacrifice Foe",
              level: 7,
              description:
                "When you make an attack or damage roll that is improved by your Sacrifice feature, and the attack reduces an enemy to 0 Hit Points, you don't take Radiant damage from using the feature.",
            },
          ],
        } as DndClass,
      ],
      [],
    )
    const actions = collectSheetActions({
      classDetails: [detail],
      species: null,
    })
    expect(actions.map((action) => action.name)).not.toContain("Sacrifice Foe")
    for (const name of ["Sacrificial Strike", "Sacrificial Skill"]) {
      const action = actions.find((entry) => entry.name === name)
      expect(action?.relatedTalentAlerts?.map((alert) => alert.name)).toContain("Sacrifice Foe")
      expect(action?.relatedTalentAlerts?.[0]?.summary).toMatch(/0 Hit Points/i)
    }
  })

  it("exposes Divine Respite as a utility restore-hit-dice action", () => {
    const [detail] = attachClassDetails(
      [{ class_id: "cls_martyr", level: 12, order: 0 }],
      [
        {
          id: "cls_martyr",
          name: "Martyr",
          features: [
            {
              name: "Divine Respite",
              level: 9,
              description:
                "When you finish a Short Rest, you can choose to regain up to 3 expended Hit Point Dice. Once you use this feature, you can't do so again until you finish a Long Rest.",
            },
          ],
        } as DndClass,
      ],
      [],
    )
    const actions = collectSheetActions({
      classDetails: [detail],
      species: null,
    })
    const respite = actions.find((action) => action.name === "Divine Respite")
    expect(respite?.category).toBe("utility")
    expect(respite?.showOnAbilitiesTab).toBe(false)
    expect(respite?.showOnCombatTab).toBe(false)
    expect(respite?.showOnRestDialogues).toBe(true)
    expect(respite?.spendsEconomy).toBe(false)
    expect(respite?.restoreHitDiceOnUse).toEqual({ amount: 3, restoreOn: "short_rest" })

    const [at13] = attachClassDetails(
      [{ class_id: "cls_martyr", level: 13, order: 0 }],
      [
        {
          id: "cls_martyr",
          name: "Martyr",
          features: [
            {
              name: "Divine Respite",
              level: 9,
              description:
                "When you finish a Short Rest, you can choose to regain up to 3 expended Hit Point Dice.",
            },
          ],
        } as DndClass,
      ],
      [],
    )
    const scaled = collectSheetActions({
      classDetails: [at13],
      species: null,
    }).find((action) => action.name === "Divine Respite")
    expect(scaled?.restoreHitDiceOnUse).toEqual({ amount: 6, restoreOn: "short_rest" })
  })

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

  it("includes feat combat actions such as Battle Medic from Healer", () => {
    const actions = collectSheetActions({
      classDetails: [classDetail([])],
      species: null,
      feats: [
        {
          id: "feat-healer",
          name: "Healer",
          description: "Battle Medic as a Utilize action.",
          linkedModifiers: [
            {
              instanceId: "modinst_healer_battle_medic",
              catalogRefId: "cat_fx_heal_self",
              activation: {
                action: true,
                effects: [
                  {
                    id: "mod_healer_battle_medic",
                    kind: "heal_self",
                    healTarget: "choose_ally",
                    healMode: "proficiency",
                    label: "Battle Medic",
                  },
                ],
              },
            },
          ],
        } as unknown as import("@/lib/types").Feat,
      ],
    })
    const battleMedic = actions.find((a) => a.name === "Battle Medic")
    expect(battleMedic).toMatchObject({
      kinds: ["action"],
      category: "combat",
      sourceLabel: "Feat",
      icon: "healing",
    })
  })

  it("attaches Survivor's proficiency bonus so the Use overlay can state +PB", () => {
    const actions = collectSheetActions({
      classDetails: [classDetail([])],
      species: null,
      feats: [
        {
          id: "feat-survivor",
          name: "Survivor",
          description: "Steel Yourself.",
          linkedModifiers: [
            {
              instanceId: "modinst_survivor_steel",
              catalogRefId: "cat_char_uses",
              characteristics: [],
            },
            {
              instanceId: "modinst_survivor_steel_bonus",
              catalogRefId: "cat_fx_check_roll_modifier",
              activation: {
                reaction: true,
                effects: [
                  {
                    id: "mod_survivor_steel_bonus",
                    kind: "check_bonus",
                    checkCategory: "save",
                    bonusConfig: { mode: "proficiency" },
                  },
                ],
              },
            },
          ],
        } as unknown as import("@/lib/types").Feat,
      ],
    })
    const survivor = actions.find((action) => action.name === "Survivor")
    expect(survivor?.useBonuses).toEqual([
      expect.objectContaining({
        appliesTo: "saving throws",
        rollMode: "bonus",
        bonusConfig: { mode: "proficiency" },
      }),
    ])
  })

  it("files Elemental Adept as a Passive reminder with the chosen energy type", () => {
    const actions = collectSheetActions({
      classDetails: [classDetail([])],
      species: null,
      modifierPlayerPicks: {
        "feat:granted:feat-elemental::mod_elemental_adept_type::damage_type": ["Fire"],
      },
      feats: [
        {
          id: "feat-elemental",
          name: "Elemental Adept",
          description:
            "<p><strong>Energy Mastery.</strong> Choose one of the following damage types: Acid, Cold, Fire, Lightning, or Thunder. You have Resistance to damage of the chosen type.</p><p><strong>Repeatable.</strong> You can take this feat more than once, but you must choose a different damage type each time for Energy Mastery.</p>",
          icon: "fire-silhouette",
          linkedModifiers: [
            {
              instanceId: "modinst_elemental_adept_type",
              catalogRefId: "cat_char_damage_resistance",
              characteristics: [
                {
                  id: "mod_elemental_adept_type",
                  type: "damage_resistance",
                  damageTypes: [],
                  choiceCount: 1,
                  choiceOptions: ["Acid", "Cold", "Fire", "Lightning", "Thunder"],
                  label: "Energy Mastery",
                },
              ],
            },
          ],
        } as unknown as import("@/lib/types").Feat,
      ],
    })
    const adept = actions.find((action) => action.name.startsWith("Elemental Adept"))
    expect(adept).toMatchObject({
      name: "Elemental Adept — Fire",
      reminderOnly: true,
      trigger: "Fire",
      category: "combat",
      sourceLabel: "Feat",
      icon: "fire-silhouette",
      spendsEconomy: false,
    })
    expect(adept?.menuOptions).toBeUndefined()
  })

  it("surfaces War Caster Reactive Spell as a reaction that picks a 1-action spell", () => {
    const actions = collectSheetActions({
      classDetails: [classDetail([])],
      species: null,
      feats: [
        {
          id: "feat-war-caster",
          name: "War Caster",
          description:
            "When a creature that you can see within 5 feet of you takes the Disengage action or hits you with an attack, you can take a Reaction to cast a spell at the creature.",
          linkedModifiers: [
            {
              instanceId: "modinst_war_caster_reactive",
              catalogRefId: "cat_fx_cast_spell",
              activation: {
                reaction: true,
                effects: [
                  {
                    id: "mod_war_caster_reactive",
                    kind: "cast_spell",
                    castSpellCastingTime: "action",
                    label: "Reactive Spell",
                  },
                ],
              },
            },
          ],
        } as unknown as import("@/lib/types").Feat,
      ],
    })
    const reactive = actions.find((action) => action.name === "Reactive Spell")
    expect(reactive).toMatchObject({
      kinds: ["reaction"],
      category: "combat",
      sourceLabel: "War Caster",
      castSpellChoice: {
        castingTime: "action",
        withoutSlot: false,
        economyKind: "reaction",
      },
    })
    expect(reactive?.healEffects ?? []).toEqual([])
  })

  it("names an unlabeled War Caster cast from the Reactive Spell benefit heading", () => {
    const actions = collectSheetActions({
      classDetails: [classDetail([])],
      species: null,
      feats: [
        {
          id: "feat-war-caster-stored",
          name: "War Caster",
          description:
            "You gain the following benefits. Ability Score Increase. Increase your Wisdom score by 1. Concentration. You have Advantage on Constitution saving throws. Reactive Spell. When a creature provokes an Opportunity Attack from you by leaving your reach, you can take a Reaction to cast a spell at the creature rather than making an Opportunity Attack.",
          linkedModifiers: [
            {
              instanceId: "modinst_war_caster_reactive",
              catalogRefId: "cat_fx_cast_spell",
              activation: {
                reaction: true,
                effects: [
                  {
                    id: "mod_war_caster_reactive",
                    kind: "cast_spell",
                    castSpellCastingTime: "action",
                  },
                ],
              },
            },
          ],
        } as unknown as import("@/lib/types").Feat,
      ],
    })
    expect(actions.find((action) => action.name === "Reactive Spell")?.sourceLabel).toBe("War Caster")
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
    expect(surge?.category).toBe("combat")
    expect(surge?.castingTime).toBe("1 bonus action")
    expect(surge?.psionicAugments?.augments).toHaveLength(1)
    expect(surge?.classResourceKey).toBe("psi_points")
  })

  it("surfaces Astral Construct special attack and catalog-only discipline powers on combat", () => {
    const actions = collectSheetActions({
      classDetails: [classDetail([], 5)],
      species: null,
      customAbilities: [
        {
          id: "power-astral",
          name: "Astral Construct",
          description: "<p>Create a construct and make a melee spell attack.</p>",
          ability_role: "psionic_power",
          casting_time: "1 action",
          linked_modifiers: [
            {
              instanceId: "modinst_astral",
              catalogRefId: "cat_char_special_attack",
              characteristics: [
                {
                  id: "mod_astral",
                  type: "special_attack",
                  attackName: "Astral Construct",
                  attackProfile: "melee",
                },
              ],
            },
          ],
        } as unknown as import("@/lib/types").CustomAbility,
        {
          id: "discipline-telekinesis",
          name: "Telekinesis Discipline",
          description: "Move objects with your mind.",
          ability_role: "discipline",
          modifier_catalog: [
            {
              id: "cat_force",
              name: "Telekinetic Force",
              group: "Psionic Powers",
              summary: "1 action · 60 feet",
              description: "<p>Hurl a creature or object.</p>",
              characteristics: [
                {
                  id: "mod_force",
                  type: "special_attack",
                  attackName: "Telekinetic Force",
                  attackProfile: "ranged",
                },
              ],
              activation: { action: true, effects: [] },
            },
          ],
        } as unknown as import("@/lib/types").CustomAbility,
      ],
    })

    const astral = actions.find((a) => a.name === "Astral Construct")
    expect(astral?.category).toBe("combat")
    expect(astral?.kinds).toEqual(["action"])

    const force = actions.find((a) => a.name === "Telekinetic Force")
    expect(force?.category).toBe("combat")
    expect(force?.kinds).toEqual(["action"])
    expect(force?.sourceLabel).toBe("Telekinesis Discipline")
  })

  it("keeps both Bomb modes and resolves their class-level damage", () => {
    const baseAttack = {
      properties: [],
      damageTypes: ["Fire"],
      damageDiceCount: 1,
      damageDieType: "d10" as const,
      damageByLevel: [
        { level: 1, mode: "dice" as const, dieCount: 1, dieType: "d10" as const },
        { level: 5, mode: "dice" as const, dieCount: 2, dieType: "d10" as const },
      ],
    }
    const actions = collectSheetActions({
      classDetails: [
        classDetail(
          [
            {
              level: 1,
              name: "Bombs",
              description: "Create and throw Bombs.",
              activation: { action: true },
              linkedModifiers: [
                {
                  instanceId: "modinst_bomb",
                  catalogRefId: "cat_char_special_attack",
                  characteristics: [
                    {
                      ...baseAttack,
                      id: "bomb_attack",
                      type: "special_attack",
                      attackVariant: "attack",
                      attackProfile: "ranged",
                    },
                    {
                      ...baseAttack,
                      id: "bomb_explode",
                      type: "special_attack",
                      attackVariant: "explode",
                      attackProfile: "force_save",
                    },
                  ],
                },
              ],
            },
          ],
          5,
        ),
      ],
      species: null,
      customAbilities: [],
    })

    const bomb = actions.find((action) => action.name === "Bombs")
    expect(bomb?.specialAttacks?.map((profile) => profile.attackVariant)).toEqual([
      "attack",
      "explode",
    ])
    expect(bomb?.specialAttacks?.map((profile) => profile.damageDiceCount)).toEqual([2, 2])
    expect(bomb?.spendsEconomy).not.toBe(false)
    expect(bomb?.icon).toBe("rolling-bomb")
  })

  it("folds Prime Bomb into Bombs and keeps formula riders on regular attacks", () => {
    const baseAttack = {
      properties: [],
      damageTypes: ["Fire"],
      damageDiceCount: 1,
      damageDieType: "d10" as const,
      resourceScaleKey: "reagents",
      bonusDicePerResource: "1d10",
      maxResourcesSpentByLevel: [
        { level: 2, mode: "fixed" as const, fixed: 1 },
        { level: 5, mode: "fixed" as const, fixed: 2 },
      ],
      damageByLevel: [
        { level: 1, mode: "dice" as const, dieCount: 1, dieType: "d10" as const },
        { level: 5, mode: "dice" as const, dieCount: 2, dieType: "d10" as const },
      ],
    }
    const actions = collectSheetActions({
      classDetails: [
        classDetail(
          [
            {
              level: 1,
              name: "Bombs",
              description: "Create and throw Bombs.",
              activation: { action: true },
              linkedModifiers: [
                {
                  instanceId: "modinst_bomb",
                  catalogRefId: "cat_char_special_attack",
                  characteristics: [
                    {
                      ...baseAttack,
                      id: "bomb_attack",
                      type: "special_attack",
                      attackVariant: "attack",
                      attackProfile: "ranged",
                    },
                    {
                      ...baseAttack,
                      id: "bomb_explode",
                      type: "special_attack",
                      attackVariant: "explode",
                      attackProfile: "force_save",
                    },
                  ],
                },
              ],
            },
            {
              level: 2,
              name: "Prime Bomb",
              description: "Spend Reagents to prime a Bomb.",
              activation: { action: true },
              sheetDisplay: { combatActions: true },
              linkedModifiers: [
                {
                  instanceId: "modinst_prime",
                  catalogRefId: "cat_char_special_attack",
                  characteristics: [
                    {
                      ...baseAttack,
                      id: "prime_attack",
                      type: "special_attack",
                      attackVariant: "attack",
                      attackProfile: "ranged",
                    },
                    {
                      ...baseAttack,
                      id: "prime_explode",
                      type: "special_attack",
                      attackVariant: "explode",
                      attackProfile: "force_save",
                    },
                  ],
                },
              ],
            },
          ],
          6,
          {
            subclassFeatures: [
              {
                level: 3,
                name: "Painkiller Bomb",
                description: "A formula applied to a Bomb.",
                activation: { action: true },
                linkedModifiers: [
                  {
                    instanceId: "modinst_painkiller",
                    catalogRefId: "cat_char_power_rider",
                    characteristics: [
                      {
                        id: "char_painkiller",
                        type: "power_rider",
                        parentPowerNames: ["Bomb", "Bombs"],
                        appliesToAttackVariants: ["attack"],
                        selectable: true,
                        alertSummary: "Add Painkiller Bomb to a regular (non-primed) Bomb attack.",
                      },
                    ],
                  },
                ],
              },
              {
                level: 6,
                name: "Timed Demolition",
                description: "When you prime a Bomb, you can set a delay.",
                linkedModifiers: [
                  {
                    instanceId: "modinst_timed",
                    catalogRefId: "cat_char_power_rider",
                    characteristics: [
                      {
                        id: "char_timed",
                        type: "power_rider",
                        parentPowerNames: ["Bomb", "Bombs"],
                        alertSummary: "When you prime a Bomb, set a delay before it Explodes.",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ),
      ],
      species: null,
      customAbilities: [],
    })

    expect(actions.map((action) => action.name)).toEqual(["Bombs"])
    expect(actions[0]?.specialAttacks?.map((profile) => profile.attackVariant)).toEqual([
      "attack",
      "primed",
      "explode",
    ])
    expect(actions[0]?.specialAttacks?.find((profile) => profile.attackVariant === "attack")?.resourceScaleKey).toBeNull()
    expect(actions[0]?.specialAttacks?.find((profile) => profile.attackVariant === "primed")?.resourceScaleKey).toBe(
      "reagents",
    )
    expect(actions[0]?.relatedTalentAlerts?.map((alert) => alert.name)).toEqual([
      "Painkiller Bomb",
      "Timed Demolition",
    ])
    expect(actions[0]?.relatedTalentAlerts?.[0]).toMatchObject({
      selectable: true,
      appliesToAttackVariants: ["attack"],
    })
    expect(actions[0]?.relatedTalentAlerts?.[1]).toMatchObject({
      selectable: true,
      appliesToAttackVariants: ["primed"],
    })
  })

  it("files Potion Brewing on Abilities and Potion Mixologist on Combat", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail(
          [
            {
              level: 1,
              name: "Potion Brewing",
              description:
                "You can spend 10 minutes and Reagents to brew a potion. Potion of Healing restores hit points.",
              activation: { action: true, noEconomyCost: true },
            },
            {
              level: 10,
              name: "Potion Mixologist",
              description: "As a Bonus Action, you drink two potions at once.",
              activation: { bonusAction: true },
            },
          ],
          10,
        ),
      ],
      species: null,
    })
    expect(actions.find((action) => action.name === "Potion Brewing")?.category).toBe("utility")
    expect(actions.find((action) => action.name === "Potion Mixologist")?.category).toBe("combat")
  })

  it("keeps Potion Mixologist on Combat when seed data filed it as Abilities-only", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail(
          [
            {
              level: 15,
              name: "Potion Mixologist",
              description:
                "You can mix two potions together and drink them as a Bonus Action.",
              activation: { bonusAction: true },
              sheetDisplay: { abilitiesActions: true },
            },
          ],
          15,
        ),
      ],
      species: null,
    })
    const mixologist = actions.find((action) => action.name === "Potion Mixologist")
    expect(mixologist?.category).toBe("combat")
    expect(mixologist?.kinds).toEqual(["bonus"])
    expect(actions.filter((action) => action.name === "Potion Mixologist")).toHaveLength(1)
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
              type: "at_level",
              atLevelMode: "tier",
              recharges: [{ rest: "short_rest" }],
              atLevelTable: [
                { level: 2, count: 1 },
                { level: 17, count: 2 },
              ],
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
    expect(surge?.classResourceKey).toBeNull()
    expect(surge?.limitedUses?.type).toBe("at_level")
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

    const restOnly = collectSheetActions({
      classDetails: [
        classDetail(
          [
          {
            level: 9,
            name: "Divine Respite",
            description: "When you finish a Short Rest, you can choose to regain Hit Point Dice.",
            activation: { action: true, noEconomyCost: true },
            sheetDisplay: {
              featuresTab: true,
              combatActions: false,
              abilitiesActions: false,
              restDialogues: true,
            },
          },
          ],
          9,
        ),
      ],
      species: null,
    })
    const restAction = restOnly.find((action) => action.name === "Divine Respite")
    expect(restAction?.showOnAbilitiesTab).toBe(false)
    expect(restAction?.showOnRestDialogues).toBe(true)
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

  it("attaches related talent alerts to matching custom ability actions", () => {
    const actions = collectSheetActions({
      classDetails: [],
      species: null,
      featureChoicePicks: {
        "class-1:L2:Psychoportation Talents": ["Flickering Escape"],
      },
      customAbilities: [
        {
          id: "ability-phase-rift",
          name: "Phase Rift",
          description: "Teleport briefly.",
          ability_role: "psionic_power",
          casting_time: "1 action",
        } as unknown as import("@/lib/types").CustomAbility,
        {
          id: "ability-flicker",
          name: "Psychoportation Discipline",
          description: "Talents",
          ability_role: "discipline",
          choices: {
            count: 1,
            options: [
              {
                name: "Flickering Escape",
                description: "Bring a friend when you flicker.",
                linkedModifiers: [
                  {
                    instanceId: "modinst_rider",
                    catalogRefId: "cat_char_power_rider",
                    characteristics: [
                      {
                        id: "mod_rider",
                        type: "power_rider",
                        parentPowerNames: ["Phase Rift"],
                        alertSummary: "Can bring one willing creature when you flicker",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        } as unknown as import("@/lib/types").CustomAbility,
      ],
    })
    const phaseRift = actions.find((action) => action.name === "Phase Rift")
    expect(phaseRift?.relatedTalentAlerts?.map((alert) => alert.name)).toEqual([
      "Flickering Escape",
    ])
    expect(phaseRift?.relatedTalentAlerts?.[0]?.summary).toContain("willing creature")
  })

  it("attaches menu-scoped power_riders only when the parent lists that option", () => {
    const actions = collectSheetActions({
      classDetails: [
        {
          row: { class_id: "w1", level: 3, subclass_id: "s1", order: 0 },
          class: {
            id: "w1",
            name: "Warden",
            hit_die: 10,
            features: [
              {
                level: 1,
                name: "Guardian Tactics",
                description: "Bonus Action tactics.",
                activation: { bonusAction: true },
                sheetDisplay: { combatActions: true },
                linkedModifiers: [
                  {
                    instanceId: "menu",
                    catalogRefId: "cat_char_resource_ability_menu",
                    characteristics: [
                      {
                        id: "mod_menu",
                        type: "resource_ability_menu",
                        resourceKey: "",
                        waiveResourceCost: true,
                        options: [
                          { name: "Block", resourceCost: 0 },
                          { name: "Challenge", resourceCost: 0 },
                          { name: "Grasp", resourceCost: 0 },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          } as never,
          subclass: {
            id: "s1",
            name: "Nightgaunt",
            features: [
              {
                level: 3,
                name: "Death's Gambit",
                description: "When you damage a Challenged foe…",
                linkedModifiers: [
                  {
                    instanceId: "rider",
                    catalogRefId: "cat_char_power_rider",
                    characteristics: [
                      {
                        id: "mod_rider",
                        type: "power_rider",
                        parentPowerNames: ["Guardian Tactics"],
                        parentMenuOptionNames: ["Challenge"],
                        alertSummary: "May drop Challenged foes to 0 HP",
                      },
                    ],
                  },
                ],
              },
            ],
          } as never,
        },
      ],
      species: null,
    })

    const tactics = actions.find((action) => action.name === "Guardian Tactics")
    expect(tactics?.menuOptions?.map((o) => o.name)).toEqual(["Block", "Challenge", "Grasp"])
    expect(tactics?.relatedTalentAlerts?.map((a) => a.name)).toEqual(["Death's Gambit"])
    expect(tactics?.relatedTalentAlerts?.[0]?.parentMenuOptionNames).toEqual(["Challenge"])
  })

  it("does not promote Weapon Mastery known-weapon picks into action cards", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail(
          [
            {
              level: 1,
              name: "Weapon Mastery",
              description: "You gain mastery with certain weapons.",
              isChoice: true,
              choices: {
                category: "Weapon Mastery",
                count: 2,
                options: [
                  {
                    name: "Scimitar",
                    description:
                      "Nick: When you make the extra attack of the Light property, you can make it as part of the Attack action instead of as a Bonus Action.",
                  },
                  {
                    name: "Longsword",
                    description:
                      "Sap: If you hit a creature with this weapon, that creature has Disadvantage on its next attack roll.",
                  },
                ],
              },
            } as Feature,
          ],
          5,
        ),
      ],
      species: null,
      featureChoicePicks: {
        "class-1:L1:Weapon Mastery": ["Scimitar", "Longsword"],
      },
    })

    expect(actions.map((a) => a.name)).not.toContain("Scimitar")
    expect(actions.map((a) => a.name)).not.toContain("Longsword")
  })

  it("attaches ally-targeted buffs and inspiration to sheet actions", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail([
          {
            level: 1,
            name: "Bardic Inspiration",
            description: "Give an ally a Bardic Inspiration die.",
            activation: { bonusAction: true },
            linkedModifiers: [
              {
                instanceId: "modinst_bi",
                catalogRefId: "cat_fx_modify_creature",
                activation: {
                  bonusAction: true,
                  effects: [
                    {
                      id: "fx_bi",
                      kind: "modify_creature",
                      rollTarget: "ally",
                      label: "Bardic Inspiration",
                    },
                  ],
                },
              },
            ],
          } as Feature,
          {
            level: 1,
            name: "Encouraging Song",
            description: "After a rest, give Heroic Inspiration to allies who hear you.",
            activation: { action: true },
          } as Feature,
        ]),
      ],
      species: null,
    })
    const bardic = actions.find((action) => action.name === "Bardic Inspiration")
    expect(bardic?.healEffects?.some((effect) => effect.kind === "modify_creature")).toBe(true)
    const song = actions.find((action) => action.name === "Encouraging Song")
    expect(song?.healEffects?.some((effect) => effect.kind === "grant_inspiration")).toBe(true)
  })

  it("merges Heroic Dance Inspiration onto the Dance action", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail(
          [
            {
              level: 2,
              name: "Dance",
              description: "Bonus Action: begin a Dance.",
              activation: { bonusAction: true },
              limitedUses: { type: "class_resource", classResourceKey: "dances" },
            } as Feature,
            {
              level: 9,
              name: "Heroic Dance",
              description:
                "When you begin your Dance, you can give yourself Heroic Inspiration if you don't have it.",
              linkedModifiers: [
                {
                  instanceId: "modinst_heroic_dance_insp",
                  catalogRefId: "cat_fx_grant_inspiration",
                  activation: {
                    effects: [
                      {
                        id: "fx_heroic_dance_inspiration",
                        kind: "grant_inspiration",
                        healTarget: "self",
                        label: "Heroic Inspiration",
                      },
                    ],
                  },
                },
                {
                  instanceId: "modinst_heroic_dance",
                  catalogRefId: "cat_char_power_rider",
                  characteristics: [
                    {
                      id: "char_heroic_dance",
                      type: "power_rider",
                      parentPowerNames: ["Dance"],
                      alertSummary: "When you begin Dance: gain Heroic Inspiration if you don't have it.",
                    },
                  ],
                },
              ],
            } as Feature,
          ],
          9,
        ),
      ],
      species: null,
    })
    const dance = actions.find((action) => action.name === "Dance")
    expect(
      dance?.healEffects?.some(
        (effect) => effect.kind === "grant_inspiration" && effect.healTarget === "self",
      ),
    ).toBe(true)
    expect(dance?.relatedTalentAlerts?.some((alert) => /Heroic Dance|Heroic Inspiration/i.test(alert.name + alert.summary))).toBe(
      true,
    )
  })
})

describe("triggered activations", () => {
  it("cards a no-action-required spend and does not charge the action economy", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail([
          {
            level: 5,
            name: "Font of Inspiration",
            description:
              "You can expend a spell slot (no action required) to regain one expended use of Bardic Inspiration.",
            limitedUses: { type: "class_resource", classResourceKey: "bardic_inspiration" },
          } as Feature,
        ]),
      ],
      species: null,
    })
    const font = actions.find((action) => action.name === "Font of Inspiration")
    expect(font?.trigger).toBe("No action required")
    expect(font?.spendsEconomy).toBe(false)
  })

  it("files Grazing Shot and Maverick Spirit as passives, not actions", () => {
    const actions = collectSheetActions({
      classDetails: [classDetail([], 2)],
      species: null,
      customAbilities: [
        {
          id: "grazing-shot",
          name: "Grazing Shot",
          description:
            "<p>When you miss with a ranged attack roll using a weapon, you can expend one Risk Die (no action required) to deal damage to that creature equal to the number rolled on the die.</p>",
          prerequisites: null,
          characteristics: null,
          attached_to_type: "class",
          attached_to_id: "class-1",
          uses: { type: "class_resource", classResourceKey: "risk_dice", classResourceAmount: 1 },
          show_in_builder: true,
          ability_role: "knack",
          casting_time: "1 action",
          icon: null,
          source: "Mage Hand Press",
          creator_url: null,
          created_at: "",
          updated_at: "",
        },
        {
          id: "maverick-spirit",
          name: "Maverick Spirit",
          description:
            "<p>When you fail an Intelligence, Wisdom, or Charisma ability check or saving throw, you can expend one Risk Die to add it to the roll, potentially turning the failure into a success.</p>",
          prerequisites: null,
          characteristics: null,
          attached_to_type: "class",
          attached_to_id: "class-1",
          uses: { type: "class_resource", classResourceKey: "risk_dice", classResourceAmount: 1 },
          show_in_builder: true,
          ability_role: "knack",
          icon: null,
          source: "Mage Hand Press",
          creator_url: null,
          created_at: "",
          updated_at: "",
        },
      ],
    })
    const grazing = actions.find((action) => action.name === "Grazing Shot")
    expect(grazing?.trigger).toBe("When you miss")
    expect(grazing?.spendsEconomy).toBe(false)
    const maverick = actions.find((action) => action.name === "Maverick Spirit")
    expect(maverick?.trigger).toBe("When you fail a roll")
    expect(maverick?.spendsEconomy).toBe(false)
  })

  it("cards a drop-to-0 escape hatch that has uses but no action cost", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail(
          [
            {
              level: 9,
              name: "Cheat Death",
              description:
                "When you are reduced to 0 hit points, you can instead drop to 1 hit point.",
              limitedUses: { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long" }] },
            } as unknown as Feature,
          ],
          20,
        ),
      ],
      species: null,
    })
    expect(actions.find((action) => action.name === "Cheat Death")?.trigger).toBe(
      "When reduced to 0 HP",
    )
  })

  it("files onDropToZeroHp as a Passive and offers an immediately-used sibling heal", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail(
          [
            {
              level: 10,
              name: "Undying",
              description:
                "When you are reduced to 0 Hit Points but not killed outright, you can drop to 1 Hit Point instead and you can immediately use your Miraculous Healing (no action required).",
              activation: { onDropToZeroHp: true, alsoActivateFeatureNames: ["Miraculous Healing"] },
              limitedUses: { type: "fixed", fixedAmount: 1, recharges: [{ rest: "long_rest" }] },
            } as unknown as Feature,
            {
              level: 2,
              name: "Miraculous Healing",
              description: "As a Bonus Action, roll Hit Point Dice to heal.",
              activation: { bonusAction: true, spendHitDice: 1 },
              linkedModifiers: [
                {
                  instanceId: "modinst_mh",
                  catalogRefId: "cat_fx_heal_self",
                  activation: {
                    bonusAction: true,
                    spendHitDice: 1,
                    effects: [
                      {
                        id: "mod_mh",
                        kind: "heal_self",
                        healMode: "hit_dice",
                        healDiceCount: 1,
                        healAbility: "CON",
                      },
                    ],
                  },
                },
              ],
            } as unknown as Feature,
          ],
          12,
        ),
      ],
      species: null,
    })
    const undying = actions.find((action) => action.name === "Undying")
    expect(undying?.trigger).toBe("When reduced to 0 HP")
    expect(undying?.kinds).not.toContain("reaction")
    expect(undying?.dropToOneHpOnUse).toBe(true)
    expect(undying?.alsoActivate?.map((row) => row.name)).toEqual(["Miraculous Healing"])
    expect(undying?.alsoActivate?.[0]?.healEffects?.[0]).toMatchObject({
      kind: "heal_self",
      healMode: "hit_dice",
    })
  })

  it("leaves features with a real action cost out of the triggered bucket", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail([
          {
            level: 1,
            name: "Second Wind",
            description: "As a Bonus Action, you regain hit points when you fail to press on.",
            limitedUses: { type: "fixed", fixedAmount: 2 },
          } as unknown as Feature,
        ]),
      ],
      species: null,
    })
    const secondWind = actions.find((action) => action.name === "Second Wind")
    expect(secondWind?.kinds).toEqual(["bonus"])
    expect(secondWind?.trigger ?? null).toBeNull()
  })

  it("ignores a trigger phrase when nothing is spent", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail([
          {
            level: 1,
            name: "Blessed Strikes",
            description: "When you hit a creature with a cantrip, it takes extra radiant damage.",
          } as Feature,
        ]),
      ],
      species: null,
    })
    expect(actions.map((action) => action.name)).not.toContain("Blessed Strikes")
  })

  it("does not read an action cost out of a phrase that rules one out", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail(
          [
            {
              level: 10,
              name: "Divine Intervention",
              description:
                "As a Magic action, choose any Cleric spell of level 5 or lower that doesn't require a Reaction to cast.",
              limitedUses: { type: "fixed", fixedAmount: 1 },
            } as unknown as Feature,
          ],
          20,
        ),
      ],
      species: null,
    })
    expect(actions.find((action) => action.name === "Divine Intervention")?.kinds).not.toContain(
      "reaction",
    )
  })
})

describe("on-hit rider pickers", () => {
  const cunningStrike = {
    level: 5,
    name: "Cunning Strike",
    description: "When you deal Sneak Attack damage, you can add one Cunning Strike effect.",
    linkedModifiers: [
      {
        instanceId: "modinst_cunning",
        catalogRefId: "cat_char_bonus_damage_riders",
        characteristics: [
          {
            id: "mod_cunning",
            type: "bonus_damage_riders",
            riders: [
              { name: "Poison", costDice: "1d6", saveAbility: "Constitution", conditionOnFailedSave: "Poisoned" },
              { name: "Trip", costDice: "1d6", saveAbility: "Dexterity", conditionOnFailedSave: "Prone" },
              { name: "Withdraw", costDice: "1d6", description: "Move half your Speed." },
            ],
          },
        ],
      },
    ],
  } as unknown as Feature

  it("exposes riders as pickable options with their dice cost", () => {
    const actions = collectSheetActions({
      classDetails: [classDetail([cunningStrike], 20)],
      species: null,
    })
    const strike = actions.find((action) => action.name === "Cunning Strike")
    expect(strike?.trigger).toBe("On a hit")
    expect(strike?.category).toBe("combat")
    expect(strike?.menuOptions?.map((option) => option.name)).toEqual([
      "Poison",
      "Trip",
      "Withdraw",
    ])
    expect(strike?.menuOptions?.[0]?.costLabel).toBe("1d6")
    expect(strike?.menuOptions?.[0]?.description).toContain("Constitution save or Poisoned")
  })

  it("parses choose-one benefit lists and keeps Assault as a Bonus Action option", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail(
          [
            {
              level: 14,
              name: "Kingslayer",
              description:
                "Once per turn when you reduce an enemy to 0 Hit Points, choose one of the following benefits.\n\nAssault. As a Bonus Action, you can move up to 15 feet and make a melee attack.\n\nBreak Spells. The creature's spells and ongoing effects end.\n\nShatter Morale. Nearby allies of the creature have the Frightened condition.",
              sheetDisplay: { combatActions: true },
            },
          ],
          14,
        ),
      ],
      species: null,
    })
    const kingslayer = actions.find((action) => action.name === "Kingslayer")
    expect(kingslayer?.trigger).toBe("When you reduce a creature to 0 HP")
    expect(kingslayer?.spendsEconomy).toBe(false)
    expect(kingslayer?.menuOptions?.map((option) => option.name)).toEqual([
      "Assault",
      "Break Spells",
      "Shatter Morale",
    ])
    expect(kingslayer?.menuOptions?.[0]?.actionKind).toBe("bonus")
    expect(kingslayer?.menuOptions?.[1]?.actionKind).toBeUndefined()
  })

  it("charges the authored resource amount for an on-hit trigger spend", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail(
          [
            {
              level: 17,
              name: "Quivering Palm",
              description:
                "When you hit a creature with an Unarmed Strike, you can expend 4 Focus Points to start imperceptible vibrations.",
              linkedModifiers: [
                {
                  instanceId: "modinst_qp",
                  catalogRefId: "cat_char_on_hit_trigger",
                  characteristics: [
                    {
                      id: "mod_qp",
                      type: "on_hit_trigger",
                      spendResourceKey: "focus_points",
                      spendResourceAmount: 4,
                    },
                  ],
                },
              ],
            } as unknown as Feature,
          ],
          20,
        ),
      ],
      species: null,
    })
    const palm = actions.find((action) => action.name === "Quivering Palm")
    expect(palm?.classResourceKey).toBe("focus_points")
    expect(palm?.limitedUses?.classResourceAmount).toBe(4)
  })
})

describe("combat / utility tab classification", () => {
  it("files reactions on the Combat tab even without combat vocabulary", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail(
          [
            {
              level: 7,
              name: "Countercharm",
              description:
                "You can take a Reaction to start a performance; allies have Advantage on saves against being Frightened or Charmed.",
            } as Feature,
          ],
          20,
        ),
      ],
      species: null,
    })
    expect(actions.find((action) => action.name === "Countercharm")?.category).toBe("combat")
  })

  it("does not treat another creature taking a Reaction as the character's Reaction", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail(
          [
            {
              level: 5,
              name: "Direct the Line",
              description:
                "Once on each of your turns, you can direct your Cohort or an ally within 60 feet of yourself that can see or hear you. The chosen creature can take a Reaction to move up to its Speed or make one attack with a weapon or Unarmed Strike.",
            } as Feature,
          ],
          5,
        ),
      ],
      species: null,
    })
    const command = actions.find((action) => action.name === "Direct the Line")
    expect(command?.kinds).not.toContain("reaction")
    expect(command?.trigger).toBe("Once on each of your turns")
    expect(command?.spendsEconomy).toBe(false)
  })

  it("ignores a bare Reaction execution when only another creature spends that Reaction", () => {
    const actions = collectSheetActions({
      classDetails: [classDetail([], 5)],
      species: null,
      customAbilities: [
        {
          id: "ability-direct",
          name: "Direct the Line",
          description:
            "<p>Once on each of your turns, you can direct your Cohort or an ally. The chosen creature can take a Reaction to move or attack.</p>",
          execution: "Reaction",
          attached_to_type: "class",
          attached_to_id: "class-1",
        } as unknown as import("@/lib/types").CustomAbility,
      ],
    })
    const command = actions.find((action) => action.name === "Direct the Line")
    expect(command).toBeDefined()
    expect(command?.kinds).not.toContain("reaction")
    expect(command?.trigger).toBe("Once on each of your turns")
  })

  it("files a crit-or-drop resource restore as Combat Passive", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail(
          [
            {
              level: 7,
              name: "Valiant Surge",
              description:
                "Whenever you or your Cohort score a Critical Hit or reduce an enemy to 0 Hit Points, you regain an expended Battle Die.",
            } as Feature,
          ],
          7,
        ),
      ],
      species: null,
    })
    const surge = actions.find((action) => action.name === "Valiant Surge")
    expect(surge?.trigger).toBe("When you or an ally crit or drop a foe")
    expect(surge?.kinds).not.toContain("reaction")
    expect(surge?.spendsEconomy).toBe(false)
    expect(surge?.category).toBe("combat")
    expect(surge?.showOnCombatTab).toBe(true)
  })

  it("files Interception prose as a Combat Reaction even without modifiers", () => {
    const actions = collectSheetActions({
      classDetails: [classDetail([], 1)],
      species: null,
      feats: [
        {
          id: "feat-interception",
          name: "Interception",
          description:
            "When a creature you can see hits another creature within 5 feet of you with an attack roll, you can take a Reaction to reduce the damage dealt to the target by 1d10 plus your Proficiency Bonus. You must be holding a Shield or a Simple or Martial weapon to use this Reaction.",
          category: "Fighting Style",
          level_requirement: null,
          prerequisite: null,
          prerequisite_feat_ids: null,
          prerequisite_class_ids: null,
          prerequisite_species_ids: null,
          prerequisite_background_ids: null,
          benefits: null,
          icon: null,
          source: "Player's Handbook (2024)",
          creator_url: null,
          created_at: "",
        },
      ],
    })
    const interception = actions.find((action) => action.name === "Interception")
    expect(interception?.kinds).toContain("reaction")
    expect(interception?.category).toBe("combat")
    expect(interception?.showOnCombatTab).toBe(true)
    expect(interception?.trigger).toBeFalsy()
  })

  it("files a Bonus Action that spends a pool on the Combat tab", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail([
          {
            level: 1,
            name: "Bardic Inspiration",
            description:
              "As a Bonus Action, you can inspire another creature within 60 feet who can see or hear you.",
            limitedUses: { type: "class_resource", classResourceKey: "bardic_inspiration" },
          } as Feature,
        ]),
      ],
      species: null,
    })
    expect(actions.find((action) => action.name === "Bardic Inspiration")?.category).toBe("combat")
  })

  it("keeps a downtime Bonus Action on the Abilities tab", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail(
          [
            {
              level: 20,
              name: "Magnum Opus",
              description:
                "As a Bonus Action while crafting in your workshop, you can finish a legendary item.",
              limitedUses: { type: "fixed", fixedAmount: 1 },
            } as unknown as Feature,
          ],
          20,
        ),
      ],
      species: null,
    })
    expect(actions.find((action) => action.name === "Magnum Opus")?.category).toBe("utility")
  })

  it("files Sociable Start on Combat from first-round opening text", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail(
          [
            {
              level: 6,
              name: "Sociable Start",
              description:
                "During the first round of combat, you can take the Influence action as a Bonus Action and have Advantage on ability checks you make using that action.",
              activation: { bonusAction: true },
              sheetDisplay: {
                featuresTab: true,
                abilitiesActions: true,
                combatActions: false,
              },
            } as Feature,
          ],
          6,
        ),
      ],
      species: null,
    })
    const sociable = actions.find((action) => action.name === "Sociable Start")
    expect(sociable?.category).toBe("combat")
    expect(sociable?.showOnCombatTab).toBe(true)
    expect(sociable?.showOnAbilitiesTab).toBe(false)
    expect(sociable?.kinds).toContain("bonus")
  })

  it("files Beguiling Charm as a Combat Passive for enemy attack/save impact", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail(
          [
            {
              level: 10,
              name: "Beguiling Charm",
              description:
                "When you give a creature the Charmed condition, you can choose one of the following effects for the creature while it has the condition.\n\nBad Influence. The target subtracts your Dance Die from Intelligence, Wisdom, and Charisma saving throws it makes.\n\nFriend of My Friends. The target subtracts your Dance Die from all its attack rolls.",
              linkedModifiers: [
                {
                  instanceId: "modinst_beguiling",
                  catalogRefId: "cat_fx_modify_creature",
                  activation: {
                    effects: [
                      {
                        id: "fx_friend",
                        kind: "modify_creature",
                        rollTarget: "enemy",
                        creatureModifyMode: "roll",
                        checkCategory: "attack",
                        label: "Friend of My Friends",
                      },
                    ],
                  },
                },
                {
                  instanceId: "modinst_beguiling_menu",
                  catalogRefId: "cat_char_resource_ability_menu",
                  characteristics: [
                    {
                      id: "mod_beguiling_menu",
                      type: "resource_ability_menu",
                      resourceKey: "dance_die",
                      options: [
                        { name: "Bad Influence", description: "Subtract Dance Die from mental saves.", resourceCost: 0 },
                        {
                          name: "Friend of My Friends",
                          description: "Subtract Dance Die from attack rolls.",
                          resourceCost: 0,
                        },
                      ],
                    },
                  ],
                },
              ],
            } as Feature,
          ],
          10,
        ),
      ],
      species: null,
    })
    const charm = actions.find((action) => action.name === "Beguiling Charm")
    expect(charm).toMatchObject({
      category: "combat",
      reminderOnly: true,
      spendsEconomy: false,
      showOnCombatTab: true,
    })
    expect(charm?.menuOptions?.map((option) => option.name)).toEqual([
      "Bad Influence",
      "Friend of My Friends",
    ])
  })

  it("lets action-or-bonus powers list both economies", () => {
    expect(
      flexibleEconomyKindsFromText("You can use this as an action or a bonus action."),
    ).toEqual(["action", "bonus"])
    expect(selectableEconomyKinds(["action", "bonus"])).toEqual(["action", "bonus"])
    expect(selectableEconomyKinds(["action", "bonus"], false)).toEqual([])

    const featureActions = collectSheetActions({
      classDetails: [
        classDetail([
          {
            level: 1,
            name: "Remedy",
            description: "x",
            activation: { action: true, bonusAction: true },
          },
        ]),
      ],
      species: null,
    })
    expect(featureActions.find((action) => action.name === "Remedy")?.kinds).toEqual([
      "action",
      "bonus",
    ])

    const powerActions = collectSheetActions({
      classDetails: [classDetail([], 5)],
      species: null,
      customAbilities: [
        {
          id: "necrobiology",
          name: "Necrobiology",
          description: "<p>You can use this as an action or a bonus action.</p>",
          prerequisites: null,
          characteristics: null,
          attached_to_type: "class",
          attached_to_id: "class-1",
          uses: null,
          show_in_builder: true,
          ability_role: "psionic_power",
          casting_time: "1 action",
          range: "Self",
          duration: null,
          icon: null,
          source: "Test",
          creator_url: null,
          created_at: "",
          updated_at: "",
        },
      ],
    })
    expect(powerActions.find((action) => action.name === "Necrobiology")?.kinds).toEqual([
      "action",
      "bonus",
    ])
  })

  it("cards Martyr Sacrificial Strike as a bonus action and Skill as a passive", () => {
    const [detail] = attachClassDetails(
      [{ class_id: "cls_martyr", level: 3, order: 0 }],
      [
        {
          id: "cls_martyr",
          name: "Martyr",
          features: [
            {
              name: "Sacrifice",
              level: 1,
              description:
                "Sacrificial Strike. When you deal damage with a Melee weapon, take a Bonus Action to deal extra 10 Radiant. Sacrificial Skill. Once per turn when you fail a D20 Test, take 10 Radiant to gain +5.",
            },
          ],
        } as DndClass,
      ],
      [],
    )
    const actions = collectSheetActions({
      classDetails: [detail],
      species: null,
    })
    const strike = actions.find((action) => action.name === "Sacrificial Strike")
    expect(strike?.kinds).toEqual(["bonus"])
    expect(strike?.trigger ?? null).toBeNull()
    const skill = actions.find((action) => action.name === "Sacrificial Skill")
    expect(skill?.trigger).toBe("When you fail a roll")
    expect(skill?.spendsEconomy).toBe(false)
    expect(strike?.spendHitPoints).toBe(5)
    expect(skill?.spendHitPoints).toBe(10)
    expect(strike?.icon).toBe("bleeding-heart")
    expect(skill?.icon).toBe("bleeding-heart")
    expect(skill?.refundHitPointsOnStillFailed).toBe(true)
    expect(actions.some((action) => action.name === "Sacrifice")).toBe(false)
  })

  it("replaces Sacrificial Strike with Improved Sacrificial Strike on the combat tab", () => {
    const [detail] = attachClassDetails(
      [{ class_id: "cls_martyr", level: 11, order: 0 }],
      [
        {
          id: "cls_martyr",
          name: "Martyr",
          features: [
            {
              name: "Sacrificial Strike",
              level: 1,
              description: "Bonus Action: take 5 Radiant and deal +10 Radiant.",
            },
            {
              name: "Improved Sacrificial Strike",
              level: 11,
              description:
                "Your Sacrificial Strike improves. When you use this feature, you can choose to take 10 Radiant damage, and the target takes an extra 20 Radiant damage.",
            },
          ],
        } as DndClass,
      ],
      [],
    )
    const actions = collectSheetActions({
      classDetails: [detail],
      species: null,
    })
    expect(actions.find((action) => action.name === "Sacrificial Strike")).toBeUndefined()
    const improved = actions.find((action) => action.name === "Improved Sacrificial Strike")
    expect(improved?.kinds).toEqual(["bonus"])
    expect(improved?.spendHitPoints).toBe(10)
    expect(improved?.firstUseNoAction).toBe(false)
    expect(improved?.relatedTalentAlerts?.some((alert) => alert.name === "Improved Sacrificial Strike")).toBeFalsy()
  })

  it("unlocks first-use-no-action on Improved Sacrificial Strike at 17", () => {
    const [detail] = attachClassDetails(
      [{ class_id: "cls_martyr", level: 17, order: 0 }],
      [
        {
          id: "cls_martyr",
          name: "Martyr",
          features: [
            {
              name: "Sacrificial Strike",
              level: 1,
              description: "Bonus Action: take 5 Radiant and deal +10 Radiant.",
            },
            {
              name: "Improved Sacrificial Strike",
              level: 11,
              description:
                "Your Sacrificial Strike improves. When you use this feature, you can choose to take 10 Radiant damage, and the target takes an extra 20 Radiant damage.",
            },
          ],
        } as DndClass,
      ],
      [],
    )
    const improved = collectSheetActions({
      classDetails: [detail],
      species: null,
    }).find((action) => action.name === "Improved Sacrificial Strike")
    expect(improved?.firstUseNoAction).toBe(true)
  })

  it("files an incoming-attack feature with no action economy as a Passive reminder", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail([
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
                      checkCategory: "other",
                      incomingAttackMode: "disadvantage",
                      label: "Nimble Start: attacks vs you have Disadvantage (first round)",
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
        ]),
      ],
      species: null,
    })
    const nimble = actions.find((action) => action.name === "Nimble Start")
    expect(nimble).toMatchObject({
      trigger: "First round of combat",
      reminderOnly: true,
      activatesSheetToggle: "first_turn_of_combat",
      spendsEconomy: false,
      category: "combat",
    })
  })

  it("files a combat-flagged power_rider-only Extra Attack variant as a Passive reminder", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail(
          [
            {
              level: 5,
              name: "Extra Attack",
              description: "You can attack twice whenever you take the Attack action.",
              linkedModifiers: [
                {
                  instanceId: "modinst_extra",
                  catalogRefId: "cat_fx_extra_attack",
                  activation: {
                    effects: [{ id: "mod_extra", kind: "extra_attack", extraAttackCount: 1 }],
                  },
                },
              ],
            } as unknown as Feature,
            {
              level: 5,
              name: "Three-Target Extra Attack",
              description:
                "When you take the Attack action on your turn, you can attack three times if all of your attacks are against different targets.",
              sheetDisplay: { combatActions: true, featuresTab: true },
              linkedModifiers: [
                {
                  instanceId: "modinst_three_target",
                  catalogRefId: "cat_char_power_rider",
                  characteristics: [
                    {
                      id: "char_multi_target",
                      type: "power_rider",
                      parentPowerNames: ["Extra Attack", "Attack"],
                      alertSummary:
                        "Extra attacks only if each attack is against a different target (see feature name for count).",
                    },
                  ],
                },
              ],
            } as unknown as Feature,
          ],
          6,
        ),
      ],
      species: null,
    })
    const threeTarget = actions.find((action) => action.name === "Three-Target Extra Attack")
    expect(threeTarget).toMatchObject({
      reminderOnly: true,
      trigger: "When you take the Attack action",
      category: "combat",
      showOnCombatTab: true,
      spendsEconomy: false,
    })
  })

  it("keeps only the highest multi-target Extra Attack Passive on the sheet", () => {
    const multiTargetRider = (name: string, replaces?: string[]) =>
      ({
        level: name.startsWith("Three") ? 5 : name.startsWith("Four") ? 11 : 17,
        name,
        description: `Attack ${name.split("-")[0].toLowerCase()} times vs different targets.`,
        sheetDisplay: { combatActions: true, featuresTab: true },
        linkedModifiers: [
          {
            instanceId: `modinst_${name}`,
            catalogRefId: "cat_char_power_rider",
            characteristics: [
              {
                id: `char_${name}`,
                type: "power_rider",
                parentPowerNames: ["Extra Attack", "Attack"],
                alertSummary: "Extra attacks only if each attack is against a different target.",
              },
              ...(replaces?.length
                ? [
                    {
                      id: `char_replace_${name}`,
                      type: "replace_feature" as const,
                      replacedFeatureNames: replaces,
                    },
                  ]
                : []),
            ],
          },
        ],
      }) as unknown as Feature

    const actions = collectSheetActions({
      classDetails: [
        classDetail(
          [
            multiTargetRider("Three-Target Extra Attack"),
            multiTargetRider("Four-Target Extra Attack", ["Three-Target Extra Attack"]),
            multiTargetRider("Five-Target Extra Attack", [
              "Four-Target Extra Attack",
              "Three-Target Extra Attack",
            ]),
          ],
          17,
        ),
      ],
      species: null,
    })
    const names = actions.map((action) => action.name)
    expect(names).toContain("Five-Target Extra Attack")
    expect(names).not.toContain("Four-Target Extra Attack")
    expect(names).not.toContain("Three-Target Extra Attack")
  })

  it("splits a resource-die menu off a bonus-action parent onto Passive", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail(
          [
            {
              level: 2,
              name: "Dance",
              description: "Bonus Action Dance. Graceful Dodge: add your Dance Die to AC.",
              activation: { bonusAction: true },
              sheetDisplay: { combatActions: true },
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
          3,
        ),
      ],
      species: null,
    })
    const dance = actions.find((action) => action.name === "Dance")
    const dodge = actions.find((action) => action.name === "Graceful Dodge")
    expect(dance?.kinds).toEqual(["bonus"])
    expect(dance?.menuOptions ?? []).toEqual([])
    expect(dodge).toMatchObject({
      trigger: "While Dancing",
      spendsEconomy: false,
      requiresSheetToggle: "while_dancing",
      classResourceKey: null,
    })
    expect(dodge?.useBonuses?.[0]?.bonusConfig).toMatchObject({
      mode: "die",
      classResourceKey: "dance_die",
    })
    expect(dance?.healEffects ?? []).toEqual([])
  })

  it("attaches known Dance Styles as activation picks on Dance", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail(
          [
            {
              level: 2,
              name: "Dance",
              description:
                "As a Bonus Action, expend a Dance to begin dancing. When you begin your Dance, choose a Dance Style. Some styles force a creature you can see to make a saving throw.",
              activation: { bonusAction: true },
              sheetDisplay: { combatActions: true },
              limitedUses: {
                type: "class_resource",
                classResourceKey: "dances",
                classResourceAmount: 1,
              },
            } as Feature,
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
          ],
          3,
        ),
      ],
      species: null,
      featureChoicePicks: { "class-1:L2:Dance Styles": ["Shift"] },
      customAbilities: [
        {
          name: "Shift",
          ability_role: "upgrade",
          description: "While Dancing, teleport 10 feet after an attack.",
        } as never,
      ],
    })
    const dance = actions.find((action) => action.name === "Dance")
    expect(dance?.healEffects ?? []).toEqual([])
    expect(dance?.activationPicks).toMatchObject({
      title: "Choose a Dance Style",
      chooseCount: 1,
    })
    expect(dance?.activationPicks?.options.map((option) => option.name)).toEqual([
      "Agile Movement",
      "Elegant Form",
      "Retaliatory Swipe",
      "Spinning Shot",
      "Shift",
    ])
    expect(dance?.activationPicks?.options.find((option) => option.name === "Shift")).toEqual({
      name: "Shift",
      description: "While Dancing, teleport 10 feet after an attack.",
      sheetToggleId: "dance_style_shift",
    })
    expect(
      dance?.activationPicks?.options.find((option) => option.name === "Agile Movement"),
    ).toMatchObject({
      name: "Agile Movement",
      sheetToggleId: "dance_style_agile_movement",
    })
  })

  it("lists default Dance Styles plus a subclass [Dance Style] even without builder picks", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail(
          [
            {
              level: 2,
              name: "Dance",
              description: "As a Bonus Action, expend a Dance to begin dancing.",
              activation: { bonusAction: true },
              sheetDisplay: { combatActions: true },
              limitedUses: {
                type: "class_resource",
                classResourceKey: "dances",
                classResourceAmount: 1,
              },
            } as Feature,
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
          ],
          3,
          {
            subclassFeatures: [
              {
                level: 3,
                name: "Enthralling Movement [Dance Style]",
                description: "Creatures that can see you may be charmed while you Dance.",
              } as Feature,
            ],
          },
        ),
      ],
      species: null,
      featureChoicePicks: {},
    })
    const dance = actions.find((action) => action.name === "Dance")
    expect(dance?.activationPicks?.options.map((option) => option.name)).toEqual([
      "Agile Movement",
      "Elegant Form",
      "Retaliatory Swipe",
      "Spinning Shot",
      "Enthralling Movement",
    ])
    expect(
      dance?.activationPicks?.options.find((option) => option.name === "Enthralling Movement"),
    ).toMatchObject({
      sheetToggleId: "dance_style_enthralling_movement",
    })
  })

  it("notes Heartbreaker on the Enthralling Movement Dance Style pick", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail(
          [
            {
              level: 2,
              name: "Dance",
              description: "As a Bonus Action, expend a Dance to begin dancing.",
              activation: { bonusAction: true },
              sheetDisplay: { combatActions: true },
              limitedUses: {
                type: "class_resource",
                classResourceKey: "dances",
                classResourceAmount: 1,
              },
            } as Feature,
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
          ],
          14,
          {
            subclassFeatures: [
              {
                level: 3,
                name: "Enthralling Movement [Dance Style]",
                description: "Creatures that can see you may be charmed while you Dance.",
              } as Feature,
              {
                level: 14,
                name: "Heartbreaker",
                description:
                  "Whenever a creature succeeds or fails its saving throw against your Enthralling Movement, you can deal Psychic damage equal to two rolls of your Dance Die.",
                linkedModifiers: [
                  {
                    instanceId: "modinst_heartbreaker",
                    catalogRefId: "cat_char_power_rider",
                    characteristics: [
                      {
                        id: "char_heartbreaker",
                        type: "power_rider",
                        parentPowerNames: ["Dance", "Enthralling Movement"],
                        parentMenuOptionNames: ["Enthralling Movement"],
                        alertSummary:
                          "On Enthralling Movement save (success or fail): deal Psychic damage equal to two Dance Dice.",
                      },
                    ],
                  },
                ],
              } as Feature,
            ],
          },
        ),
      ],
      species: null,
      featureChoicePicks: {},
    })
    const dance = actions.find((action) => action.name === "Dance")
    expect(dance?.relatedTalentAlerts?.some((alert) => alert.name === "Heartbreaker")).toBe(true)
    const enthralling = dance?.activationPicks?.options.find(
      (option) => option.name === "Enthralling Movement",
    )
    expect(enthralling?.description).toMatch(/Heartbreaker/i)
    expect(enthralling?.description).toMatch(/two Dance Dice/i)
  })

  it("omits a Dance Styles pick that only matches weapon mastery Shift", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail(
          [
            {
              level: 2,
              name: "Dance",
              description: "As a Bonus Action, expend a Dance to begin dancing.",
              activation: { bonusAction: true },
              sheetDisplay: { combatActions: true },
              limitedUses: {
                type: "class_resource",
                classResourceKey: "dances",
                classResourceAmount: 1,
              },
            } as Feature,
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
          ],
          3,
        ),
      ],
      species: null,
      featureChoicePicks: { "class-1:L2:Dance Styles": ["Shift"] },
      customAbilities: [
        {
          name: "Shift",
          ability_role: "weapon_mastery",
          description:
            "If you hit a creature with this weapon, you can immediately move 10 feet without provoking Opportunity Attacks.",
        } as never,
      ],
    })
    const dance = actions.find((action) => action.name === "Dance")
    expect(dance?.activationPicks?.options.map((option) => option.name)).toEqual([
      "Agile Movement",
      "Elegant Form",
      "Retaliatory Swipe",
      "Spinning Shot",
    ])
    expect(dance?.activationPicks?.options.find((option) => option.name === "Shift")).toBeUndefined()
  })

  it("unlocks default Dance Style sheet options without imported custom abilities", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail(
          [
            {
              level: 2,
              name: "Dance",
              description: "As a Bonus Action, expend a Dance to begin dancing.",
              activation: { bonusAction: true },
              sheetDisplay: { combatActions: true },
              limitedUses: {
                type: "class_resource",
                classResourceKey: "dances",
                classResourceAmount: 1,
              },
            } as Feature,
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
          ],
          3,
        ),
      ],
      species: null,
    })
    expect(actions.find((action) => action.name === "Graceful Dodge")).toMatchObject({
      requiresSheetToggle: "while_dancing",
      trigger: "While Dancing",
    })
    expect(actions.find((action) => action.name === "Elegant Form")).toMatchObject({
      requiresSheetToggle: "dance_style_elegant_form",
    })
    expect(actions.find((action) => action.name === "Spinning Shot")).toMatchObject({
      requiresSheetToggle: "dance_style_spinning_shot",
    })
    expect(actions.find((action) => action.name === "Retaliatory Swipe")).toMatchObject({
      requiresSheetToggle: "dance_style_retaliatory_swipe",
      reminderOnly: true,
    })
  })

  it("copies Dance duration onto the sheet action from attachClassDetails", () => {
    const [detail] = attachClassDetails(
      [{ class_id: "cls_dancer", level: 3, order: 0 }],
      [
        {
          id: "cls_dancer",
          name: "Dancer",
          features: [
            {
              name: "Dance",
              level: 2,
              description: "Bonus Action Dance.",
            },
          ],
        } as DndClass,
      ],
      [],
    )
    const actions = collectSheetActions({
      classDetails: [detail],
      species: null,
    })
    expect(actions.find((action) => action.name === "Dance")?.duration).toBe("1 minute")
  })

  it("keeps a resource-spend menu on the parent when it has no action economy of its own", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail([
          {
            level: 3,
            name: "Battle Dice",
            description: "Expend one battle die.",
            sheetDisplay: { combatActions: true, abilitiesActions: true },
            limitedUses: {
              type: "class_resource",
              classResourceKey: "battle_dice",
              classResourceAmount: 1,
            },
            linkedModifiers: [
              {
                instanceId: "modinst_battle",
                catalogRefId: "cat_char_resource_ability_menu",
                characteristics: [
                  {
                    id: "mod_battle",
                    type: "resource_ability_menu",
                    resourceKey: "battle_dice",
                    options: [
                      {
                        name: "Precision Attack",
                        description: "Add the die to an attack roll.",
                        resourceCost: 1,
                        bonusConfig: {
                          mode: "die",
                          dieScaling: "class_resource",
                          classResourceKey: "battle_dice",
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          } as unknown as Feature,
        ]),
      ],
      species: null,
    })
    const parent = actions.find((action) => action.name === "Battle Dice")
    expect(parent?.menuOptions?.map((option) => option.name)).toEqual(["Precision Attack"])
    expect(actions.find((action) => action.name === "Precision Attack")).toBeUndefined()
    expect(parent?.menuOptions?.[0]?.bonusConfig).toMatchObject({
      mode: "die",
      classResourceKey: "battle_dice",
    })
  })

  it("surfaces an on-initiative feature as a triggered combat card without a spend", () => {
    const actions = collectSheetActions({
      classDetails: [
        classDetail(
          [
            {
              name: "Thrall Rush",
              level: 10,
              description: "When you roll Initiative, your thralls move.",
              activation: { onInitiative: true },
              sheetDisplay: { combatActions: true, featuresTab: true },
            },
          ],
          10,
        ),
      ],
      species: null,
    })
    expect(actions.find((action) => action.name === "Thrall Rush")).toMatchObject({
      trigger: "When you roll Initiative",
      spendsEconomy: false,
      showOnCombatTab: true,
    })
  })
})
