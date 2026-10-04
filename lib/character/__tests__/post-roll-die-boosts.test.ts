import { describe, expect, it } from "vitest"
import { collectPostRollDieBoosts, itemBoostsOwnChecks } from "@/lib/character/post-roll-die-boosts"
import { collectSheetActions } from "@/lib/character/sheet-actions"
import type { FailedRollTriggerCharacteristic } from "@/lib/compendium/characteristic-modifiers"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { CustomAbility } from "@/lib/types"

function trigger(partial: Partial<FailedRollTriggerCharacteristic>): LinkedModifierInstance[] {
  return [
    {
      instanceId: "modinst_trigger",
      catalogRefId: "cat_char_failed_roll_trigger",
      characteristics: [
        {
          id: "mod_trigger",
          type: "failed_roll_trigger",
          triggerOn: "fail",
          rollKind: "skill",
          targetScope: "self",
          spendResourceKey: "battle_dice",
          spendResourceAmount: 1,
          effect: {
            catalogRefId: "cat_fx_check_roll_modifier",
            activation: {
              effects: [
                {
                  id: "mod_die",
                  kind: "check_roll_modifier",
                  checkRollMode: "bonus",
                  checkCategory: "skill",
                  bonusConfig: { mode: "die", dieScaling: "class_resource", classResourceKey: "battle_dice" },
                },
              ],
            },
          },
          ...partial,
        } as FailedRollTriggerCharacteristic,
      ],
    },
  ]
}

const dieSides = { classResourceDieSides: { battle_dice: 8 } }

describe("collectPostRollDieBoosts", () => {
  const knack = { name: "Knack", linkedModifiers: trigger({ requiresProficiency: true }) }

  it("offers Knack on proficient skill checks only", () => {
    const athletics = { kind: "skill" as const, skillName: "Athletics", ability: "strength" as const }
    expect(collectPostRollDieBoosts([knack], athletics, { ...dieSides, skillProficient: true })).toEqual([
      expect.objectContaining({ sourceName: "Knack", resourceKey: "battle_dice", dieSides: 8, reroll: false }),
    ])
    expect(collectPostRollDieBoosts([knack], athletics, { ...dieSides, skillProficient: false })).toEqual([])
    expect(
      collectPostRollDieBoosts([knack], { kind: "ability", ability: "strength" }, dieSides),
    ).toEqual([])
    expect(collectPostRollDieBoosts([knack], { kind: "save", ability: "strength" }, dieSides)).toEqual([])
  })

  it("treats skill checks as ability checks and honors the ability filter", () => {
    const insight = { name: "Insight", linkedModifiers: trigger({ rollKind: "ability", ability: "intelligence" }) }
    expect(
      collectPostRollDieBoosts([insight], { kind: "skill", skillName: "Arcana", ability: "intelligence" }, dieSides),
    ).toHaveLength(1)
    expect(
      collectPostRollDieBoosts([insight], { kind: "skill", skillName: "Insight", ability: "wisdom" }, dieSides),
    ).toEqual([])
  })

  it("rerolls for Tenacity-style saves and skips ally-only triggers", () => {
    const tenacity = { name: "Tenacity", linkedModifiers: trigger({ rollKind: "save", rerollRoll: true }) }
    const ally = { name: "Shout", linkedModifiers: trigger({ rollKind: "save", targetScope: "allied_creature" }) }
    const boosts = collectPostRollDieBoosts([tenacity, ally], { kind: "save", ability: "wisdom" }, dieSides)
    expect(boosts.map((boost) => [boost.sourceName, boost.reroll])).toEqual([["Tenacity", true]])
  })

  it("needs a known die size", () => {
    expect(
      collectPostRollDieBoosts([knack], { kind: "skill", skillName: "Stealth" }, { skillProficient: true }),
    ).toEqual([])
  })
})

describe("check-boost placement", () => {
  it("flags own-check triggers but not save or attack triggers", () => {
    expect(itemBoostsOwnChecks(trigger({}))).toBe(true)
    expect(itemBoostsOwnChecks(trigger({ rollKind: "save" }))).toBe(false)
    expect(itemBoostsOwnChecks(trigger({ targetScope: "allied_creature" }))).toBe(false)
  })

  it("files a Battle Die check maneuver on both Combat and Abilities", () => {
    const knack: CustomAbility = {
      id: "knack",
      name: "Knack",
      description:
        "When you fail a check with a skill you are proficient in, you can expend one Battle Die to add it to the roll.",
      prerequisites: null,
      characteristics: null,
      attached_to_type: "class",
      attached_to_id: null,
      uses: null,
      show_in_builder: true,
      icon: null,
      source: "Vagabond",
      creator_url: null,
      created_at: "",
      updated_at: "",
      ability_role: "knack",
      linked_modifiers: trigger({ requiresProficiency: true }),
    }
    const card = collectSheetActions({ classDetails: [], species: null, customAbilities: [knack] }).find(
      (action) => action.name === "Knack",
    )
    expect(card).toMatchObject({ showOnCombatTab: true, showOnAbilitiesTab: true })
  })
})
