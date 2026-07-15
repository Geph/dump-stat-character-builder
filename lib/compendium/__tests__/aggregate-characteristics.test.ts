import { describe, expect, it } from "vitest"
import {
  aggregateCharacteristics,
  computeInitiative,
  normalizeCharacteristics,
} from "@/lib/compendium/characteristic-modifiers"

describe("aggregateCharacteristics", () => {
  it("handles legacy import detector shapes that used values instead of typed fields", () => {
    const mods = normalizeCharacteristics(
      [
        {
          id: "mod_res",
          type: "damage_resistance",
          values: ["Fire", "Cold"],
        },
        {
          id: "mod_immune",
          type: "condition_immunity",
          values: ["Frightened"],
        },
        {
          id: "mod_saves",
          type: "saving_throws",
          values: ["Wisdom"],
        },
      ],
      null,
    )

    const aggregated = aggregateCharacteristics(mods)
    expect(aggregated.resistances).toEqual(["Fire", "Cold"])
    expect(aggregated.conditionImmunities).toEqual(["Frightened"])
    expect(aggregated.savingThrows).toEqual(["Wisdom"])
  })

  it("aggregates climb/swim speeds equal to walk", () => {
    const aggregated = aggregateCharacteristics([
      {
        id: "mod_climb",
        type: "speed",
        speedType: "climb",
        mode: "equal_to_walk",
        value: 0,
      },
      {
        id: "mod_swim",
        type: "speed",
        speedType: "swim",
        mode: "equal_to_walk",
        value: 0,
      },
    ])
    expect(aggregated.speedEqualToWalk.sort()).toEqual(["climb", "swim"])
  })

  it("adds (rather than replaces) initiative with add_ability_modifier (Ranger's Dread Ambusher)", () => {
    const aggregated = aggregateCharacteristics([
      {
        id: "mod_init",
        type: "initiative",
        mode: "add_ability_modifier",
        ability: "WIS",
      },
    ])
    expect(aggregated.initiativeAdditionalAbilities).toEqual(["WIS"])
    expect(aggregated.initiativeAbility).toBeNull()

    const dexMod = 1
    const abilityMods = {
      strength: 0,
      dexterity: 1,
      constitution: 0,
      intelligence: 0,
      wisdom: 3,
      charisma: 0,
    }
    const initiative = computeInitiative(dexMod, aggregated, abilityMods, 2)
    // DEX (1) + WIS (3), not WIS alone — this is additive, unlike "ability_modifier" mode.
    expect(initiative).toBe(4)
  })

  it("still replaces the governing ability with plain ability_modifier mode", () => {
    const aggregated = aggregateCharacteristics([
      {
        id: "mod_init",
        type: "initiative",
        mode: "ability_modifier",
        ability: "INT",
        bonus: 0,
      },
    ])
    expect(aggregated.initiativeAbility).toBe("INT")

    const abilityMods = {
      strength: 0,
      dexterity: 1,
      constitution: 0,
      intelligence: 5,
      wisdom: 3,
      charisma: 0,
    }
    const initiative = computeInitiative(1, aggregated, abilityMods, 2)
    expect(initiative).toBe(5)
  })
})
