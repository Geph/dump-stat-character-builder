import { describe, expect, it } from "vitest"
import {
  classNeedsSubclass,
  isSubclassUnlockFeature,
  resolveSubclassUnlockLabel,
  resolveSubclassUnlockLevel,
} from "@/lib/builder/subclass-unlock"
import type { DndClass, Feature } from "@/lib/types"

function feature(partial: Partial<Feature> & Pick<Feature, "name" | "level">): Feature {
  return {
    description: "",
    isChoice: false,
    ...partial,
  }
}

describe("resolveSubclassUnlockLevel", () => {
  it("uses Psionic Archetype at level 1 for Psion", () => {
    const psion = {
      features: [
        feature({
          name: "Psionic Archetype",
          level: 1,
          description: "Choose a Psionic Archetype.",
        }),
        feature({
          name: "Psionic Archetype Feature",
          level: 3,
          description: "Gain a feature from your chosen Psionic Archetype.",
        }),
      ],
    } as Pick<DndClass, "features">

    expect(resolveSubclassUnlockLevel(psion)).toBe(1)
    expect(resolveSubclassUnlockLabel(psion)).toBe("Psionic Archetype")
    expect(isSubclassUnlockFeature(psion.features![0]!)).toBe(true)
    expect(isSubclassUnlockFeature(psion.features![1]!)).toBe(false)
    expect(classNeedsSubclass(1, 3, resolveSubclassUnlockLevel(psion))).toBe(true)
  })

  it("defaults to level 3 for SRD-style Martial Archetype", () => {
    const fighter = {
      features: [
        feature({ name: "Fighting Style", level: 1 }),
        feature({
          name: "Martial Archetype",
          level: 3,
          description: "Choose a Martial Archetype.",
        }),
      ],
    } as Pick<DndClass, "features">

    expect(resolveSubclassUnlockLevel(fighter)).toBe(3)
    expect(classNeedsSubclass(2, 2, resolveSubclassUnlockLevel(fighter))).toBe(false)
    expect(classNeedsSubclass(3, 2, resolveSubclassUnlockLevel(fighter))).toBe(true)
  })

  it("falls back to 3 when no unlock feature is present", () => {
    expect(resolveSubclassUnlockLevel({ features: [] })).toBe(3)
    expect(resolveSubclassUnlockLabel({ features: [] })).toBe("Subclass")
  })
})
