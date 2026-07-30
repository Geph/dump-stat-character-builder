import { describe, expect, it } from "vitest"
import {
  applyFeatRecommendedClasses,
  PHB_FEAT_RECOMMENDED_CLASSES_BY_NAME,
  recommendedClassesForFeatName,
} from "@/lib/compendium/phb-feat-recommended-classes"
import { enrichFeatsList } from "@/lib/compendium/normalize-feats"

describe("PHB feat recommended classes", () => {
  it("maps Artificer recommendations onto shared feats", () => {
    expect(recommendedClassesForFeatName("Crossbow Expert")).toContain("Artificer")
    expect(recommendedClassesForFeatName("Medium Armor Master")).toEqual(["Artificer"])
    expect(recommendedClassesForFeatName("War Caster")).toContain("Artificer")
    expect(recommendedClassesForFeatName("Resilient")).toContain("Artificer")
  })

  it("maps Great Weapon Master to martial classes", () => {
    expect(recommendedClassesForFeatName("Great Weapon Master")).toEqual([
      "Barbarian",
      "Fighter",
      "Paladin",
    ])
  })

  it("collapses Resilient (Con)/(Wis) labels onto Resilient", () => {
    expect(recommendedClassesForFeatName("Resilient (Con)")).toEqual(
      PHB_FEAT_RECOMMENDED_CLASSES_BY_NAME.Resilient,
    )
    expect(recommendedClassesForFeatName("Resilient")).toContain("Monk")
    expect(recommendedClassesForFeatName("Resilient")).toContain("Wizard")
  })

  it("fills recommended_classes when unset and preserves custom lists", () => {
    const filled = applyFeatRecommendedClasses({ name: "War Caster" })
    expect(filled.recommended_classes).toEqual(
      PHB_FEAT_RECOMMENDED_CLASSES_BY_NAME["War Caster"],
    )

    const custom = applyFeatRecommendedClasses({
      name: "War Caster",
      recommended_classes: ["Artificer"],
    })
    expect(custom.recommended_classes).toEqual(["Artificer"])

    const cleared = applyFeatRecommendedClasses({
      name: "War Caster",
      recommended_classes: [],
    })
    expect(cleared.recommended_classes).toEqual([])
  })

  it("enriches imported PHB feat rows on load", () => {
    const [row] = enrichFeatsList([
      {
        name: "Fey Touched",
        source: "Player's Handbook",
        category: "Origin",
      },
    ])
    expect(row.recommended_classes).toEqual(
      PHB_FEAT_RECOMMENDED_CLASSES_BY_NAME["Fey Touched"],
    )
  })
})
