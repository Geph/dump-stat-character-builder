import { describe, expect, it } from "vitest"
import { collectSpeciesModifierPlayerChoiceSlots } from "@/lib/builder/modifier-player-choices"
import { isFeatEligibleForCategories, type FeatSlotContext } from "@/lib/builder/feat-selection"
import { buildDefaultModifierCatalog } from "@/lib/compendium/modifier-catalog"
import { enrichSrdSpeciesRow } from "@/lib/compendium/enrich-srd-species"
import { SRD_SOURCE } from "@/lib/srd/source"
import type { Feat, Species } from "@/lib/types"

const catalog = buildDefaultModifierCatalog()

function humanRow(): Record<string, unknown> {
  return {
    id: "species_human",
    name: "Human",
    description: null,
    speed: 30,
    size: "Medium",
    creature_type: "Humanoid",
    source: SRD_SOURCE,
    traits: [
      { name: "Resourceful", description: "Gain Heroic Inspiration." },
      { name: "Skillful", description: "Proficiency in one skill of your choice." },
      { name: "Versatile", description: "You gain an Origin feat of your choice." },
    ],
  }
}

describe("SRD species enrichment — languages & size", () => {
  it("grants a species-wide language choice (Common + two standard)", () => {
    const enriched = enrichSrdSpeciesRow(humanRow()) as unknown as Species
    const slots = collectSpeciesModifierPlayerChoiceSlots(enriched, {}, catalog)
    const langSlot = slots.find((s) => s.kind === "language")
    expect(langSlot).toBeDefined()
    expect(langSlot?.maxCount).toBe(2)
    expect(langSlot?.options?.map((o) => o.name)).toContain("Draconic")
    // Common is the fixed/known language, not one of the choosable options.
    expect(langSlot?.options?.map((o) => o.name)).not.toContain("Common")
    expect(langSlot?.allowCustom).toBe(true)
  })

  it("surfaces the Skillful skill choice as a builder slot", () => {
    const enriched = enrichSrdSpeciesRow(humanRow()) as unknown as Species
    const slots = collectSpeciesModifierPlayerChoiceSlots(enriched, {}, catalog)
    const skillSlot = slots.find((s) => s.kind === "skill")
    expect(skillSlot).toBeDefined()
    expect(skillSlot?.maxCount).toBe(1)
    expect((skillSlot?.options?.length ?? 0)).toBeGreaterThan(0)
  })

  it("flags Human and Tiefling as size-choice species", () => {
    const human = enrichSrdSpeciesRow(humanRow()) as unknown as Species
    expect(human.size_options).toEqual(["Small", "Medium"])

    const tiefling = enrichSrdSpeciesRow({
      ...humanRow(),
      id: "species_tiefling",
      name: "Tiefling",
    }) as unknown as Species
    expect(tiefling.size_options).toEqual(["Small", "Medium"])

    const dwarf = enrichSrdSpeciesRow({
      ...humanRow(),
      id: "species_dwarf",
      name: "Dwarf",
    }) as unknown as Species
    expect(dwarf.size_options ?? null).toBeNull()
  })
})

describe("isFeatEligibleForCategories — Origin slots", () => {
  const ctx: FeatSlotContext = {
    totalLevel: 1,
    classIds: [],
    selectedFeatIds: [],
    speciesId: "species_human",
    backgroundId: null,
  }
  const originFeat: Feat = {
    id: "feat_skilled",
    name: "Skilled",
    category: "Origin",
  } as Feat
  const generalFeat: Feat = {
    id: "feat_alert",
    name: "Alert",
    category: "General",
    level_requirement: 4,
  } as Feat

  it("allows an Origin feat for an Origin-grant slot (Human Versatile)", () => {
    expect(isFeatEligibleForCategories(originFeat, ["Origin"], 1, ctx)).toBe(true)
  })

  it("excludes Origin feats from a General milestone slot", () => {
    expect(isFeatEligibleForCategories(originFeat, ["General"], 4, {
      ...ctx,
      totalLevel: 4,
    })).toBe(false)
  })

  it("excludes General feats from an Origin slot", () => {
    expect(isFeatEligibleForCategories(generalFeat, ["Origin"], 1, ctx)).toBe(false)
  })

  it("allows a Fighting Style feat at the granting feature level (Paladin level 2)", () => {
    const fightingStyleFeat: Feat = {
      id: "feat_defense",
      name: "Defense",
      category: "Fighting Style",
      level_requirement: null,
    } as Feat
    // milestoneLevel = 2 (Paladin grants Fighting Style at level 2)
    expect(
      isFeatEligibleForCategories(fightingStyleFeat, ["Fighting Style"], 2, {
        ...ctx,
        totalLevel: 2,
      }),
    ).toBe(true)
    // Also valid for Fighter's level-1 Fighting Style.
    expect(
      isFeatEligibleForCategories(fightingStyleFeat, ["Fighting Style"], 1, ctx),
    ).toBe(true)
  })
})
