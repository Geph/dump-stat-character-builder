import { describe, expect, it } from "vitest"
import {
  buildCharacterSaveSnapshot,
  computeDerivedCharacter,
} from "@/lib/character/compute-derived"
import { barbarianShieldFixture } from "@/lib/character/__tests__/fixtures"

/**
 * Documents the old save path bug: recomputing from stored base scores without
 * modifier engine loses Unarmored Defense AC.
 */
describe("legacy save path regression", () => {
  it("stored snapshot fields diverge from preview when AC is not derived", () => {
    const inputs = barbarianShieldFixture()
    const preview = computeDerivedCharacter(inputs)
    const snapshot = buildCharacterSaveSnapshot(inputs, preview)

    const dexMod = Math.floor((snapshot.dexterity - 10) / 2)
    const legacySavedAc = 10 + dexMod + 2 // calculateArmorClass without Unarmored Defense

    expect(preview.armorClass).toBe(17)
    expect(legacySavedAc).toBe(14)
    expect(snapshot.armor_class).toBe(preview.armorClass)
  })
})
