import { describe, expect, it } from "vitest"
import { collectSpeciesModifierPlayerChoiceSlots } from "@/lib/builder/modifier-player-choices"
import { isFeatEligibleForCategories, type FeatSlotContext } from "@/lib/builder/feat-selection"
import { buildDefaultModifierCatalog } from "@/lib/compendium/modifier-catalog"
import { enrichSrdSpeciesRow } from "@/lib/compendium/enrich-srd-species"
import { SRD_SOURCE } from "@/lib/srd/source"
import bundledSpecies from "@/lib/srd/seed-data/species.json"
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

function elfRow(): Record<string, unknown> {
  const elf = bundledSpecies.find((row) => row.name === "Elf")
  if (!elf) throw new Error("Elf species missing from seed data")
  return {
    id: "species_elf",
    name: "Elf",
    description: elf.description ?? null,
    speed: 30,
    size: "Medium",
    creature_type: "Humanoid",
    source: SRD_SOURCE,
    traits: elf.traits,
  }
}

function elvenLineageTraitIndex(species: Species): number {
  const index = species.traits?.findIndex((trait) => trait.name === "Elven Lineage") ?? -1
  if (index < 0) throw new Error("Elven Lineage trait missing")
  return index
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

  it("does not double-enrich language grants stored as linked_modifiers (snake_case)", () => {
    const enrichedOnce = enrichSrdSpeciesRow(humanRow()) as Record<string, unknown>
    const withSnakeCaseOnly = {
      ...humanRow(),
      linked_modifiers: enrichedOnce.linked_modifiers,
      modifier_refs: enrichedOnce.modifier_refs,
    }
    const enrichedTwice = enrichSrdSpeciesRow(withSnakeCaseOnly) as unknown as Species
    const slots = collectSpeciesModifierPlayerChoiceSlots(enrichedTwice, {}, catalog)
    expect(slots.filter((s) => s.kind === "language")).toHaveLength(1)
  })
})

describe("Elf — Elven Lineage", () => {
  it("does not ask for a spell list when High Elf is selected (fixed lineage spells)", () => {
    const enriched = enrichSrdSpeciesRow(elfRow()) as unknown as Species
    const lineageIndex = elvenLineageTraitIndex(enriched)
    const slots = collectSpeciesModifierPlayerChoiceSlots(
      enriched,
      { [String(lineageIndex)]: ["High Elf"] },
      catalog,
    )
    expect(slots.some((slot) => slot.kind === "spell_list_class")).toBe(false)
    expect(slots.some((slot) => slot.kind === "spell")).toBe(false)
  })

  it("asks for spellcasting ability (Int/Wis/Cha) after a lineage is selected", () => {
    const enriched = enrichSrdSpeciesRow(elfRow()) as unknown as Species
    const lineageIndex = elvenLineageTraitIndex(enriched)
    const slots = collectSpeciesModifierPlayerChoiceSlots(
      enriched,
      { [String(lineageIndex)]: ["High Elf"] },
      catalog,
    )
    const abilitySlot = slots.find((slot) => slot.kind === "spellcasting_ability")
    expect(abilitySlot).toBeDefined()
    expect(abilitySlot?.options?.map((option) => option.name).sort()).toEqual([
      "Charisma",
      "Intelligence",
      "Wisdom",
    ])
  })

  it("wires fixed High Elf lineage spells on the option preset", () => {
    const enriched = enrichSrdSpeciesRow(elfRow()) as unknown as Species
    const lineage = enriched.traits?.find((trait) => trait.name === "Elven Lineage")
    const highElf = lineage?.choices?.options?.find((option) => option.name === "High Elf")
    const spellMod = highElf?.linkedModifiers
      ?.flatMap((instance) => instance.characteristics ?? [])
      .find((char) => char.type === "spells_known")
    expect(spellMod?.spells?.map((entry) => entry.spellId)).toEqual([
      "Prestidigitation",
      "Detect Magic",
      "Misty Step",
    ])
    expect(spellMod?.choiceGrants ?? []).toHaveLength(0)
  })
})

function gnomeRow(): Record<string, unknown> {
  const gnome = bundledSpecies.find((row) => row.name === "Gnome")
  if (!gnome) throw new Error("Gnome species missing from seed data")
  return {
    id: "species_gnome",
    name: "Gnome",
    description: gnome.description ?? null,
    speed: 30,
    size: "Small",
    creature_type: "Humanoid",
    source: SRD_SOURCE,
    traits: gnome.traits,
  }
}

function gnomishLineageTraitIndex(species: Species): number {
  const index = species.traits?.findIndex((trait) => trait.name === "Gnomish Lineage") ?? -1
  if (index < 0) throw new Error("Gnomish Lineage trait missing")
  return index
}

describe("Gnome — Gnomish Lineage", () => {
  it("asks for spellcasting ability after Forest Gnome is selected", () => {
    const enriched = enrichSrdSpeciesRow(gnomeRow()) as unknown as Species
    const lineageIndex = gnomishLineageTraitIndex(enriched)
    const slots = collectSpeciesModifierPlayerChoiceSlots(
      enriched,
      { [String(lineageIndex)]: ["Forest Gnome"] },
      catalog,
    )
    const abilitySlot = slots.find((slot) => slot.kind === "spellcasting_ability")
    expect(abilitySlot).toBeDefined()
    expect(abilitySlot?.options?.map((option) => option.name).sort()).toEqual([
      "Charisma",
      "Intelligence",
      "Wisdom",
    ])
    expect(slots.some((slot) => slot.kind === "spell")).toBe(false)
  })

  it("wires fixed Rock Gnome lineage cantrips on the option preset", () => {
    const enriched = enrichSrdSpeciesRow(gnomeRow()) as unknown as Species
    const lineage = enriched.traits?.find((trait) => trait.name === "Gnomish Lineage")
    const rockGnome = lineage?.choices?.options?.find((option) => option.name === "Rock Gnome")
    const spellMod = rockGnome?.linkedModifiers
      ?.flatMap((instance) => instance.characteristics ?? [])
      .find((char) => char.type === "spells_known")
    expect(spellMod?.spells?.map((entry) => entry.spellId)).toEqual([
      "Mending",
      "Prestidigitation",
    ])
    expect(spellMod?.choiceGrants ?? []).toHaveLength(0)
  })
})

describe("isFeatEligibleForCategories — Origin slots", () => {
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
  const ctx: FeatSlotContext = {
    totalLevel: 1,
    classIds: [],
    feats: [originFeat, generalFeat],
    ownedFeatIds: [],
    speciesId: "species_human",
    backgroundId: null,
  }

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
    const fightingCtx: FeatSlotContext = {
      ...ctx,
      feats: [...ctx.feats, fightingStyleFeat],
    }
    // milestoneLevel = 2 (Paladin grants Fighting Style at level 2)
    expect(
      isFeatEligibleForCategories(fightingStyleFeat, ["Fighting Style"], 2, {
        ...fightingCtx,
        totalLevel: 2,
      }),
    ).toBe(true)
    // Also valid for Fighter's level-1 Fighting Style.
    expect(
      isFeatEligibleForCategories(fightingStyleFeat, ["Fighting Style"], 1, fightingCtx),
    ).toBe(true)
  })
})
