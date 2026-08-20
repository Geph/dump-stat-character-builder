import { describe, expect, it } from "vitest"
import { getCustomAbilityFeatPickSlots } from "@/lib/builder/class-feat-features"
import { enrichManipulateMagicAbility } from "@/lib/compendium/enrich-manipulate-magic"
import { GRANT_FEAT_CATALOG_ID } from "@/lib/compendium/grant-feat-catalog"
import type { CustomAbility, DndClass } from "@/lib/types"

const occultist = {
  id: "class_occultist",
  name: "Occultist",
  features: [],
} as unknown as DndClass

function manipulateMagicAbility(): CustomAbility {
  return enrichManipulateMagicAbility({
    id: "ability_manipulate",
    name: "Manipulate Magic",
    description:
      "<p>You learn one Metamagic option of your choice from the Sorcerer class.</p>",
    ability_role: "knack",
    level_requirement: 5,
    linked_modifiers: [],
  } as unknown as CustomAbility)
}

describe("getCustomAbilityFeatPickSlots", () => {
  it("offers a Metamagic catalog pick after Manipulate Magic is selected", () => {
    const slots = getCustomAbilityFeatPickSlots({
      classLevels: [{ classId: occultist.id, level: 5 }],
      classes: [occultist],
      catalog: [
        { id: GRANT_FEAT_CATALOG_ID, name: "Grant Feat", group: "Other", characteristics: [] },
      ],
      customAbilities: [manipulateMagicAbility()],
      featureChoicePicks: {
        [`${occultist.id}:L2:Occult Rites`]: ["Manipulate Magic"],
      },
    })

    expect(slots).toHaveLength(1)
    expect(slots[0]?.featCategories).toEqual(["Metamagic"])
    expect(slots[0]?.feature.name).toBe("Manipulate Magic")
    expect(slots[0]?.key).toContain("Manipulate Magic")
  })

  it("does not offer the pick until the rite is selected", () => {
    const slots = getCustomAbilityFeatPickSlots({
      classLevels: [{ classId: occultist.id, level: 5 }],
      classes: [occultist],
      catalog: [],
      customAbilities: [manipulateMagicAbility()],
      featureChoicePicks: {},
    })
    expect(slots).toEqual([])
  })
})
