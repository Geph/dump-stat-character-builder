import { describe, expect, it } from "vitest"
import {
  defaultSheetPlayState,
  normalizeSheetPlayState,
} from "@/lib/character/sheet-play-state"

describe("sheet play-state resource die overrides", () => {
  it("defaults mutable resource die state to an empty map", () => {
    expect(defaultSheetPlayState().resourceDieSidesByKey).toEqual({})
  })

  it("keeps valid die sides and drops malformed persisted values", () => {
    const state = normalizeSheetPlayState({
      resourceDieSidesByKey: {
        rampage_die: 8,
        fractional: 6.5,
        too_small: 1,
      },
    })
    expect(state.resourceDieSidesByKey).toEqual({ rampage_die: 8 })
  })
})
