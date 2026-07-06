import { describe, expect, it } from "vitest"
import {
  collectFeatureRollModes,
  featureEffectMatchesRollContext,
  isFeatureRollModifierBlocked,
} from "@/lib/character/collect-feature-roll-modes"
import { blockedWhenConditionLimitation } from "@/lib/compendium/modifier-limitations"
import { enrichClassFeatureWithModifierPresets } from "@/lib/compendium/enrich-srd-class-features"
import { enrichClassFeatureWithResource } from "@/lib/compendium/class-resource-features"
import type { Feature } from "@/lib/types"

describe("collectFeatureRollModes", () => {
  it("applies Danger Sense advantage on Dex saves when not incapacitated", () => {
    const feature = enrichClassFeatureWithModifierPresets("Barbarian", {
      level: 2,
      name: "Danger Sense",
      description: "Advantage on Dexterity saving throws unless Incapacitated.",
    })
    const active = [feature]
    const ok = collectFeatureRollModes(
      active,
      { kind: "save", ability: "dexterity" },
      { activeConditions: [] },
    )
    expect(ok.mode).toBe("advantage")

    const blocked = collectFeatureRollModes(
      active,
      { kind: "save", ability: "dexterity" },
      { activeConditions: ["Incapacitated"] },
    )
    expect(blocked.mode).toBe("normal")
  })

  it("applies Feral Instinct advantage on initiative", () => {
    const feature = enrichClassFeatureWithModifierPresets("Barbarian", {
      level: 7,
      name: "Feral Instinct",
      description: "Advantage on Initiative rolls.",
    })
    const result = collectFeatureRollModes(
      [feature],
      { kind: "initiative", ability: "dexterity" },
      { activeConditions: [] },
    )
    expect(result.mode).toBe("advantage")
  })

  it("matches save context by ability name", () => {
    const effect = {
      id: "x",
      kind: "check_roll_modifier",
      checkRollMode: "advantage" as const,
      checkCategory: "save" as const,
      checkAbility: "Dexterity",
    }
    expect(
      featureEffectMatchesRollContext(effect, { kind: "save", ability: "dexterity" }),
    ).toBe(true)
    expect(
      isFeatureRollModifierBlocked(
        {
          ...effect,
          limitations: [blockedWhenConditionLimitation("Incapacitated")],
        },
        { activeConditions: ["Incapacitated"] },
      ),
    ).toBe(true)
  })
})

describe("barbarian rage wiring", () => {
  it("does not duplicate strength check and save advantage on Rage", () => {
    const rage = {
      level: 1,
      name: "Rage",
      description:
        "While active… Strength Advantage. You have Advantage on Strength checks and Strength saving throws.",
      linkedModifiers: [],
    }
    const withResource = enrichClassFeatureWithResource("Barbarian", rage)
    const enriched = enrichClassFeatureWithModifierPresets("Barbarian", withResource)
    const checkEffects =
      enriched.linkedModifiers?.flatMap((mod) => mod.activation?.effects ?? []) ?? []
    const strChecks = checkEffects.filter(
      (effect) =>
        effect.checkCategory === "ability" &&
        effect.checkAbility === "Strength" &&
        effect.checkRollMode === "advantage",
    )
    const strSaves = checkEffects.filter(
      (effect) =>
        effect.checkCategory === "save" &&
        effect.checkAbility === "Strength" &&
        effect.checkRollMode === "advantage",
    )
    expect(strChecks).toHaveLength(1)
    expect(strSaves).toHaveLength(1)
    expect(checkEffects.some((effect) => effect.checkCategory === "attack")).toBe(false)
  })
})
