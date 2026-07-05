import { describe, expect, it } from "vitest"
import {
  shouldSkipWildcardPreset,
  wildcardPresetConflict,
} from "@/lib/import/resolve-wildcard-preset-conflict"

describe("resolve-wildcard-preset-conflict", () => {
  it("skips Cunning Strike preset when description uses Exploit Dice", () => {
    const description =
      "When you deal Sneak Attack damage, you can expend Sneak Attack dice to activate Exploits you know."
    expect(
      shouldSkipWildcardPreset("Cunning Strike", description, "*::Cunning Strike"),
    ).toBe(true)
    expect(wildcardPresetConflict("Cunning Strike", description, "*::Cunning Strike")).toMatchObject({
      presetKey: "*::Cunning Strike",
    })
  })

  it("does not skip Cunning Strike preset for SRD rider text", () => {
    const description =
      "When you use Sneak Attack, you can add Poison, Trip, or Withdraw for 1d6 each."
    expect(
      shouldSkipWildcardPreset("Cunning Strike", description, "*::Cunning Strike"),
    ).toBe(false)
  })
})
