import { describe, expect, it } from "vitest"
import {
  createCharacteristicModifier,
  normalizeCharacteristics,
} from "@/lib/compendium/characteristic-modifiers"
import {
  featureHasModifierPreset,
  enrichClassFeatureWithModifierPresets,
} from "@/lib/compendium/enrich-srd-class-features"
import { enrichCustomSpeciesRow, speciesHasTraitPresetRegistry } from "@/lib/compendium/enrich-custom-species"
import { PHB_SOURCE } from "@/lib/compendium/compendium-source"
import type { Feature, Trait } from "@/lib/types"

describe("Tier 1 common modifier types", () => {
  it("normalizes d20_test_reaction defaults", () => {
    const mod = createCharacteristicModifier("d20_test_reaction")
    const [normalized] = normalizeCharacteristics([mod], null)
    expect(normalized.type).toBe("d20_test_reaction")
    if (normalized.type !== "d20_test_reaction") return
    expect(normalized.modifierMode).toBe("add")
    expect(normalized.useReaction).toBe(false)
  })

  it("normalizes damage_halving_reaction with crit cancel", () => {
    const mod = createCharacteristicModifier("damage_halving_reaction")
    const [normalized] = normalizeCharacteristics(
      [{ ...mod, cancelCritRiders: true }],
      null,
    )
    expect(normalized.type).toBe("damage_halving_reaction")
    if (normalized.type !== "damage_halving_reaction") return
    expect(normalized.cancelCritRiders).toBe(true)
    expect(normalized.useReaction).toBe(true)
  })

  it("normalizes healing_dice_pool with CHA cap", () => {
    const mod = createCharacteristicModifier("healing_dice_pool")
    const [normalized] = normalizeCharacteristics(
      [
        {
          ...mod,
          dieType: "d6",
          poolSize: 6,
          maxDicePerUse: { type: "ability_modifier", ability: "charisma" },
        },
      ],
      null,
    )
    expect(normalized.type).toBe("healing_dice_pool")
    if (normalized.type !== "healing_dice_pool") return
    expect(normalized.poolSize).toBe(6)
    expect(normalized.maxDicePerUse?.ability).toBe("charisma")
  })

  it("extends failed_roll_trigger with success trigger for Cutting Words", () => {
    const mod = createCharacteristicModifier("failed_roll_trigger")
    const [normalized] = normalizeCharacteristics(
      [{ ...mod, triggerOn: "success", useReaction: true, rangeFeet: 60 }],
      null,
    )
    expect(normalized.type).toBe("failed_roll_trigger")
    if (normalized.type !== "failed_roll_trigger") return
    expect(normalized.triggerOn).toBe("success")
    expect(normalized.rangeFeet).toBe(60)
  })

  it("extends spell_healing_modifier with maximizeOnlyAtZeroHp", () => {
    const mod = createCharacteristicModifier("spell_healing_modifier")
    const [normalized] = normalizeCharacteristics(
      [{ ...mod, maximizeOnlyAtZeroHp: true }],
      null,
    )
    expect(normalized.type).toBe("spell_healing_modifier")
    if (normalized.type !== "spell_healing_modifier") return
    expect(normalized.maximizeOnlyAtZeroHp).toBe(true)
  })

  it("normalizes unarmed strike damage type and ability", () => {
    const mod = createCharacteristicModifier("unarmed_strike_damage")
    const [normalized] = normalizeCharacteristics(
      [{ ...mod, damageType: "Piercing", ability: "strength" }],
      null,
    )
    expect(normalized.type).toBe("unarmed_strike_damage")
    if (normalized.type !== "unarmed_strike_damage") return
    expect(normalized.damageType).toBe("Piercing")
    expect(normalized.ability).toBe("strength")
  })

  it("normalizes damage resistance with player choice pool", () => {
    const mod = createCharacteristicModifier("damage_resistance")
    const [normalized] = normalizeCharacteristics(
      [
        {
          ...mod,
          damageTypes: [],
          choiceCount: 1,
          choiceOptions: ["Acid", "Fire"],
        },
      ],
      null,
    )
    expect(normalized.type).toBe("damage_resistance")
    if (normalized.type !== "damage_resistance") return
    expect(normalized.choiceCount).toBe(1)
    expect(normalized.choiceOptions).toEqual(["Acid", "Fire"])
  })

  it("normalizes movement spider climb with min level", () => {
    const mod = createCharacteristicModifier("movement_effects")
    const [normalized] = normalizeCharacteristics(
      [{ ...mod, spiderClimb: true, spiderClimbMinLevel: 3 }],
      null,
    )
    expect(normalized.type).toBe("movement_effects")
    if (normalized.type !== "movement_effects") return
    expect(normalized.spiderClimb).toBe(true)
    expect(normalized.spiderClimbMinLevel).toBe(3)
  })

  it("normalizes on_hit_trigger creature type filters", () => {
    const mod = createCharacteristicModifier("on_hit_trigger")
    const [normalized] = normalizeCharacteristics(
      [{ ...mod, excludeCreatureTypes: ["Construct", "Undead"] }],
      null,
    )
    expect(normalized.type).toBe("on_hit_trigger")
    if (normalized.type !== "on_hit_trigger") return
    expect(normalized.excludeCreatureTypes).toEqual(["Construct", "Undead"])
  })

  it("normalizes telepathy with miles and token requirement", () => {
    const mod = createCharacteristicModifier("telepathy")
    const [normalized] = normalizeCharacteristics(
      [{ ...mod, rangeMiles: 1, maxMessageWords: 25, requiresActiveToken: true }],
      null,
    )
    expect(normalized.type).toBe("telepathy")
    if (normalized.type !== "telepathy") return
    expect(normalized.rangeMiles).toBe(1)
    expect(normalized.maxMessageWords).toBe(25)
    expect(normalized.requiresActiveToken).toBe(true)
  })

  it("normalizes healing dice pool with proficiency dice per use", () => {
    const mod = createCharacteristicModifier("healing_dice_pool")
    const [normalized] = normalizeCharacteristics(
      [{ ...mod, dieType: "d4", dicePerUseSource: "proficiency", activation: "magic_action" }],
      null,
    )
    expect(normalized.type).toBe("healing_dice_pool")
    if (normalized.type !== "healing_dice_pool") return
    expect(normalized.dicePerUseSource).toBe("proficiency")
    expect(normalized.activation).toBe("magic_action")
  })

  it("normalizes condition immunity with exhaustion source exclusions", () => {
    const mod = createCharacteristicModifier("condition_immunity")
    const [normalized] = normalizeCharacteristics(
      [
        {
          ...mod,
          conditions: ["Exhaustion"],
          exhaustionSourceExclusions: ["dehydration", "malnutrition"],
        },
      ],
      null,
    )
    expect(normalized.type).toBe("condition_immunity")
    if (normalized.type !== "condition_immunity") return
    expect(normalized.exhaustionSourceExclusions).toEqual(["dehydration", "malnutrition"])
  })

  it("normalizes magical sleep immunity with no sleep required", () => {
    const mod = createCharacteristicModifier("magical_sleep_immunity")
    const [normalized] = normalizeCharacteristics([{ ...mod, noSleepRequired: true }], null)
    expect(normalized.type).toBe("magical_sleep_immunity")
    if (normalized.type !== "magical_sleep_immunity") return
    expect(normalized.noSleepRequired).toBe(true)
  })
})

