import { describe, expect, it } from "vitest"
import {
  buildOwnedFeatIds,
  isFeatEligibleForCategories,
  type FeatSlotContext,
} from "@/lib/builder/feat-selection"
import type { Feat } from "@/lib/types"
import {
  enrichFeatRowWithPrerequisites,
  parseFeatPrerequisite,
  resolvePrerequisiteFeatIds,
} from "@/lib/import/resolve-feat-prerequisites"
import { parseBackgroundFeatGrantChoiceCategory } from "@/lib/compendium/background-origin-feat"
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
    choices: null,
    repeatable: false,
    source: "Test",
    creator_url: null,
    icon: null,
    enabled: true,
    ...partial,
  }
}

describe("parseFeatPrerequisite", () => {
  it("extracts level and prerequisite feat names", () => {
    expect(parseFeatPrerequisite("Level 4+, Infernal Pact Feat")).toEqual({
      levelRequirement: 4,
      prerequisiteFeatNames: ["Infernal Pact"],
    })
  })

  it("ignores exclusive-category phrasing", () => {
    expect(parseFeatPrerequisite("Can't Have Another Planar Pact Feat").prerequisiteFeatNames).toEqual(
      [],
    )
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
    expect(enriched.level_requirement).toBe(4)
    expect(enriched.prerequisite_feat_ids).toEqual(["infernal-pact"])
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
})
