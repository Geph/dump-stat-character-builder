import { describe, expect, it } from "vitest"
import { enrichClassFeatureWithModifierPresets } from "@/lib/compendium/enrich-srd-class-features"
import { grantCreaturesFromLinkedModifiers } from "@/lib/compendium/grant-creature-catalog"
import type { Feature } from "@/lib/types"

function enrich(className: string, feature: Partial<Feature>, subclassName: string | null = null) {
  return enrichClassFeatureWithModifierPresets(
    className,
    { name: "", description: "", level: 1, ...feature } as Feature,
    subclassName,
    { skipMechanicalDetection: true },
  )
}

describe("Faithful Steed preset", () => {
  const feature = enrich("Paladin", {
    name: "Faithful Steed",
    level: 5,
    description: "You can call on the aid of an otherworldly steed.",
  })

  it("grants the Otherworldly Steed companion", () => {
    const grants = grantCreaturesFromLinkedModifiers([], feature.linkedModifiers)
    expect(grants).toHaveLength(1)
    expect(grants[0].creatureNames).toEqual(["Otherworldly Steed"])
  })

  it("keeps Find Steed always prepared with a free cast per Long Rest", () => {
    const spellsKnown = (feature.linkedModifiers ?? [])
      .flatMap((instance) => instance.characteristics ?? [])
      .find((mod) => mod.type === "spells_known")
    expect(spellsKnown).toMatchObject({
      alwaysPrepared: true,
      freeCastPerLongRest: [{ spellName: "Find Steed", count: 1 }],
    })
  })
})

describe("Primal Companion preset (Beast Master)", () => {
  const feature = enrich(
    "Ranger",
    {
      name: "Primal Companion",
      level: 3,
      description: "You magically summon a primal beast.",
    },
    "Beast Master",
  )

  it("wires a grant_creature choice across the three primal beasts", () => {
    const grants = grantCreaturesFromLinkedModifiers([], feature.linkedModifiers)
    expect(grants).toHaveLength(1)
    expect(grants[0].choiceOptions).toEqual([
      "Beast of the Land",
      "Beast of the Sea",
      "Beast of the Sky",
    ])
    expect(grants[0].count).toBe(1)
  })
})
