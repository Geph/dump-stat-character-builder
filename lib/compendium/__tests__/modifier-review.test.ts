import { describe, expect, it } from "vitest"
import {
  featureNeedsModifierReview,
  isStructuralOrNarrativeFeature,
  markFeatureModifierReviewForPersist,
} from "@/lib/compendium/modifier-review"
import type { Feature } from "@/lib/types"

function feature(partial: Partial<Feature> & Pick<Feature, "name" | "level">): Feature {
  return {
    description: "",
    ...partial,
  }
}

describe("structural / narrative modifier review", () => {
  it("treats subclass unlock and later feature grants as structural", () => {
    expect(
      isStructuralOrNarrativeFeature(
        feature({ name: "Martial Archetype", level: 3, description: "Choose a Martial Archetype." }),
      ),
    ).toBe(true)
    expect(
      isStructuralOrNarrativeFeature(
        feature({ name: "Psionic Archetype", level: 1, description: "Choose a Psionic Archetype." }),
      ),
    ).toBe(true)
    expect(
      isStructuralOrNarrativeFeature(
        feature({
          name: "Psionic Archetype Feature",
          level: 6,
          description: "Gain a feature from your chosen Psionic Archetype.",
        }),
      ),
    ).toBe(true)
    expect(
      isStructuralOrNarrativeFeature(feature({ name: "Subclass Feature", level: 6, description: "" })),
    ).toBe(true)
  })

  it("does not flag structural features for modifier review even when pending was set", () => {
    const pending = {
      ...feature({ name: "Martial Archetype", level: 3, description: "Choose a Martial Archetype." }),
      modifierReviewPending: true,
    }
    expect(featureNeedsModifierReview(pending)).toBe(false)
  })

  it("does not stamp modifierReviewPending on structural features at persist", () => {
    const next = markFeatureModifierReviewForPersist(
      feature({ name: "Psionic Archetype Feature", level: 10, description: "Gain a feature." }),
    )
    expect(next.modifierReviewPending).toBeUndefined()
  })

  it("still flags unwired mechanical features", () => {
    const next = markFeatureModifierReviewForPersist(
      feature({ name: "Danger Sense", level: 2, description: "Advantage on Dexterity saves." }),
    )
    expect(next.modifierReviewPending).toBe(true)
    expect(featureNeedsModifierReview(next)).toBe(true)
  })
})
