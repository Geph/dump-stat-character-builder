import { describe, expect, it } from "vitest"
import {
  characterHasFightingStyleAccess,
  levelUpFeatCategories,
} from "@/lib/builder/fighting-style-access"
import type { DndClass, Feat, Feature } from "@/lib/types"

function feature(name: string, level: number, extra: Partial<Feature> = {}): Feature {
  return { name, level, description: name, ...extra } as Feature
}

describe("characterHasFightingStyleAccess", () => {
  it("is true when a class feature named Fighting Style is already unlocked", () => {
    const fighter = {
      id: "fighter",
      name: "Fighter",
      features: [feature("Fighting Style", 1)],
    } as DndClass
    expect(
      characterHasFightingStyleAccess({
        classLevels: [{ classId: "fighter", level: 1 }],
        classes: [fighter],
      }),
    ).toBe(true)
  })

  it("is false for classes that have not unlocked a Fighting Style feature", () => {
    const wizard = {
      id: "wizard",
      name: "Wizard",
      features: [feature("Spellcasting", 1), feature("Ability Score Improvement", 4)],
    } as DndClass
    expect(
      characterHasFightingStyleAccess({
        classLevels: [{ classId: "wizard", level: 4 }],
        classes: [wizard],
      }),
    ).toBe(false)
  })

  it("is true when the character already owns a Fighting Style feat", () => {
    const defense = { id: "feat_defense", name: "Defense", category: "Fighting Style" } as Feat
    expect(
      characterHasFightingStyleAccess({
        ownedFeatIds: ["feat_defense"],
        feats: [defense],
      }),
    ).toBe(true)
  })
})

describe("levelUpFeatCategories", () => {
  it("offers General (and Origin via General) until Fighting Style access is unlocked", () => {
    expect(levelUpFeatCategories(false)).toEqual(["General"])
    expect(levelUpFeatCategories(true)).toEqual(["General", "Fighting Style"])
  })
})
