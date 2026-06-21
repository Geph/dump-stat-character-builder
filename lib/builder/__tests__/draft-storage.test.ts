import { describe, expect, it } from "vitest"
import {
  normalizeDraftClassLevels,
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
