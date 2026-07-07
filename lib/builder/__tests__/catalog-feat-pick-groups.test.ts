import { describe, expect, it } from "vitest"
import type { FeatPickSlot } from "@/lib/builder/class-feat-features"
import {
  distributeCatalogFeatPicksToSlots,
  groupCatalogFeatPickSlots,
  readCatalogFeatPicksFromSlots,
  stripFeatPickSlotOrdinalLabel,
} from "@/lib/builder/catalog-feat-pick-groups"

function mockSlot(overrides: Partial<FeatPickSlot> & Pick<FeatPickSlot, "key" | "label">): FeatPickSlot {
  return {
    classId: "warlock",
    className: "Warlock",
    feature: { level: 2, name: "Eldritch Invocations", description: "" },
    milestoneLevel: 2,
    featCategories: ["Eldritch Invocation"],
    ...overrides,
  }
}

describe("catalog feat pick groups", () => {
  it("strips ordinal suffixes from slot labels", () => {
    expect(stripFeatPickSlotOrdinalLabel("Gain a Feat (Eldritch Invocation) (2/5)")).toBe(
      "Gain a Feat (Eldritch Invocation)",
    )
  })

  it("groups scaled Eldritch Invocation slots into one picker", () => {
    const slots = [
      mockSlot({ key: "a:0", label: "Gain a Feat (Eldritch Invocation) (1/3)" }),
      mockSlot({ key: "a:1", label: "Gain a Feat (Eldritch Invocation) (2/3)" }),
      mockSlot({ key: "a:2", label: "Gain a Feat (Eldritch Invocation) (3/3)" }),
      mockSlot({
        key: "general",
        label: "General Feat (Level 4)",
        featCategories: ["General"],
      }),
    ]

    const { catalogGroups, regularSlots } = groupCatalogFeatPickSlots(slots)
    expect(catalogGroups).toHaveLength(1)
    expect(catalogGroups[0].slots).toHaveLength(3)
    expect(catalogGroups[0].label).toBe("Gain a Feat (Eldritch Invocation)")
    expect(regularSlots).toHaveLength(1)
    expect(regularSlots[0].key).toBe("general")
  })

  it("reads and distributes catalog picks by slot order", () => {
    const slots = [
      mockSlot({ key: "a:0", label: "Gain a Feat (Eldritch Invocation) (1/2)" }),
      mockSlot({ key: "a:1", label: "Gain a Feat (Eldritch Invocation) (2/2)" }),
    ]
    const picks = {
      "a:0": ["syscat:00000000-0000-4000-8000-000000000003:cat_invocation_0"],
      "a:1": ["syscat:00000000-0000-4000-8000-000000000003:cat_invocation_1"],
    }

    expect(readCatalogFeatPicksFromSlots(slots, picks)).toEqual([
      "syscat:00000000-0000-4000-8000-000000000003:cat_invocation_0",
      "syscat:00000000-0000-4000-8000-000000000003:cat_invocation_1",
    ])

    expect(
      distributeCatalogFeatPicksToSlots(slots, [
        "syscat:00000000-0000-4000-8000-000000000003:cat_invocation_2",
      ]),
    ).toEqual({
      "a:0": ["syscat:00000000-0000-4000-8000-000000000003:cat_invocation_2"],
      "a:1": [],
    })
  })
})
