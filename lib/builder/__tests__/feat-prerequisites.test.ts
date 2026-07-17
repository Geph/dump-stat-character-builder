import { describe, expect, it } from "vitest"
import {
  buildOwnedFeatIds,
  isFeatEligibleForCategories,
  type FeatSlotContext,
} from "@/lib/builder/feat-selection"
import type { Feat } from "@/lib/types"
import {
  enrichFeatRowWithPrerequisites,
  inferOtherPrerequisiteRules,
  parseFeatPrerequisite,
  resolvePrerequisiteFeatIds,
} from "@/lib/import/resolve-feat-prerequisites"
import { parseBackgroundFeatGrantChoice, parseBackgroundFeatGrantChoiceCategory } from "@/lib/compendium/background-origin-feat"
import { normalizeBackgroundRow } from "@/lib/compendium/normalize-backgrounds"
import { getBackgroundFeatPickSlots } from "@/lib/builder/background-feat-options"
import { buildDefaultModifierCatalog } from "@/lib/compendium/modifier-catalog"

function feat(partial: Partial<Feat> & Pick<Feat, "id" | "name" | "category">): Feat {
  return {
    description: "",
    level_requirement: null,
    prerequisite: null,
    prerequisite_feat_ids: null,
    prerequisite_class_ids: null,
    prerequisite_species_ids: null,
    prerequisite_background_ids: null,
    linkedModifiers: null,
    modifierRefs: null,
    benefits: null,
    isChoice: false,
    choices: undefined,
    repeatable: false,
    source: "Test",
    creator_url: null,
    icon: null,
        ...partial,
  } as unknown as unknown as Feat
}

describe("parseFeatPrerequisite", () => {
  it("extracts level and prerequisite feat names", () => {
    expect(parseFeatPrerequisite("Level 4+, Infernal Pact Feat")).toEqual({
      levelRequirement: 4,
      prerequisiteFeatNames: ["Infernal Pact"],
    })
  })

  it("parses ordinal Level phrasing and strips plane parentheticals", () => {
    expect(
      parseFeatPrerequisite("4th Level, Scion of the Outer Planes (Lawful Outer Plane) Feat"),
    ).toEqual({
      levelRequirement: 4,
      prerequisiteFeatNames: ["Scion of the Outer Planes"],
    })
  })

  it("ignores exclusive-category phrasing", () => {
    expect(parseFeatPrerequisite("Can't Have Another Planar Pact Feat").prerequisiteFeatNames).toEqual(
      [],
    )
  })

  it("models campaign gates as other prerequisites, not feat names", () => {
    expect(parseFeatPrerequisite("Planescape Campaign").prerequisiteFeatNames).toEqual([])
    expect(inferOtherPrerequisiteRules("Prerequisite: Planescape Campaign")).toEqual([
      { category: "other", value: "Planescape Campaign" },
    ])
  })
})

describe("resolvePrerequisiteFeatIds", () => {
  it("resolves feat names to ids", () => {
    const ids = resolvePrerequisiteFeatIds(["Infernal Pact"], [
      { id: "infernal-pact", name: "Infernal Pact" },
    ])
    expect(ids).toEqual(["infernal-pact"])
  })
})

describe("enrichFeatRowWithPrerequisites", () => {
  it("fills level_requirement and prerequisite_feat_ids on import rows", () => {
    const enriched = enrichFeatRowWithPrerequisites(
      {
        name: "Infernal Bulwark",
        prerequisite: "Level 4+, Infernal Pact Feat",
        category: "General",
      },
      [{ id: "infernal-pact", name: "Infernal Pact" }],
    )
    expect((enriched as Record<string, unknown>).level_requirement).toBe(4)
    expect((enriched as Record<string, unknown>).prerequisite_feat_ids).toEqual(["infernal-pact"])
  })

  it("adds campaign gates to prerequisite_rules", () => {
    const enriched = enrichFeatRowWithPrerequisites(
      {
        name: "Scion of the Outer Planes",
        prerequisite: "Planescape Campaign",
        category: "Origin",
      },
      [],
    )
    expect((enriched as Record<string, unknown>).prerequisite_rules).toEqual([
      { category: "other", value: "Planescape Campaign" },
    ])
    expect((enriched as Record<string, unknown>).prerequisite_feat_ids).toEqual([])
  })
})

