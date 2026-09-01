import { describe, expect, it } from "vitest"
import { collectSaveFeatureBadges } from "@/lib/character/save-feature-badges"
import { blockedWhenConditionLimitation } from "@/lib/compendium/modifier-limitations"
import type { Feature } from "@/lib/types"

describe("collectSaveFeatureBadges", () => {
  it("places Evasion on Dexterity saves", () => {
    const features: Feature[] = [
      {
        level: 7,
        name: "Evasion",
        description:
          "When you're subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage if you succeed on the saving throw and only half damage if you fail.",
        linkedModifiers: [
          {
            instanceId: "modinst_evasion",
            catalogRefId: "cat_fx_damage_reduction",
            activation: {
              effects: [
                {
                  id: "mod_evasion",
                  kind: "damage_reduction",
                  mitigation: "reduction",
                  defensiveSaveScope: true,
                  checkCategory: "save",
                  checkAbility: "Dexterity",
                  defensiveSaveSuccess: "none",
                  limitations: [blockedWhenConditionLimitation("Incapacitated")],
                },
              ],
            },
          },
        ],
      } as Feature,
    ]
    const badges = collectSaveFeatureBadges(features)
    expect(badges.byAbility.dexterity.map((b) => b.label)).toEqual(["Evasion"])
    expect(badges.byAbility.strength).toEqual([])
    expect(badges.allSaves).toEqual([])
    expect(badges.byAbility.dexterity[0]?.description).toMatch(/Dexterity saving throw/i)
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
    expect(collectSaveFeatureBadges(features).byAbility.dexterity.map((b) => b.label)).toEqual(["Danger Sense"])
    expect(
      collectSaveFeatureBadges(features, { activeConditions: ["Incapacitated"] }).byAbility.dexterity,
    ).toEqual([])
  })

  it("places all-save advantages such as Spell Resistance on the section title, not each save", () => {
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
    expect(badges.allSaves.map((b) => b.label)).toEqual(["Spell Resistance"])
    expect(badges.allSaves[0]?.ability).toBe("all")
    for (const ability of ["strength", "dexterity", "wisdom", "charisma"] as const) {
      expect(badges.byAbility[ability]).toEqual([])
    }
  })

  it("places Fey Ancestry on the section title instead of repeating it on every save", () => {
    const features: Feature[] = [
      {
        name: "Fey Ancestry",
        description: "You have Advantage on saving throws to avoid or end the Charmed condition.",
        linkedModifiers: [
          {
            instanceId: "modinst_fey_ancestry_charmed",
            catalogRefId: "cat_fx_check_roll_modifier",
            activation: {
              effects: [
                {
                  id: "mod_fey_ancestry_charmed",
                  kind: "check_roll_modifier",
                  checkCategory: "save",
                  checkAbility: null,
                  checkRollMode: "advantage",
                  checkConditionTypes: ["Charmed"],
                },
              ],
            },
          },
        ],
      } as Feature,
    ]
    const badges = collectSaveFeatureBadges(features)
    expect(badges.allSaves.map((b) => b.label)).toEqual(["Fey Ancestry"])
    expect(badges.byAbility.wisdom).toEqual([])
    expect(badges.byAbility.charisma).toEqual([])
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
    expect(badges.byAbility.intelligence.map((b) => b.label)).toEqual(["Gnomish Cunning"])
    expect(badges.byAbility.wisdom.map((b) => b.label)).toEqual(["Gnomish Cunning"])
    expect(badges.byAbility.charisma.map((b) => b.label)).toEqual(["Gnomish Cunning"])
    expect(badges.byAbility.dexterity).toEqual([])
    expect(badges.allSaves).toEqual([])
  })
})
