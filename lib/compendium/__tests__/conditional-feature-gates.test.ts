import { describe, expect, it } from "vitest"
import { collectFeatureDamageBonuses, collectFeatureRollBonuses } from "@/lib/character/collect-limited-feature-effects"
import { collectFeatureRollModes } from "@/lib/character/collect-feature-roll-modes"
import { buildIncomingAttackNotes } from "@/lib/character/incoming-attack-notes"
import { aggregateCharacteristics } from "@/lib/compendium/characteristic-modifiers"
import { enrichClassFeatureWithResource } from "@/lib/compendium/class-resource-features"
import { enrichClassFeatureWithModifierPresets } from "@/lib/compendium/enrich-srd-class-features"
import { enrichSrdClassList } from "@/lib/compendium/enrich-srd-classes"
import classes from "@/lib/srd/seed-data/classes.json"
import type { Equipment, Feature } from "@/lib/types"

const heavyPlate: Equipment = {
  id: "heavy-1",
  name: "Plate Armor",
  category: "Armor",
  subcategory: "Heavy Armor",
}

function enrichedBarbarianFeatures(): Feature[] {
  const enriched = enrichSrdClassList(classes as Record<string, unknown>[])
  const barbarian = enriched.find((row) => row.name === "Barbarian")!
  return (barbarian.features ?? []) as Feature[]
}

function enrichedSorcererFeatures(): Feature[] {
  const enriched = enrichSrdClassList(classes as Record<string, unknown>[])
  const sorcerer = enriched.find((row) => row.name === "Sorcerer")!
  return (sorcerer.features ?? []) as Feature[]
}

describe("Innate Sorcery feature effects (SRD: while active)", () => {
  const innateSorcery = enrichedSorcererFeatures().find((feature) => feature.name === "Innate Sorcery")!

  it("grants spell save DC bonus only while Innate Sorcery toggle is on", () => {
    const off = collectFeatureRollBonuses(
      [innateSorcery],
      { kind: "spell_save_dc" },
      { activeSheetToggles: new Set() },
    )
    const on = collectFeatureRollBonuses(
      [innateSorcery],
      { kind: "spell_save_dc" },
      { activeSheetToggles: new Set(["while_innate_sorcery_active"]) },
    )
    expect(off.total).toBe(0)
    expect(on.total).toBe(1)
  })

  it("grants spell attack advantage only while Innate Sorcery toggle is on", () => {
    const off = collectFeatureRollModes(
      [innateSorcery],
      { kind: "spell_attack" },
      { activeSheetToggles: new Set() },
    )
    const on = collectFeatureRollModes(
      [innateSorcery],
      { kind: "spell_attack" },
      { activeSheetToggles: new Set(["while_innate_sorcery_active"]) },
    )
    expect(off.mode).toBe("normal")
    expect(on.mode).toBe("advantage")
  })
})

describe("Rage feature effects (SRD: while Rage is active)", () => {
  const rage = enrichedBarbarianFeatures().find((feature) => feature.name === "Rage")!

  it("grants damage bonus only while raging", () => {
    const off = collectFeatureDamageBonuses([rage], {
      characterLevel: 5,
      activeSheetToggles: new Set(),
    })
    const on = collectFeatureDamageBonuses([rage], {
      characterLevel: 5,
      activeSheetToggles: new Set(["while_raging"]),
    })
    expect(off.flatBonus).toBe(0)
    expect(on.flatBonus).toBe(2)
  })

  it("grants Strength check advantage only while raging", () => {
    const off = collectFeatureRollModes(
      [rage],
      { kind: "ability", ability: "strength" },
      { activeSheetToggles: new Set() },
    )
    const on = collectFeatureRollModes(
      [rage],
      { kind: "ability", ability: "strength" },
      { activeSheetToggles: new Set(["while_raging"]) },
    )
    expect(off.mode).toBe("normal")
    expect(on.mode).toBe("advantage")
  })
})

describe("Reckless Attack (SRD: opt-in; melee attacks against you have Advantage)", () => {
  const reckless = enrichClassFeatureWithModifierPresets("Barbarian", {
    level: 2,
    name: "Reckless Attack",
    description: "Gain Advantage on Strength attack rolls; melee attacks against you have Advantage.",
  })

  it("grants attack advantage only when reckless toggle is active", () => {
    const off = collectFeatureRollModes(
      [reckless],
      { kind: "attack", ability: "strength" },
      { activeSheetToggles: new Set() },
    )
    const on = collectFeatureRollModes(
      [reckless],
      { kind: "attack", ability: "strength" },
      { activeSheetToggles: new Set(["reckless_attack"]) },
    )
    expect(off.mode).toBe("normal")
    expect(on.mode).toBe("advantage")
  })

  it("surfaces incoming melee advantage via incoming attack notes", () => {
    const notes = buildIncomingAttackNotes({
      activeConditions: [],
      classFeatures: [reckless],
      limitationContext: { activeSheetToggles: new Set(["reckless_attack"]) },
    })
    expect(notes.some((note) => note.label.includes("advantage"))).toBe(true)
    expect(notes.some((note) => note.detail.includes("Reckless Attack"))).toBe(true)
  })
})

