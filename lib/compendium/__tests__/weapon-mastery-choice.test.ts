import { describe, expect, it } from "vitest"
import { enrichClassFeatureWithModifierPresets } from "@/lib/compendium/enrich-srd-class-features"
import { resolveFeatureChoiceCount } from "@/lib/compendium/resolve-feature-choice-count"
import {
  enrichWeaponMasteryFeature,
  isWeaponMasteryFeature,
  parseWeaponMasteryCountFromDescription,
  weaponMasteryOptionsForClass,
} from "@/lib/compendium/weapon-mastery-choice"
import type { Feature } from "@/lib/types"

describe("weapon mastery choices", () => {
  it("parses default mastery count from feature description", () => {
    expect(
      parseWeaponMasteryCountFromDescription(
        "use the mastery properties of two kinds of Simple or Martial Melee weapons",
      ),
    ).toBe(2)
    expect(
      parseWeaponMasteryCountFromDescription(
        "use the mastery properties of three kinds of Simple or Martial weapons",
      ),
    ).toBe(3)
  })

  it("offers melee weapon options for Barbarian", () => {
    const options = weaponMasteryOptionsForClass("Barbarian")
    expect(options.some((option) => option.name === "Greataxe")).toBe(true)
    expect(options.some((option) => option.name === "Longbow")).toBe(false)
  })

  it("enriches SRD Weapon Mastery into a real feature choice without legacy picker mods", () => {
    const feature: Feature = {
      level: 1,
      name: "Weapon Mastery",
      description:
        "Your training with weapons allows you to use the mastery properties of two kinds of Simple or Martial Melee weapons of your choice.",
    }
    const enriched = enrichClassFeatureWithModifierPresets("Barbarian", feature, null, {
      skipMechanicalDetection: true,
    })

    expect(enriched.isChoice).toBe(true)
    expect(enriched.choices?.choiceCountByLevel?.length).toBeGreaterThan(0)
    expect(enriched.choices?.resourceKey).toBeUndefined()
    expect(enriched.choices?.options?.length ?? 0).toBeGreaterThan(10)
    expect(enriched.linkedModifiers ?? []).toHaveLength(0)
  })

  it("includes Weapon Mastery in the common modifier catalog", async () => {
    const { buildDefaultModifierCatalog } = await import("@/lib/compendium/modifier-catalog")
    const { WEAPON_MASTERY_CATALOG_ID } = await import("@/lib/compendium/weapon-mastery-catalog")
    const catalog = buildDefaultModifierCatalog()
    expect(catalog.some((entry) => entry.id === WEAPON_MASTERY_CATALOG_ID)).toBe(true)
  })

  it("scales Barbarian weapon mastery picks from choiceCountByLevel", () => {
    const choices = enrichWeaponMasteryFeature(
      { level: 1, name: "Weapon Mastery", description: "" },
      "Barbarian",
    ).choices!

    expect(resolveFeatureChoiceCount(choices, 1, "Barbarian")).toBe(2)
    expect(resolveFeatureChoiceCount(choices, 4, "Barbarian")).toBe(3)
    expect(resolveFeatureChoiceCount(choices, 10, "Barbarian")).toBe(4)
  })

  it("scales Fighter weapon mastery picks from choiceCountByLevel without class resource", () => {
    const choices = enrichWeaponMasteryFeature(
      { level: 1, name: "Weapon Mastery", description: "" },
      "Fighter",
    ).choices!

    expect(resolveFeatureChoiceCount(choices, 1, "Fighter")).toBe(3)
    expect(resolveFeatureChoiceCount(choices, 16, "Fighter")).toBe(6)
  })

  it("detects weapon mastery for builder UI without legacy resourceKey", () => {
    const enriched = enrichClassFeatureWithModifierPresets(
      "Barbarian",
      {
        level: 1,
        name: "Weapon Mastery",
        description:
          "Your training with weapons allows you to use the mastery properties of two kinds of Simple or Martial Melee weapons of your choice.",
      },
      null,
      { skipMechanicalDetection: true },
    )
    expect(isWeaponMasteryFeature(enriched)).toBe(true)
    expect(enriched.choices?.resourceKey).toBeUndefined()
  })

  it("falls back to weapon_mastery class resource for unmigrated choices", () => {
    const choices = {
      category: "Weapon Mastery",
      count: 2,
      resourceKey: "weapon_mastery",
      options: [],
    }
    const legacyResource = {
      id: "weapon_mastery",
      name: "Weapon Mastery",
      uses: {
        type: "at_level" as const,
        atLevelMode: "tier" as const,
        atLevelTable: [
          { level: 1, count: 3 },
          { level: 16, count: 6 },
        ],
      },
    }
    expect(resolveFeatureChoiceCount(choices, 16, "Fighter", [legacyResource])).toBe(6)
  })
})