describe("custom species modifier wiring", () => {
  it("wires Aasimar presets by species name (no bundled stat text)", () => {
    const enriched = enrichCustomSpeciesRow({
      name: "Aasimar",
      source: PHB_SOURCE,
      traits: [
        { name: "Celestial Resistance", description: "" },
        { name: "Healing Hands", description: "" },
        {
          name: "Celestial Revelation",
          level: 3,
          description: "",
          isChoice: true,
          choices: {
            category: "Celestial Revelation",
            count: 1,
            options: [{ name: "Heavenly Wings", description: "" }],
          },
        },
      ],
    })

    const traits = enriched.traits as Array<{
      name: string
      linkedModifiers?: { catalogRefId: string }[]
      choices?: { options?: Array<{ name: string; linkedModifiers?: { catalogRefId: string }[] }> }
    }>
    const resistance = traits.find((trait) => trait.name === "Celestial Resistance")
    expect(
      resistance?.linkedModifiers?.some((m) => m.catalogRefId === "cat_char_damage_resistance"),
    ).toBe(true)

    const healing = traits.find((trait) => trait.name === "Healing Hands")
    expect(
      healing?.linkedModifiers?.some((m) => m.catalogRefId === "cat_char_healing_dice_pool"),
    ).toBe(true)

    const revelation = traits.find((trait) => trait.name === "Celestial Revelation")
    const wings = revelation?.choices?.options?.find(
      (option: { name: string; linkedModifiers?: { catalogRefId: string }[] }) =>
        option.name === "Heavenly Wings",
    )
    expect(wings?.linkedModifiers?.some((m: { catalogRefId: string }) => m.catalogRefId === "cat_char_speed")).toBe(true)
    expect(enriched.size_options).toEqual(["Small", "Medium"])
  })

  it("wires Changeling and Warforged presets without SRD seed", () => {
    expect(speciesHasTraitPresetRegistry("Changeling")).toBe(true)
    expect(speciesHasTraitPresetRegistry("Warforged")).toBe(true)

    const changeling = enrichCustomSpeciesRow({
      name: "Changeling",
      source: "Eberron",
      traits: [
        { name: "Changeling Instincts", description: "" },
        { name: "Shape-Shifter", description: "" },
      ],
    })
    const instincts = (changeling.traits as Trait[]).find((t) => t.name === "Changeling Instincts")
    expect(
      instincts?.linkedModifiers?.some((m) => m.catalogRefId === "cat_char_skills"),
    ).toBe(true)

    const warforged = enrichCustomSpeciesRow({
      name: "Warforged",
      source: "Custom",
      traits: [
        { name: "Integrated Protection", description: "" },
        { name: "Tireless", description: "" },
      ],
    })
    const tireless = (warforged.traits as Trait[]).find((t) => t.name === "Tireless")
    expect(
      tireless?.linkedModifiers?.some((m) => m.catalogRefId === "cat_char_condition_immunity"),
    ).toBe(true)
    expect(warforged.size_options).toEqual(["Small", "Medium"])
  })
})

