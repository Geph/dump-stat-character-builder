import { describe, expect, it } from "vitest"
import { collectSaveFeatureBadges } from "@/lib/character/save-feature-badges"
import { blockedWhenConditionLimitation } from "@/lib/compendium/modifier-limitations"
import { buildEvasionModifier } from "@/lib/compendium/shared-feature-modifier-builders"
import type { Feature } from "@/lib/types"

describe("collectSaveFeatureBadges", () => {
  it("places Evasion on Dexterity saves", () => {
    const features: Feature[] = [
      {
        level: 7,
        name: "Evasion",
        description:
          "When you're subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage if you succeed on the saving throw and only half damage if you fail.",
        linkedModifiers: [buildEvasionModifier()],
      } as Feature,
    ]
    const badges = collectSaveFeatureBadges(features)
    expect(badges.dexterity.map((b) => b.label)).toEqual(["Evasion"])
    expect(badges.strength).toEqual([])
    expect(badges.dexterity[0]?.description).toMatch(/Dexterity saving throw/i)
  })

  it("places Danger Sense on Dexterity and respects Incapacitated", () => {
    const features: Feature[] = [
      {
        level: 2,
        name: "Danger Sense",
        description: "You have Advantage on Dexterity saving throws unless you have the Incapacitated condition.",
        linkedModifiers: [
          {
            instanceId: "modinst_danger_sense",
            catalogRefId: "cat_fx_check_roll_modifier",
            activation: {
              effects: [
                {
                  id: "mod_danger_sense",
                  kind: "check_roll_modifier",
                  checkCategory: "save",
                  checkAbility: "Dexterity",
                  checkRollMode: "advantage",
                  limitations: [blockedWhenConditionLimitation("Incapacitated")],
                },
              ],
            },
          },
        ],
      } as Feature,
    ]
    expect(collectSaveFeatureBadges(features).dexterity.map((b) => b.label)).toEqual(["Danger Sense"])
    expect(
      collectSaveFeatureBadges(features, { activeConditions: ["Incapacitated"] }).dexterity,
    ).toEqual([])
  })

  it("places all-save advantages such as Spell Resistance on every save", () => {
    const features: Feature[] = [
      {
        level: 10,
        name: "Spell Resistance",
        description: "You have Advantage on saving throws against spells.",
        linkedModifiers: [
          {
            instanceId: "modinst_spell_resistance",
            catalogRefId: "cat_fx_check_roll_modifier",
            activation: {
              effects: [
                {
                  id: "mod_spell_resistance",
                  kind: "check_roll_modifier",
                  checkCategory: "save",
                  checkRollMode: "advantage",
                  checkConditionTypes: ["spell"],
                },
              ],
            },
          },
        ],
      } as Feature,
    ]
    const badges = collectSaveFeatureBadges(features)
    for (const ability of ["strength", "dexterity", "wisdom", "charisma"] as const) {
      expect(badges[ability].map((b) => b.label)).toEqual(["Spell Resistance"])
    }
  })

  it("splits multi-ability species traits across the matching saves", () => {
    const features: Feature[] = [
      {
        name: "Gnomish Cunning",
        description: "You have Advantage on Intelligence, Wisdom, and Charisma saving throws.",
        linkedModifiers: [
          {
            instanceId: "modinst_gnomish",
            catalogRefId: "cat_fx_check_roll_modifier",
            activation: {
              effects: [
                {
                  id: "mod_g_int",
                  kind: "check_roll_modifier",
                  checkCategory: "save",
                  checkAbility: "Intelligence",
                  checkRollMode: "advantage",
                },
                {
                  id: "mod_g_wis",
                  kind: "check_roll_modifier",
                  checkCategory: "save",
                  checkAbility: "Wisdom",
                  checkRollMode: "advantage",
                },
                {
                  id: "mod_g_cha",
                  kind: "check_roll_modifier",
                  checkCategory: "save",
                  checkAbility: "Charisma",
                  checkRollMode: "advantage",
                },
              ],
            },
          },
        ],
      } as Feature,
    ]
    const badges = collectSaveFeatureBadges(features)
    expect(badges.intelligence.map((b) => b.label)).toEqual(["Gnomish Cunning"])
    expect(badges.wisdom.map((b) => b.label)).toEqual(["Gnomish Cunning"])
    expect(badges.charisma.map((b) => b.label)).toEqual(["Gnomish Cunning"])
    expect(badges.dexterity).toEqual([])
  })
})
