import { describe, expect, it } from "vitest"
import {
  createCharacteristicModifier,
  normalizeCharacteristics,
} from "@/lib/compendium/characteristic-modifiers"
import {
  featureHasModifierPreset,
  enrichClassFeatureWithModifierPresets,
} from "@/lib/compendium/enrich-srd-class-features"
import type { Feature } from "@/lib/types"

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
})

describe("subclass feature presets", () => {
  const baseFeature = (name: string): Feature => ({
    id: "feat_test",
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
    id: "feat_test",
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
      expect(toolMod.choiceOptions).toContain("Lute")
      expect(toolMod.choiceOptions).toContain("Viol")
    }
  })
})