describe("subclass feature presets", () => {
  const baseFeature = (name: string): Feature => ({
    name,
    description: "",
    level: 3,
    linkedModifiers: [],
    modifierRefs: [],
  })

  it("wires Cutting Words preset", () => {
    expect(featureHasModifierPreset("Bard", "College of Lore", "Cutting Words")).toBe(true)
    const enriched = enrichClassFeatureWithModifierPresets(
      "Bard",
      baseFeature("Cutting Words"),
      "College of Lore",
    )
    expect(enriched.linkedModifiers?.some((m) => m.catalogRefId === "cat_char_failed_roll_trigger")).toBe(true)
  })

  it("wires Combat Superiority to superiority_dice resource", () => {
    expect(featureHasModifierPreset("Fighter", "Battle Master", "Combat Superiority")).toBe(true)
    const enriched = enrichClassFeatureWithModifierPresets(
      "Fighter",
      baseFeature("Combat Superiority"),
      "Battle Master",
    )
    const uses = enriched.linkedModifiers?.flatMap((m) => m.characteristics ?? []).find((c) => c.type === "uses")
    expect(uses?.type).toBe("uses")
    if (uses?.type === "uses") {
      expect(uses.uses.classResourceKey).toBe("superiority_dice")
    }
  })

  it("wires Vow of Enmity and Glorious Defense", () => {
    expect(featureHasModifierPreset("Paladin", "Oath of Vengeance", "Vow of Enmity")).toBe(true)
    expect(featureHasModifierPreset("Paladin", "Oath of Glory", "Glorious Defense")).toBe(true)
  })

  it("wires Dread Ambusher and Assassinate", () => {
    expect(featureHasModifierPreset("Ranger", "Gloom Stalker", "Dread Ambusher")).toBe(true)
    expect(featureHasModifierPreset("Rogue", "Assassin", "Assassinate")).toBe(true)
  })

  it("wires Bend Luck and Power of Shadow", () => {
    expect(featureHasModifierPreset("Sorcerer", "Wild Magic Sorcery", "Bend Luck")).toBe(true)
    expect(featureHasModifierPreset("Sorcerer", "Shadow Sorcery", "Power of Shadow")).toBe(true)
  })

  it("wires Wizard schools and Artificer subclasses", () => {
    expect(featureHasModifierPreset("Wizard", "School of Abjuration", "Arcane Ward")).toBe(true)
    expect(featureHasModifierPreset("Wizard", "School of Divination", "Portent")).toBe(true)
    expect(featureHasModifierPreset("Wizard", "Bladesinger", "Bladesong")).toBe(true)
    expect(featureHasModifierPreset("Artificer", "Battle Smith", "Steel Defender")).toBe(true)
    expect(featureHasModifierPreset("Artificer", "Artillerist", "Eldritch Cannon")).toBe(true)
    expect(featureHasModifierPreset("Artificer", "Maverick", "Arcane Prototype")).toBe(true)
  })
})

