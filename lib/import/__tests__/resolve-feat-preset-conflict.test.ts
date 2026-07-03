import { describe, expect, it } from "vitest"
import { CUSTOM_FEAT_MODIFIER_PRESETS } from "@/lib/compendium/custom-feat-modifier-presets"
import { featPresetConflict, shouldSkipFeatPreset } from "@/lib/import/resolve-feat-preset-conflict"

describe("resolve-feat-preset-conflict", () => {
  it("skips Archery preset when description grants +1 ranged", () => {
    const description =
      "You gain a +1 bonus to attack rolls you make with ranged weapons. Your ranged weapon attacks ignore half cover."
    const preset = CUSTOM_FEAT_MODIFIER_PRESETS.Archery
    const conflict = featPresetConflict("Archery", description, preset)
    expect(conflict).toEqual({
      presetName: "Archery",
      reason: expect.stringContaining("+1"),
    })
    expect(shouldSkipFeatPreset("Archery", description, preset)).toBe(true)
  })
})
