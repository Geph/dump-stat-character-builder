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