describe("canonical SRD feature choices", () => {
  const baseFeature = (name: string): Feature => ({
    name,
    description: "",
    level: 1,
    linkedModifiers: [],
    modifierRefs: [],
  })

  it("wires Blessed Strikes with Divine Strike and Potent Spellcasting options", () => {
    const enriched = enrichClassFeatureWithModifierPresets("Cleric", baseFeature("Blessed Strikes"))
    expect(enriched.isChoice).toBe(true)
    expect(enriched.choices?.options.map((option) => option.name)).toEqual([
      "Divine Strike",
      "Potent Spellcasting",
    ])
    expect(
      enriched.choices?.options.every((option) => (option.linkedModifiers?.length ?? 0) > 0),
    ).toBe(true)
  })

  it("wires Divine Order Thaumaturge with Arcana or Religion only (not History or Medicine)", () => {
    const enriched = enrichClassFeatureWithModifierPresets("Cleric", baseFeature("Divine Order"))
    const thaumaturge = enriched.choices?.options.find((option) => option.name === "Thaumaturge")
    expect(thaumaturge?.description).toContain("Arcana or Religion")
    expect(thaumaturge?.description).not.toContain("History")
    expect(thaumaturge?.description).not.toContain("Medicine")
    const chars =
      thaumaturge?.linkedModifiers?.flatMap((mod) => mod.characteristics ?? []) ?? []
    const skillMod = chars.find((char) => char.type === "skills")
    expect(skillMod?.type).toBe("skills")
    if (skillMod?.type === "skills") {
      expect(skillMod.grantsProficiency).toBe(false)
      expect(skillMod.entries.map((entry) => entry.skill)).toEqual(["Arcana", "Religion"])
    }
  })

  it("wires Elemental Fury with Potent Spellcasting and Primal Strike options", () => {
    const enriched = enrichClassFeatureWithModifierPresets("Druid", baseFeature("Elemental Fury"))
    expect(enriched.choices?.options.map((option) => option.name)).toEqual([
      "Potent Spellcasting",
      "Primal Strike",
    ])
  })

  const optionExtraDamageRows = (feature: Feature, optionName: string) => {
    const option = feature.choices?.options.find((opt) => opt.name === optionName)
    const effects = (option?.linkedModifiers ?? []).flatMap(
      (instance) => instance.activation?.effects ?? [],
    )
    const damage = effects.find((effect) => (effect as { kind?: string }).kind === "extra_damage_on_hit")
    return (damage as { bonusByLevel?: { level: number; dieCount?: number | null; dieType?: string | null }[] })
      ?.bonusByLevel
  }

  it("scales Divine Strike extra damage 1d8 → 2d8 at Cleric level 14", () => {
    const enriched = enrichClassFeatureWithModifierPresets("Cleric", baseFeature("Blessed Strikes"))
    const rows = optionExtraDamageRows(enriched, "Divine Strike")
    expect(rows).toEqual([
      { level: 7, mode: "dice", dieCount: 1, dieType: "d8" },
      { level: 14, mode: "dice", dieCount: 2, dieType: "d8" },
    ])
  })

  it("scales Primal Strike extra damage 1d8 → 2d8 at Druid level 15", () => {
    const enriched = enrichClassFeatureWithModifierPresets("Druid", baseFeature("Elemental Fury"))
    const rows = optionExtraDamageRows(enriched, "Primal Strike")
    expect(rows).toEqual([
      { level: 7, mode: "dice", dieCount: 1, dieType: "d8" },
      { level: 15, mode: "dice", dieCount: 2, dieType: "d8" },
    ])
  })

  it("does not offer a redundant re-pick on the Improved scaling features", () => {
    for (const [className, featureName] of [
      ["Cleric", "Improved Blessed Strikes"],
      ["Druid", "Improved Elemental Fury"],
    ] as const) {
      const enriched = enrichClassFeatureWithModifierPresets(className, baseFeature(featureName))
      expect(enriched.isChoice ?? false).toBe(false)
      const characteristicTypes = (enriched.linkedModifiers ?? []).flatMap((instance) =>
        (instance.characteristics ?? []).map((c) => c.type),
      )
      expect(characteristicTypes).not.toContain("feature_option_picker")
      expect(characteristicTypes).not.toContain("bonus_damage_riders")
    }
  })

  it("wires Hunter's Prey with Colossus Slayer and Horde Breaker options", () => {
    const enriched = enrichClassFeatureWithModifierPresets("Ranger", baseFeature("Hunter's Prey"))
    expect(enriched.choices?.options.map((option) => option.name)).toEqual([
      "Colossus Slayer",
      "Horde Breaker",
    ])
    expect(enriched.choices?.swappableOnRest).toBe(true)
  })

  it("wires Primal Knowledge to a class-skill-list pick and a STR-while-raging skill check", () => {
    const enriched = enrichClassFeatureWithModifierPresets("Barbarian", baseFeature("Primal Knowledge"))
    const chars =
      enriched.linkedModifiers?.flatMap((mod) => mod.characteristics ?? []) ?? []

    const skillMod = chars.find((char) => char.type === "skills")
    expect(skillMod?.type).toBe("skills")
    if (skillMod?.type === "skills") {
      expect(skillMod.fromClassSkillList).toBe(true)
      expect(skillMod.allowAnySkill).toBeFalsy()
      expect(skillMod.choiceCount).toBe(1)
    }

    const altMod = chars.find((char) => char.type === "skill_check_alternate_ability")
    expect(altMod?.type).toBe("skill_check_alternate_ability")
    if (altMod?.type === "skill_check_alternate_ability") {
      expect(altMod.ability).toBe("strength")
      expect(altMod.conditionLabel).toContain("Rage")
      expect(altMod.skills).toEqual([
        "Acrobatics",
        "Intimidation",
        "Perception",
        "Stealth",
        "Survival",
      ])
    }
  })

  it("wires Expertise to a 2-skill player choice that grants expertise", () => {
    const enriched = enrichClassFeatureWithModifierPresets("Bard", baseFeature("Expertise"))
    const chars =
      enriched.linkedModifiers?.flatMap((mod) => mod.characteristics ?? []) ?? []
    const skillMod = chars.find((char) => char.type === "skills")
    expect(skillMod?.type).toBe("skills")
    if (skillMod?.type === "skills") {
      expect(skillMod.choiceCount).toBe(2)
      expect(skillMod.grantExpertise).toBe(true)
    }
  })

  it("wires Bard Magical Secrets as expanded spell-list access (not a fixed grant)", () => {
    const enriched = enrichClassFeatureWithModifierPresets(
      "Bard",
      { ...baseFeature("Magical Secrets"), level: 10 },
    )
    const chars =
      enriched.linkedModifiers?.flatMap((mod) => mod.characteristics ?? []) ?? []
    const accessMod = chars.find((char) => char.type === "spell_list_access")
    expect(accessMod?.type).toBe("spell_list_access")
    if (accessMod?.type === "spell_list_access") {
      expect(accessMod.classNames).toEqual(["Bard", "Cleric", "Druid", "Wizard"])
    }
    // It must NOT grant fixed extra spells (the old 2014 behavior).
    expect(chars.some((char) => char.type === "spells_known")).toBe(false)
  })

  it("wires Bard Bardic Inspiration with a choose-3 musical instrument pick", () => {
    const enriched = enrichClassFeatureWithModifierPresets(
      "Bard",
      baseFeature("Bardic Inspiration"),
    )
    const chars =
      enriched.linkedModifiers?.flatMap((mod) => mod.characteristics ?? []) ?? []
    const toolMod = chars.find((char) => char.type === "tool_proficiencies")
    expect(toolMod?.type).toBe("tool_proficiencies")
    if (toolMod?.type === "tool_proficiencies") {
      expect(toolMod.choiceCount).toBe(3)
      expect(toolMod.toolChoicePool).toBe("musical")
    }
  })
})
