import { describe, expect, it } from "vitest"
import { collectClassFeatureModifierPlayerChoiceSlots } from "@/lib/builder/modifier-player-choices"
import type { DndClass, Feature } from "@/lib/types"

describe("unlocksAtClassLevel on SpellsKnownChoiceGrant", () => {
  const arcanumFeature = {
    level: 11,
    name: "Innate Arcanum",
    linkedModifiers: [
      {
        instanceId: "modinst_innate_arcanum",
        catalogRefId: "cat_feat_spells_known",
        characteristics: [
          {
            id: "spells_known_arcanum",
            type: "spells_known",
            choiceGrants: [
              { level: 6, count: 1, unlocksAtClassLevel: 11 },
              { level: 7, count: 1, unlocksAtClassLevel: 13 },
            ],
            spellListClassOptions: ["Alternate Sorcerer"],
            label: "Innate Arcanum",
          },
        ],
      },
    ],
  }

  const cls = {
    id: "alt-sorc",
    name: "Alternate Sorcerer",
    features: [arcanumFeature],
  } as unknown as DndClass

  it("hides grants above the current class level", () => {
    const at11 = collectClassFeatureModifierPlayerChoiceSlots({
      classLevels: [{ classId: "alt-sorc", level: 11 }],
      classes: [cls],
      subclasses: [],
      subclassByClassId: {},
      featureChoicePicks: {},
      catalog: [],
    })
    expect(at11.filter((slot) => slot.spellLevel === 6)).toHaveLength(1)
    expect(at11.filter((slot) => slot.spellLevel === 7)).toHaveLength(0)

    const at13 = collectClassFeatureModifierPlayerChoiceSlots({
      classLevels: [{ classId: "alt-sorc", level: 13 }],
      classes: [cls],
      subclasses: [],
      subclassByClassId: {},
      featureChoicePicks: {},
      catalog: [],
    })
    expect(at13.filter((slot) => slot.spellLevel === 7)).toHaveLength(1)
  })
})
