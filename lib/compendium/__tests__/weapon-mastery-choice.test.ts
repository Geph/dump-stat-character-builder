import { describe, expect, it } from "vitest"
import { resolveFeatureChoiceOptions } from "@/lib/builder/aggregate-psionic-talents"
import { enrichClassFeatureWithModifierPresets } from "@/lib/compendium/enrich-srd-class-features"
import { resolveFeatureChoiceCount } from "@/lib/compendium/resolve-feature-choice-count"
import {
  enrichWeaponMasteryFeature,
  isWeaponMasteryFeature,
  parseWeaponMasteryCountFromDescription,
  weaponMasteryOptionsForClass,
} from "@/lib/compendium/weapon-mastery-choice"
import type { Equipment, Feature } from "@/lib/types"

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
    const feature = {
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

  it("keeps Captain, Investigator, and Martyr at two masteries (never Fighter's ladder)", () => {
    for (const className of ["Captain", "Investigator", "Martyr", "Dancer"]) {
      const choices = enrichWeaponMasteryFeature(
        {
          level: 1,
          name: "Weapon Mastery",
          description:
            "Your training with weapons allows you to use the mastery properties of two kinds of weapons of your choice with which you have proficiency.",
          choices: {
            category: "Weapon Mastery",
            count: 2,
            // Mistaken Fighter fallback previously stamped into seed packs
            choiceCountByLevel: [
              { level: 1, count: 3 },
              { level: 4, count: 4 },
              { level: 10, count: 5 },
              { level: 16, count: 6 },
            ],
            options: [],
          },
        },
        className,
      ).choices!

      expect(resolveFeatureChoiceCount(choices, 1, className), className).toBe(2)
      expect(resolveFeatureChoiceCount(choices, 9, className), className).toBe(2)
      expect(resolveFeatureChoiceCount(choices, 20, className), className).toBe(2)
    }
  })

  it("corrects stale Fighter ladders on Captain even without re-enrichment", () => {
    const stale = {
      category: "Weapon Mastery",
      count: 2,
      choiceCountByLevel: [
        { level: 1, count: 3 },
        { level: 4, count: 4 },
        { level: 10, count: 5 },
        { level: 16, count: 6 },
      ],
      options: [],
    }
    expect(
      resolveFeatureChoiceCount(stale, 9, "Captain", undefined, { featureName: "Weapon Mastery" }),
    ).toBe(2)
  })

  it("scales Craftsman / Gunslinger / Vagabond / Warden like Barbarian (2→3→4)", () => {
    for (const className of [
      "Craftsman",
      "Gunslinger",
      "Vagabond",
      "Warden",
      "Warden (Mage Hand Press)",
    ]) {
      const choices = enrichWeaponMasteryFeature(
        { level: 1, name: "Weapon Mastery", description: "two kinds of weapons" },
        className,
      ).choices!

      expect(resolveFeatureChoiceCount(choices, 1, className), className).toBe(2)
      expect(resolveFeatureChoiceCount(choices, 4, className), className).toBe(3)
      expect(resolveFeatureChoiceCount(choices, 10, className), className).toBe(4)
    }
  })

  it("does not default unknown classes to Fighter's mastery ladder", () => {
    const choices = enrichWeaponMasteryFeature(
      {
        level: 1,
        name: "Weapon Mastery",
        description: "use the mastery properties of two kinds of weapons of your choice",
      },
      "Homebrew Skirmisher",
    ).choices!

    expect(resolveFeatureChoiceCount(choices, 1, "Homebrew Skirmisher")).toBe(2)
    expect(resolveFeatureChoiceCount(choices, 16, "Homebrew Skirmisher")).toBe(2)
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

  it("adds compendium weapons to mastery choices without a legacy resource key", () => {
    const feature = enrichWeaponMasteryFeature(
      { level: 1, name: "Weapon Mastery", description: "two kinds of weapons" },
      "Gunslinger",
    )
    const revolver = {
      id: "revolver",
      name: "Revolver",
      category: "Weapon",
      subcategory: "Martial Ranged",
      properties: { damage: "1d8 Piercing", properties: ["Reload (6)"], mastery: "Vex" },
    } as unknown as Equipment

    const options = resolveFeatureChoiceOptions(feature, {
      customAbilities: [],
      featureChoicePicks: {},
      classNames: ["Gunslinger"],
      equipmentCatalog: [revolver],
    })

    expect(options.some((option) => option.name === "Revolver")).toBe(true)
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
