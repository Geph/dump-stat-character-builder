import { describe, expect, it } from "vitest"
import {
  BUILTIN_SHEET_TOGGLES,
  getSheetToggleDefinition,
  inactiveSheetToggleLabel,
  isKnownSheetToggleId,
  mergeSheetToggleDefinitions,
  sheetToggleDefinitionsFromNewToggles,
  sheetToggleIdActivatedByAction,
} from "@/lib/compendium/sheet-toggle-registry"

describe("sheet-toggle-registry", () => {
  it("includes builtin rage, wild shape, and below-half-hp toggles", () => {
    const ids = BUILTIN_SHEET_TOGGLES.map((entry) => entry.id)
    expect(ids).toContain("while_raging")
    expect(ids).toContain("while_wild_shape")
    expect(ids).toContain("while_innate_sorcery_active")
    expect(ids).toContain("tides_of_chaos_active")
    expect(ids).toContain("dragon_wings_active")
    expect(ids).toContain("below_half_hp")
    expect(ids).toContain("while_dancing")
    expect(ids).not.toContain("in_combat_or_high_stakes")
  })

  it("resolves optional psion toggles by id", () => {
    expect(getSheetToggleDefinition("in_combat_or_high_stakes")?.sourceType).toBe("class_feature")
    expect(getSheetToggleDefinition("first_turn_of_combat")).toMatchObject({
      label: "First turn of combat",
      defaultDuration: "1_round",
      hideFromBanner: true,
    })
    expect(getSheetToggleDefinition("while_concentrating")?.id).toBe("while_concentrating")
    expect(getSheetToggleDefinition("while_flying")?.id).toBe("while_flying")
    expect(getSheetToggleDefinition("while_dancing")?.label).toBe("Dancing")
    expect(getSheetToggleDefinition("while_dancing")).toMatchObject({
      defaultDuration: "1_minute",
      endsWhen: { incapacitated: true, speedZero: true },
    })
  })

  it("resolves Heroes of Faerûn transformation toggles by id", () => {
    expect(getSheetToggleDefinition("bladesong_active")?.label).toBe("Bladesong")
    expect(getSheetToggleDefinition("frozen_haunt_form")?.label).toBe("Frozen Haunt")
    expect(getSheetToggleDefinition("crown_of_spellfire_active")?.label).toBe("Crown of Spellfire")
  })

  it("resolves Ravenloft transformation toggles by id", () => {
    expect(getSheetToggleDefinition("wrath_of_the_wild_form")?.label).toBe("Wrath of the Wild")
    expect(getSheetToggleDefinition("ghost_walk_form")?.label).toBe("Ghost Walk")
    expect(getSheetToggleDefinition("umbral_form")?.label).toBe("Umbral Form")
    expect(getSheetToggleDefinition("form_of_dread")?.label).toBe("Form of Dread")
    expect(getSheetToggleDefinition("form_of_dread")?.sourceType).toBe("builtin")
  })

  it("resolves KibblesTasty Psion play toggles and action activation", () => {
    expect(getSheetToggleDefinition("full_awakening_active")?.label).toBe("Full Awakening")
    expect(getSheetToggleDefinition("mind_rider_active")).toMatchObject({
      label: "Mind Rider",
      noteLabel: "Target creature",
      notePlaceholder: "Creature name",
    })
    expect(getSheetToggleDefinition("mind_rider_active")?.hint).toMatch(/Advantage/)
    expect(isKnownSheetToggleId("full_awakening_active")).toBe(true)
    expect(sheetToggleIdActivatedByAction({ name: "Full Awakening" })).toBe("full_awakening_active")
    expect(sheetToggleIdActivatedByAction({ name: "Mind Rider" })).toBe("mind_rider_active")
  })

  it("recognizes magic item toggle ids", () => {
    expect(isKnownSheetToggleId("magic_item:abc:power")).toBe(true)
    expect(isKnownSheetToggleId("dance_style_enthralling_movement")).toBe(true)
    expect(getSheetToggleDefinition("dance_style_enthralling_movement")).toMatchObject({
      label: "Dance Style: Enthralling Movement",
      exclusiveGroup: "dance_style",
      hideFromBanner: true,
    })
    expect(getSheetToggleDefinition("dance_style_agile_movement")).toMatchObject({
      label: "Dance Style: Agile Movement",
      hideFromBanner: true,
    })
    expect(getSheetToggleDefinition("magic_item:abc:power")?.sourceType).toBe("magic_item")
  })

  it("merges dynamic toggles without duplicating builtins", () => {
    const merged = mergeSheetToggleDefinitions([
      { id: "while_raging", label: "Duplicate", sourceType: "magic_item" },
      { id: "magic_item:x:y", label: "Item power", sourceType: "magic_item" },
    ])
    expect(merged.filter((entry) => entry.id === "while_raging")).toHaveLength(1)
    expect(merged.some((entry) => entry.id === "magic_item:x:y")).toBe(true)
  })

  it("converts a subclass's declared new_toggles into real sheet toggle definitions", () => {
    const defs = sheetToggleDefinitionsFromNewToggles([
      { key: "wrath_of_the_sea_active", name: "Wrath of the Sea Active", grantingFeature: "Wrath of the Sea" },
    ])
    expect(defs).toEqual([
      {
        id: "wrath_of_the_sea_active",
        label: "Wrath of the Sea Active",
        sourceType: "class_feature",
        sourceId: "Wrath of the Sea",
      },
    ])
  })

  it("returns an empty list for null/undefined/empty new_toggles", () => {
    expect(sheetToggleDefinitionsFromNewToggles(null)).toEqual([])
    expect(sheetToggleDefinitionsFromNewToggles(undefined)).toEqual([])
    expect(sheetToggleDefinitionsFromNewToggles([])).toEqual([])
  })

  it("maps Use Rage / Wild Shape actions onto banner sheet toggles", () => {
    expect(sheetToggleIdActivatedByAction({ name: "Rage", classResourceKey: "rage" })).toBe(
      "while_raging",
    )
    expect(sheetToggleIdActivatedByAction({ name: "Rage" })).toBe("while_raging")
    expect(sheetToggleIdActivatedByAction({ name: "Wild Shape", classResourceKey: "wild_shape" })).toBe(
      "while_wild_shape",
    )
    expect(sheetToggleIdActivatedByAction({ name: "Innate Sorcery" })).toBe(
      "while_innate_sorcery_active",
    )
    expect(sheetToggleIdActivatedByAction({ name: "Reckless Attack" })).toBe("reckless_attack")
    expect(sheetToggleIdActivatedByAction({ name: "Dance", classResourceKey: "dances" })).toBe(
      "while_dancing",
    )
    expect(sheetToggleIdActivatedByAction({ name: "Dance" })).toBe("while_dancing")
    expect(sheetToggleIdActivatedByAction({ name: "Bardic Inspiration" })).toBeNull()
  })

  it("uses a not-activated prefix for exclusive-style toggle labels", () => {
    expect(inactiveSheetToggleLabel("Dance Style: Inspiring Chant")).toBe(
      "Dance Style: not activated",
    )
    expect(inactiveSheetToggleLabel("Raging")).toBe("Not raging")
  })

  it("hides Magic Weapon / Elemental Weapon from the banner (Combat weapon UI owns them)", () => {
    expect(getSheetToggleDefinition("magic_weapon_active")).toMatchObject({
      hideFromBanner: true,
      defaultDuration: "until_ended",
    })
    expect(getSheetToggleDefinition("elemental_weapon_active")).toMatchObject({
      hideFromBanner: true,
      defaultDuration: "until_ended",
    })
    expect(sheetToggleIdActivatedByAction({ name: "Magic Weapon" })).toBe("magic_weapon_active")
    expect(sheetToggleIdActivatedByAction({ name: "Elemental Weapon" })).toBe(
      "elemental_weapon_active",
    )
  })
})