describe("Planar Pact feat prerequisites", () => {
  const infernalPact = feat({
    id: "infernal-pact",
    name: "Infernal Pact",
    category: "Planar Pact",
    level_requirement: 1,
  })
  const celestialPact = feat({
    id: "celestial-pact",
    name: "Celestial Pact",
    category: "Planar Pact",
    level_requirement: 1,
  })
  const infernalBulwark = feat({
    id: "infernal-bulwark",
    name: "Infernal Bulwark",
    category: "General",
    level_requirement: 4,
    prerequisite_feat_ids: ["infernal-pact"],
  })
  const allFeats = [infernalPact, celestialPact, infernalBulwark]

  const baseContext: FeatSlotContext = {
    totalLevel: 5,
    classIds: ["warlock"],
    feats: allFeats,
    ownedFeatIds: [],
    speciesId: null,
    backgroundId: "pact-seeker",
  }

  it("allows only one Planar Pact feat", () => {
    const owned = buildOwnedFeatIds({
      featureChoicePicks: { "background:bg:mods": ["infernal-pact"] },
      pickSlotKeys: ["background:bg:mods"],
      grantedFeatIds: [],
    })
    expect(
      isFeatEligibleForCategories(celestialPact, ["Planar Pact"], 1, {
        ...baseContext,
        ownedFeatIds: owned,
      }),
    ).toBe(false)
  })

  it("requires prerequisite feat for general follow-on feats", () => {
    expect(
      isFeatEligibleForCategories(infernalBulwark, ["General"], 4, {
        ...baseContext,
        ownedFeatIds: [],
      }),
    ).toBe(false)

    expect(
      isFeatEligibleForCategories(infernalBulwark, ["General"], 4, {
        ...baseContext,
        ownedFeatIds: ["infernal-pact"],
      }),
    ).toBe(true)
  })
})

describe("background Planar Pact grant wiring", () => {
  it("parses choose-one feat grant text", () => {
    expect(parseBackgroundFeatGrantChoiceCategory("Choose one Planar Pact feat")).toBe("Planar Pact")
  })

  it("parses Dark Gift of-your-choice and named-or-Dark-Gift phrasing", () => {
    expect(parseBackgroundFeatGrantChoiceCategory("A Dark Gift feat of your choice")).toBe(
      "Dark Gift",
    )
    expect(parseBackgroundFeatGrantChoiceCategory("Choose one Dark Gift feat")).toBe("Dark Gift")
    expect(parseBackgroundFeatGrantChoice("Survivor or a Dark Gift feat of your choice")).toEqual({
      category: "Dark Gift",
      alsoFeatNames: ["Survivor"],
    })
    expect(parseBackgroundFeatGrantChoice("Sharp Eye or a Dark Gift feat of your choice")).toEqual({
      category: "Dark Gift",
      alsoFeatNames: ["Sharp Eye"],
    })
  })

  it("creates a background feat pick slot from imported background data", () => {
    const normalized = normalizeBackgroundRow({
      id: "pact-seeker",
      name: "Pact Seeker",
      feat_granted: "Choose one Planar Pact feat",
      feature: {
        name: "Pact Seeker",
        description: "You sought an extraplanar entity.",
      },
    })
    const slots = getBackgroundFeatPickSlots(
      normalized as unknown as import("@/lib/types").Background,
      buildDefaultModifierCatalog(),
    )
    expect(slots).toHaveLength(1)
    expect(slots[0]?.featCategories).toEqual(["Planar Pact"])
  })

  it("wires Mist Wanderer Dark Gift and Haunted One Survivor-or-Dark-Gift", () => {
    const mist = normalizeBackgroundRow({
      id: "mist-wanderer",
      name: "Mist Wanderer",
      feat_granted: "A Dark Gift feat of your choice",
      ability_bonuses: { dexterity: 0, constitution: 0, wisdom: 0 },
      feature: { name: "Wanderer", description: "You walk the Mists." },
    })
    const mistSlots = getBackgroundFeatPickSlots(
      mist as unknown as import("@/lib/types").Background,
      buildDefaultModifierCatalog(),
    )
    expect(mist.feat_granted).toBeNull()
    expect(mistSlots[0]?.featCategories).toEqual(["Dark Gift"])

    const haunted = normalizeBackgroundRow({
      id: "haunted-one",
      name: "Haunted One",
      feat_granted: "Survivor or a Dark Gift feat of your choice",
      ability_bonuses: { constitution: 0, wisdom: 0, charisma: 0 },
      feature: { name: "Haunted", description: "You persist." },
    })
    const hauntedSlots = getBackgroundFeatPickSlots(
      haunted as unknown as import("@/lib/types").Background,
      buildDefaultModifierCatalog(),
    )
    expect(haunted.feat_granted).toBeNull()
    expect(hauntedSlots[0]?.featCategories).toEqual(["Dark Gift"])
    expect(hauntedSlots[0]?.alsoFeatNames).toEqual(["Survivor"])
  })
})
