import { describe, expect, it } from "vitest"
import {
  migrateBuilderCurrentStepForVersion,
  migrateBuilderMaxStepForVersion,
  normalizeDraftClassLevels,
  normalizeBuilderStepId,
  type BuilderDraftSnapshot,
} from "@/lib/builder/draft-storage"

describe("builder draft class level migration", () => {
  it("falls back to legacy character.class_id when classLevels is missing", () => {
    const levels = normalizeDraftClassLevels({
      classLevels: undefined as never,
      character: {
        class_id: "class_fighter",
        level: 3,
      } as BuilderDraftSnapshot["character"],
    })

    expect(levels).toEqual([{ classId: "class_fighter", level: 3 }])
  })

  it("returns empty array when no class data exists", () => {
    expect(
      normalizeDraftClassLevels({
        classLevels: [],
        character: { class_id: null, level: 1 } as BuilderDraftSnapshot["character"],
      }),
    ).toEqual([])
  })
})

describe("normalizeBuilderStepId", () => {
  it("maps removed review step 7 to details", () => {
    expect(normalizeBuilderStepId(7)).toBe(6)
    expect(normalizeBuilderStepId(6)).toBe(6)
  })

  it("preserves Class Abilities step id 8", () => {
    expect(normalizeBuilderStepId(8)).toBe(8)
  })
})

describe("builder step-order draft migration", () => {
  it("moves a v1 draft parked on old Class Abilities to Origin first", () => {
    expect(migrateBuilderCurrentStepForVersion(8, 1)).toBe(2)
    expect(migrateBuilderCurrentStepForVersion(2, 1)).toBe(2)
  })

  it("preserves the furthest v1 workflow position reached", () => {
    expect(migrateBuilderMaxStepForVersion(8, 1)).toBe(2)
    expect(migrateBuilderMaxStepForVersion(2, 1)).toBe(8)
  })

  it("preserves semantic step ids for v2 drafts", () => {
    expect(migrateBuilderCurrentStepForVersion(8, 2)).toBe(8)
    expect(migrateBuilderMaxStepForVersion(2, 2)).toBe(2)
  })
})
