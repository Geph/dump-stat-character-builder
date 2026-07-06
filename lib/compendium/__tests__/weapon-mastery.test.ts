import { describe, expect, it } from "vitest"
import {
  buildWeaponMasteryDescriptionsLookup,
  describeWeaponMastery,
  weaponMasteryPropertyNames,
} from "@/lib/compendium/weapon-mastery"
import { getWeaponMastery } from "@/lib/compendium/combat-stats"
import {
  buildDefaultWeaponMasteryOptions,
  WEAPON_MASTERY_PROPERTIES_CATALOG_ID,
} from "@/lib/compendium/system-option-catalogs"
import type { Equipment } from "@/lib/types"

describe("weapon mastery", () => {
  it("describes standard mastery properties case-insensitively", () => {
    expect(describeWeaponMastery("Topple")).toMatch(/Prone/)
    expect(describeWeaponMastery("graze")).toMatch(/misses/)
  })

  it("returns null for unknown homebrew masteries without catalog", () => {
    expect(describeWeaponMastery("Explode")).toBeNull()
  })

  it("resolves descriptions from the system catalog when provided", () => {
    const catalogEntries = buildDefaultWeaponMasteryOptions()
    expect(describeWeaponMastery("Topple", catalogEntries)).toMatch(/Prone/)
    expect(describeWeaponMastery("Explode", catalogEntries)).toBeNull()
  })

  it("prefers catalog text over built-in fallback for matching names", () => {
    const catalogEntries = buildDefaultWeaponMasteryOptions().map((entry) =>
      entry.name === "Vex"
        ? { ...entry, description: "<p>Homebrew Vex rules from the catalog.</p>" }
        : entry,
    )
    expect(describeWeaponMastery("Vex", catalogEntries)).toBe("Homebrew Vex rules from the catalog.")
  })

  it("falls back to SRD defaults when catalog entry is missing", () => {
    expect(describeWeaponMastery("Sap", [])).toMatch(/Disadvantage/)
  })

  it("unions catalog property names with the fixed eight SRD names", () => {
    const catalogEntries = [
      ...buildDefaultWeaponMasteryOptions(),
      {
        id: "cat_weapon_mastery_homebrew",
        name: "Explode",
        group: "Mastery Properties",
        summary: "On hit, boom",
        description: "<p>On hit, boom.</p>",
        characteristics: [],
        activation: null,
      },
    ]
    expect(weaponMasteryPropertyNames(catalogEntries)).toEqual(
      expect.arrayContaining(["Cleave", "Explode", "Vex"]),
    )
    expect(weaponMasteryPropertyNames(catalogEntries)).toHaveLength(9)
  })

  it("builds a lookup map from catalog entries with fallback defaults", () => {
    const lookup = buildWeaponMasteryDescriptionsLookup(buildDefaultWeaponMasteryOptions())
    expect(lookup.Cleave).toMatch(/second creature/)
    expect(lookup.Explode).toBeUndefined()
  })

  it("seeds default catalog entries with stable ids and summaries", () => {
    const entries = buildDefaultWeaponMasteryOptions()
    expect(entries).toHaveLength(8)
    expect(entries[0]?.id).toBe("cat_weapon_mastery_0")
    expect(entries.find((entry) => entry.name === "Graze")?.summary).toMatch(/misses/)
  })

  it("uses the expected system catalog id", () => {
    expect(WEAPON_MASTERY_PROPERTIES_CATALOG_ID).toBe("00000000-0000-4000-8000-000000000004")
  })

  it("reads mastery from top-level equipment field", () => {
    const weapon = { mastery: "Sap" } as unknown as Equipment
    expect(getWeaponMastery(weapon)).toBe("Sap")
  })
})
