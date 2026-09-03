import { describe, expect, it } from "vitest"
import {
  defaultSheetPlayState,
  normalizeSheetPlayState,
  type CharacterSheetPlayState,
} from "@/lib/character/sheet-play-state"

describe("sheet play-state resource die overrides", () => {
  it("defaults mutable resource die state to an empty map", () => {
    expect(defaultSheetPlayState().resourceDieSidesByKey).toEqual({})
    expect(defaultSheetPlayState().sheetToggleNotes).toEqual({})
    expect(defaultSheetPlayState().sheetToggleWeaponIds).toEqual({})
    expect(defaultSheetPlayState().mutationDie).toBeNull()
    expect(defaultSheetPlayState().fleshWarpAllyBenefitCounts).toEqual({})
    expect(defaultSheetPlayState().illusionTokens).toEqual([])
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

  it("normalizes persisted reminder-toggle notes", () => {
    const state = normalizeSheetPlayState({
      sheetToggleNotes: {
        mind_rider_active: "  Friendly owl  ",
        empty: "   ",
      },
    })
    expect(state.sheetToggleNotes).toEqual({ mind_rider_active: "Friendly owl" })
  })

  it("normalizes mutation die, ally benefits, and illusion tokens", () => {
    const state = normalizeSheetPlayState({
      mutationDie: {
        sides: 6,
        remaining: 1,
        autoApplyStrength: true,
        targetLabel: "Ally",
      },
      fleshWarpAllyBenefitCounts: { Ally: 2 },
      illusionTokens: [
        {
          id: "tok1",
          kind: "projected_self",
          currentHp: 1,
          label: "Projected Self",
        },
      ],
    } as unknown as Partial<CharacterSheetPlayState>)
    expect(state.mutationDie).toMatchObject({
      sides: 6,
      remaining: 1,
      autoApplyStrength: true,
      targetLabel: "Ally",
    })
    expect(state.fleshWarpAllyBenefitCounts).toEqual({ Ally: 2 })
    expect(state.illusionTokens).toHaveLength(1)
    expect(state.illusionTokens[0]?.kind).toBe("projected_self")
  })
})
