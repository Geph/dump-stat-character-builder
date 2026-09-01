import { describe, expect, it } from "vitest"
import {
  applySpellHealingModifiers,
  formatSpellHealingNotes,
  looksLikeHealingSpell,
  parseSpellHealingExpression,
  spellHealingOutgoingBonus,
  spellHealingSelfOnHealOthers,
} from "@/lib/character/apply-heal-modifiers"
import { applyHealingReceivedModifiers } from "@/lib/character/apply-characteristic-runtime"
import type { SpellHealingModifierCharacteristic } from "@/lib/compendium/characteristic-modifiers"

const disciple: SpellHealingModifierCharacteristic = {
  id: "disciple",
  type: "spell_healing_modifier",
  bonusFlat: 2,
  bonusPerSpellLevel: 1,
}

const blessed: SpellHealingModifierCharacteristic = {
  id: "blessed",
  type: "spell_healing_modifier",
  selfHealFlat: 2,
  selfHealPerSpellLevel: 1,
}

describe("spell healing calculator", () => {
  it("adds Disciple of Life as 2 + spell level", () => {
    expect(spellHealingOutgoingBonus([disciple], 3)).toBe(5)
    expect(applySpellHealingModifiers(10, [disciple], { spellLevel: 3 }).amount).toBe(15)
  })

  it("does not apply Disciple of Life to cantrips", () => {
    expect(spellHealingOutgoingBonus([disciple], 0)).toBe(0)
  })

  it("computes Blessed Healer when healing others", () => {
    expect(spellHealingSelfOnHealOthers([blessed], 2)).toBe(4)
    expect(
      applySpellHealingModifiers(8, [blessed], { spellLevel: 2, healingOthers: true }).selfHeal,
    ).toBe(4)
  })

  it("parses Cure Wounds style prose", () => {
    expect(
      parseSpellHealingExpression(
        "The target regains a number of Hit Points equal to 2d8 plus your spellcasting ability modifier.",
      ),
    ).toEqual({
      diceCount: 2,
      dieSides: 8,
      plusSpellcastingMod: true,
      flatBonus: 0,
    })
    expect(looksLikeHealingSpell("Fireball deals 8d6 fire damage.")).toBe(false)
  })

  it("lists overlay notes for Life Domain", () => {
    expect(formatSpellHealingNotes([disciple, blessed], 1)).toEqual([
      "Disciple of Life: +3 HP when this spell restores hit points",
      "Blessed Healer: you regain 3 HP when this spell heals another creature",
    ])
  })

  it("still halves incoming magical healing after the outgoing bonus", () => {
    const outgoing = applySpellHealingModifiers(20, [disciple], { spellLevel: 1 }).amount
    expect(
      applyHealingReceivedModifiers(
        outgoing,
        [{ id: "anathema", type: "healing_received_modifier", multiplier: 0.5, magicalOnly: true }],
        { magical: true },
      ),
    ).toBe(11)
  })
})