describe("Escape the Horde (SRD: opportunity attacks have Disadvantage)", () => {
  const feature = enrichClassFeatureWithModifierPresets("Ranger", {
    level: 7,
    name: "Defensive Tactics",
    description: "",
    isChoice: true,
    choices: {
      category: "Defensive Tactics",
      count: 1,
      options: [
        {
          name: "Escape the Horde",
          description: "Opportunity attacks have Disadvantage against you.",
        },
      ],
    },
  })
  const escapeOption = feature.choices?.options?.find((option) => option.name === "Escape the Horde")!

  it("does not grant self-roll advantage", () => {
    const roll = collectFeatureRollModes(
      [{ ...feature, linkedModifiers: escapeOption.linkedModifiers }],
      { kind: "other" },
      {},
    )
    expect(roll.mode).toBe("normal")
  })

  it("surfaces incoming opportunity attack disadvantage", () => {
    const notes = buildIncomingAttackNotes({
      activeConditions: [],
      classFeatures: [{ ...feature, linkedModifiers: escapeOption.linkedModifiers }],
    })
    expect(notes.some((note) => note.label.includes("disadvantage"))).toBe(true)
    expect(notes.some((note) => note.detail.includes("Opportunity attacks"))).toBe(true)
  })
})

describe("Unarmored Movement (SRD: +10 at 5th, scaling to +30 at 20th)", () => {
  const movement = enrichClassFeatureWithModifierPresets("Barbarian", {
    level: 5,
    name: "Unarmored Movement",
    description: "Speed bonus while not wearing heavy armor.",
  })
  const speedMods =
    movement.linkedModifiers?.flatMap((instance) => instance.characteristics ?? []) ?? []

  it("scales walk bonus by character level", () => {
    const at5 = aggregateCharacteristics(speedMods, { characterLevel: 5 })
    const at15 = aggregateCharacteristics(speedMods, { characterLevel: 15 })
    const at20 = aggregateCharacteristics(speedMods, { characterLevel: 20 })
    expect(at5.speed.walk).toBe(10)
    expect(at15.speed.walk).toBe(20)
    expect(at20.speed.walk).toBe(30)
  })

  it("does not apply while wearing heavy armor", () => {
    const withHeavy = aggregateCharacteristics(speedMods, {
      characterLevel: 10,
      equippedArmor: heavyPlate,
    })
    expect(withHeavy.speed.walk ?? 0).toBe(0)
  })
})

describe("Jack of All Trades (SRD: half proficiency on non-proficient ability checks)", () => {
  const joat = enrichClassFeatureWithModifierPresets("Bard", {
    level: 2,
    name: "Jack of All Trades",
    description: "Add half proficiency to ability checks you lack proficiency in.",
  })

  it("adds half proficiency to non-proficient skills only", () => {
    const bonus = collectFeatureRollBonuses(
      [joat],
      { kind: "skill", skillName: "Arcana", ability: "intelligence" },
      { proficiencyBonus: 4, skillProficient: false, characterLevel: 5 },
    )
    const noBonus = collectFeatureRollBonuses(
      [joat],
      { kind: "skill", skillName: "Arcana", ability: "intelligence" },
      { proficiencyBonus: 4, skillProficient: true, characterLevel: 5 },
    )
    expect(bonus.total).toBe(2)
    expect(noBonus.total).toBe(0)
  })

  it("adds half proficiency to ability checks", () => {
    const bonus = collectFeatureRollBonuses(
      [joat],
      { kind: "ability", ability: "strength" },
      { proficiencyBonus: 4, characterLevel: 5 },
    )
    expect(bonus.total).toBe(2)
  })
})

describe("enrichment preset overlap", () => {
  it("Barbarian Extra Attack is enriched once via name preset, not resource preset", () => {
    const raw = { level: 5, name: "Extra Attack", description: "You can attack twice." }
    let feature = enrichClassFeatureWithResource("Barbarian", raw)
    feature = enrichClassFeatureWithModifierPresets("Barbarian", feature)
    const extraAttackEffects =
      feature.linkedModifiers?.flatMap(
        (instance) => instance.activation?.effects?.filter((effect) => effect.kind === "extra_attack") ?? [],
      ) ?? []
    expect(extraAttackEffects).toHaveLength(1)
    expect(extraAttackEffects[0]?.extraAttackCount).toBe(1)
  })
})
