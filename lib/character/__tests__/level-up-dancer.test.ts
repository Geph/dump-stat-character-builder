import { describe, expect, it } from "vitest"
import { attachClassDetails } from "@/lib/character/character-classes"
import { buildLevelUpPlan } from "@/lib/character/level-up-plan"
import type { DndClass, Feature, Subclass } from "@/lib/types"

function feature(name: string, level: number, extra: Partial<Feature> = {}): Feature {
  return {
    name,
    level,
    description: `${name} at ${level}`,
    ...extra,
  } as Feature
}

describe("buildLevelUpPlan — Dancer Honeyed Words", () => {
  it("surfaces two language choices from a stored Courtesan row without linked modifiers", () => {
    const dancer = {
      id: "dancer",
      name: "Dancer",
      features: [feature("Dance", 2)],
    } as DndClass
    const courtesan = {
      id: "courtesan",
      class_id: "dancer",
      name: "Courtesan",
      features: [
        {
          name: "Honeyed Words",
          level: 3,
          description: "You know two languages of your choice.",
        },
      ],
    } as Subclass
    const [detail] = attachClassDetails(
      [{ class_id: "dancer", level: 2, subclass_id: "courtesan", order: 0 }],
      [dancer],
      [courtesan],
    )
    const plan = buildLevelUpPlan({
      entry: detail,
      subclasses: [courtesan],
      currentTotalLevel: 2,
      featureChoicePicks: {},
    })
    const languageStep = plan?.steps.find(
      (step) => step.kind === "modifier_choice" && step.slot.kind === "language",
    )
    expect(languageStep).toMatchObject({
      kind: "modifier_choice",
      required: 2,
    })
    if (languageStep?.kind === "modifier_choice") {
      expect(languageStep.slot.maxCount).toBe(2)
      expect(languageStep.slot.options?.length ?? 0).toBeGreaterThan(1)
    }
  })
})
