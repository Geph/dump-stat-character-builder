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

  it("reclassifies Planescape Scion feats mis-tagged as Planar Pact to General", () => {
    const inferred = inferFeatImportFields({
      name: "Scion of the Outer Planes",
      description: "Your connection to an Outer Plane infuses you with the energy there.",
      prerequisite: "Planescape Campaign",
      category: "Planar Pact",
    })
    expect(inferred.category).toBe("General")

    const followUp = inferFeatImportFields({
      name: "Agent of Order",
      description: "You can channel cosmic forces of order.",
      prerequisite: "4th Level, Scion of the Outer Planes (Lawful Outer Plane) Feat",
      category: "Planar Pact",
    })
    expect(followUp.category).toBe("General")
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
  it("wires Scion choice options with resistance and cantrips", () => {
    const scion = enrichCustomFeatRow({
      name: "Scion of the Outer Planes",
      source: PHB,
      description: "Planar Infusion",
    })
    expect(scion.isChoice).toBe(true)
    const options = (scion.choices as { options?: { name: string; linkedModifiers?: unknown[] }[] })
      ?.options
    expect(options?.length).toBe(5)
    const lawful = options?.find((o) => o.name === "Lawful Outer Plane")
    const lawfulChars = ((lawful?.linkedModifiers ?? []) as {
      characteristics?: { type: string; damageTypes?: string[]; spells?: { spellId: string }[] }[]
    }[]).flatMap((m) => m.characteristics ?? [])
    expect(lawfulChars.some((c) => c.type === "damage_resistance" && c.damageTypes?.includes("Force"))).toBe(
      true,
    )
    expect(lawfulChars.some((c) => c.type === "spells_known")).toBe(true)
  })

  it("wires Scion follow-up and Ravenloft Origin/Dark Gift presets", () => {
    const agent = enrichCustomFeatRow({
      name: "Agent of Order",
      source: PHB,
      description: "Stasis Strike",
    })
    expect(chars(agent).some((c) => c.type === "ability_scores")).toBe(true)
    expect(chars(agent).some((c) => c.type === "uses")).toBe(true)

    const cohort = enrichCustomFeatRow({
      name: "Cohort of Chaos",
      source: PHB,
      description: "Chaotic Flare",
    })
    expect(chars(cohort).some((c) => c.type === "ability_scores")).toBe(true)

    const wanderer = enrichCustomFeatRow({
      name: "Planar Wanderer",
      source: PHB,
      description: "Planar Adaptation",
    })
    expect(chars(wanderer).some((c) => c.type === "damage_resistance")).toBe(true)

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

    const living = enrichCustomFeatRow({
      name: "Living Shadow",
      source: "Van Richten's Guide",
      description: "Grasping Shadow",
      category: "Dark Gift",
    })
    expect(chars(living).some((c) => c.type === "spells_known")).toBe(true)
    expect(chars(living).some((c) => c.type === "uses")).toBe(true)

    const touch = enrichCustomFeatRow({
      name: "Touch of Death",
      source: "Van Richten's Guide",
      description: "Pull of the Grave",
      category: "Dark Gift",
    })
    const linked = (touch.linked_modifiers ?? []) as {
      activation?: { effects?: { checkCategory?: string }[] }
    }[]
    const fx = linked.flatMap((m) => m.activation?.effects ?? [])
    expect(fx.some((e) => e.checkCategory === "death_save")).toBe(true)
  })
})
