import { describe, expect, it } from "vitest"
import { aggregateCharacteristics, type BonusDamageRidersCharacteristic } from "@/lib/compendium/characteristic-modifiers"
import { enrichClassFeatureWithModifierPresets } from "@/lib/compendium/enrich-srd-class-features"
import {
  mergeBonusDamageRiders,
  resolveBonusDamageRidersAtLevel,
  resolveMaxRidersPerUseAtLevel,
  resolveUnlockedRidersAtLevel,
} from "@/lib/compendium/resolve-bonus-damage-riders"
import type { Feature } from "@/lib/types"

function baseFeature(name: string, level = 5): Feature {
  return { name, level, description: "" }
}

function riderMod(
  overrides: Partial<BonusDamageRidersCharacteristic> = {},
): BonusDamageRidersCharacteristic {
  return {
    id: "riders_test",
    type: "bonus_damage_riders",
    riders: [],
    maxRidersPerUse: 1,
    maxRidersPerUseByLevel: [],
    automaticBonusByLevel: [],
    appliesTo: "Test",
    ...overrides,
  }
}

describe("resolveBonusDamageRidersAtLevel", () => {
  it("unlocks riders and max-per-use tiers by class level", () => {
    const mod = riderMod({
      riders: [
        { name: "Alpha", unlocksAtLevel: 5 },
        { name: "Beta", unlocksAtLevel: 11 },
      ],
      maxRidersPerUse: 1,
      maxRidersPerUseByLevel: [
        { level: 5, count: 1 },
        { level: 11, count: 2 },
      ],
    })

    expect(resolveUnlockedRidersAtLevel(mod.riders, 8).map((r) => r.name)).toEqual(["Alpha"])
    expect(resolveMaxRidersPerUseAtLevel(mod, 8)).toBe(1)

    const at11 = resolveBonusDamageRidersAtLevel(mod, 11)
    expect(at11.riders.map((r) => r.name)).toEqual(["Alpha", "Beta"])
    expect(at11.maxRidersPerUse).toBe(2)
  })
})

describe("SRD rider scaling presets", () => {
  it("wires Brutal Strike with level-bound riders and automatic bonus tiers", () => {
    const enriched = enrichClassFeatureWithModifierPresets("Barbarian", baseFeature("Brutal Strike", 9))
    const mod = enriched.linkedModifiers
      ?.flatMap((instance) => instance.characteristics ?? [])
      .find((char) => char.type === "bonus_damage_riders") as BonusDamageRidersCharacteristic | undefined

    expect(mod?.maxRidersPerUseByLevel).toEqual([
      { level: 9, count: 1 },
      { level: 17, count: 2 },
    ])
    expect(mod?.automaticBonusByLevel).toEqual([
      { level: 9, mode: "dice", dieCount: 1, dieType: "d10" },
      { level: 17, mode: "dice", dieCount: 2, dieType: "d10" },
    ])
    expect(mod?.riders?.map((r) => r.name)).toEqual([
      "Forceful Blow",
      "Hamstring Blow",
      "Staggering Blow",
      "Sundering Blow",
    ])
    expect(mod?.riders?.find((r) => r.name === "Staggering Blow")?.unlocksAtLevel).toBe(13)
  })

  it("keeps Improved Brutal Strike as a narrative-only marker", () => {
    for (const level of [13, 17]) {
      const enriched = enrichClassFeatureWithModifierPresets(
        "Barbarian",
        baseFeature("Improved Brutal Strike", level),
      )
      const types =
        enriched.linkedModifiers?.flatMap((instance) =>
          (instance.characteristics ?? []).map((char) => char.type),
        ) ?? []
      expect(types).not.toContain("bonus_damage_riders")
    }
  })

  it("wires Cunning Strike to spend sneak attack dice and scale max riders at level 11", () => {
    const enriched = enrichClassFeatureWithModifierPresets("Rogue", baseFeature("Cunning Strike", 5))
    const mod = enriched.linkedModifiers
      ?.flatMap((instance) => instance.characteristics ?? [])
      .find((char) => char.type === "bonus_damage_riders") as BonusDamageRidersCharacteristic | undefined

    expect(mod?.maxRidersPerUseByLevel).toEqual([
      { level: 5, count: 1 },
      { level: 11, count: 2 },
    ])
    expect(mod?.riders?.every((r) => r.costResourceKey === "sneak_attack")).toBe(true)
  })

  it("keeps Improved Cunning Strike as a narrative-only marker", () => {
    const enriched = enrichClassFeatureWithModifierPresets(
      "Rogue",
      baseFeature("Improved Cunning Strike", 11),
    )
    const types =
      enriched.linkedModifiers?.flatMap((instance) =>
        (instance.characteristics ?? []).map((char) => char.type),
      ) ?? []
    expect(types).not.toContain("bonus_damage_riders")
  })

  it("scales Champion Improved Critical to 18–20 at level 15 with empty Superior Critical", () => {
    const improved = enrichClassFeatureWithModifierPresets(
      "Fighter",
      baseFeature("Improved Critical", 3),
    )
    const entry = improved.linkedModifiers
      ?.flatMap((instance) => instance.characteristics ?? [])
      .find((char) => char.type === "attack_roll_modifiers")
    expect(entry?.type).toBe("attack_roll_modifiers")
    if (entry?.type === "attack_roll_modifiers") {
      expect(entry.entries[0]?.criticalHitMinimum).toBe(19)
      expect(entry.entries[0]?.criticalHitMinimumByLevel).toEqual([
        { level: 15, mode: "fixed", fixed: 18 },
      ])
    }

    const superior = enrichClassFeatureWithModifierPresets(
      "Fighter",
      baseFeature("Superior Critical", 15),
    )
    expect(superior.linkedModifiers ?? []).toHaveLength(0)
  })
})

describe("aggregateCharacteristics bonus_damage_riders merge", () => {
  it("merges duplicate appliesTo pools and resolves at character level", () => {
    const low = riderMod({
      id: "low",
      appliesTo: "Sneak Attack",
      riders: [{ name: "Poison", unlocksAtLevel: 5 }],
      maxRidersPerUseByLevel: [{ level: 5, count: 1 }],
    })
    const high = riderMod({
      id: "high",
      appliesTo: "Sneak Attack",
      riders: [{ name: "Trip", unlocksAtLevel: 11 }],
      maxRidersPerUseByLevel: [{ level: 11, count: 2 }],
    })

    const merged = mergeBonusDamageRiders(low, high)
    expect(merged.riders.map((r) => r.name).sort()).toEqual(["Poison", "Trip"])
    expect(merged.maxRidersPerUseByLevel).toEqual([
      { level: 5, count: 1 },
      { level: 11, count: 2 },
    ])

    const aggregated = aggregateCharacteristics([low, high], { characterLevel: 11 })
    expect(aggregated.bonusDamageRiders).toHaveLength(1)
    expect(aggregated.bonusDamageRiders[0]?.maxRidersPerUse).toBe(2)
    expect(aggregated.bonusDamageRiders[0]?.riders.map((r) => r.name).sort()).toEqual(["Poison", "Trip"])
  })
})
