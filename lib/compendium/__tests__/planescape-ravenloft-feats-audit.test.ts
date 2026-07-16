import { describe, expect, it } from "vitest"
import {
  isFeatEligibleForCategories,
  isOriginSelectableCategory,
  normalizeFeatCategory,
  type FeatSlotContext,
} from "@/lib/builder/feat-selection"
import { enrichCustomFeatRow } from "@/lib/compendium/enrich-custom-feats"
import { inferFeatImportFields } from "@/lib/import/infer-feat-import-fields"
import type { Feat } from "@/lib/types"

const PHB = "Player's Handbook"

function chars(row: Record<string, unknown>) {
  const linked = (row.linked_modifiers ?? row.linkedModifiers ?? []) as {
    characteristics?: { type: string; [k: string]: unknown }[]
  }[]
  return linked.flatMap((entry) => entry.characteristics ?? [])
}

describe("Dark Gift category + Origin-slot eligibility", () => {
  it("normalizes Dark Gift category", () => {
    expect(normalizeFeatCategory("Dark Gift")).toBe("Dark Gift")
    expect(normalizeFeatCategory("dark gift feat")).toBe("Dark Gift")
    expect(isOriginSelectableCategory("Dark Gift")).toBe(true)
    expect(isOriginSelectableCategory("Origin")).toBe(true)
    expect(isOriginSelectableCategory("Planar Pact")).toBe(false)
  })

  it("allows Dark Gift feats in Origin slots and blocks them from General milestones", () => {
    const darkGift = {
      id: "feat_aberrant",
      name: "Aberrant Anatomy",
      category: "Dark Gift",
      level_requirement: null,
    } as unknown as Feat
    const ctx: FeatSlotContext = {
      totalLevel: 1,
      classIds: [],
      feats: [darkGift],
      ownedFeatIds: [],
      speciesId: null,
      backgroundId: null,
    }
    expect(isFeatEligibleForCategories(darkGift, ["Origin"], 1, ctx)).toBe(true)
    expect(isFeatEligibleForCategories(darkGift, ["Dark Gift"], 1, ctx)).toBe(true)
    expect(
      isFeatEligibleForCategories(darkGift, ["General"], 4, { ...ctx, totalLevel: 4 }),
    ).toBe(false)
  })

  it("reclassifies Ravenloft Dark Gifts mis-tagged as Planar Pact", () => {
    const inferred = inferFeatImportFields({
      name: "Aberrant Anatomy",
      description: "Exposure to alien horrors like those of the Far Realm has warped your physical form.",
      prerequisite: "Ravenloft Campaign",
      category: "Planar Pact",
    })
    expect(inferred.category).toBe("Dark Gift")
  })

  it("keeps true Planar Pact feats as Planar Pact", () => {
    const inferred = inferFeatImportFields({
      name: "Fey Pact",
      description: "Planar Pact Feat (Prerequisite: Can't Have Another Planar Pact Feat)",
      prerequisite: "Can't Have Another Planar Pact Feat",
      category: "General",
    })
    expect(inferred.category).toBe("Planar Pact")
  })
})

describe("Planescape + Ravenloft feat presets", () => {
  it("wires Scion follow-up and Ravenloft Origin presets", () => {
    const agent = enrichCustomFeatRow({
      name: "Agent of Order",
      source: PHB,
      description: "Stasis Strike",
    })
    expect(chars(agent).some((c) => c.type === "ability_scores")).toBe(true)
    expect(chars(agent).some((c) => c.type === "uses")).toBe(true)

    const sharp = enrichCustomFeatRow({
      name: "Sharp Eye",
      source: PHB,
      description: "Search or Study",
    })
    expect(chars(sharp).some((c) => c.type === "uses")).toBe(true)

    const aberrant = enrichCustomFeatRow({
      name: "Aberrant Anatomy",
      source: "Van Richten's Guide",
      description: "Blindsight",
      category: "Dark Gift",
    })
    expect(chars(aberrant).some((c) => c.type === "vision")).toBe(true)
    expect(chars(aberrant).find((c) => c.type === "vision")).toMatchObject({
      visionType: "blindsight",
      rangeFeet: 15,
    })

    const touch = enrichCustomFeatRow({
      name: "Touch of Death",
      source: "Van Richten's Guide",
      description: "Pull of the Grave",
      category: "Dark Gift",
    })
    const fx = ((touch.linked_modifiers as { activation?: { effects?: { checkCategory?: string }[] } }[]) ?? [])
      .flatMap((m) => m.activation?.effects ?? [])
    expect(fx.some((e) => e.checkCategory === "death_save")).toBe(true)
  })
})
