import { describe, expect, it } from "vitest"
import {
  isNecromancerListSpell,
  NECROMANCER_SPELLS_BY_LEVEL,
} from "@/lib/compendium/necromancer-spell-list"

describe("isNecromancerListSpell", () => {
  it("matches official table names and possessive catalog variants", () => {
    expect(isNecromancerListSpell("Acid Splash")).toBe(true)
    expect(isNecromancerListSpell("Spark of Life")).toBe(true)
    expect(isNecromancerListSpell("Eye of Anubis")).toBe(true)
    expect(isNecromancerListSpell("Hideous Laughter")).toBe(true)
    expect(isNecromancerListSpell("Tasha's Hideous Laughter")).toBe(true)
    expect(isNecromancerListSpell("Tasha’s Hideous Laughter")).toBe(true)
    expect(isNecromancerListSpell("Secret Chest")).toBe(true)
    expect(isNecromancerListSpell("Leomund's Secret Chest")).toBe(true)
  })

  it("rejects spells that are not on the Necromancer list", () => {
    expect(isNecromancerListSpell("Fireball")).toBe(false)
    expect(isNecromancerListSpell("Cure Wounds")).toBe(false)
    expect(isNecromancerListSpell("Blood Print")).toBe(false)
  })

  it("includes the user's cantrip table plus first-level staples", () => {
    expect(NECROMANCER_SPELLS_BY_LEVEL[0]).toEqual(
      expect.arrayContaining([
        "Acid Splash",
        "Cheat",
        "Chill Touch",
        "Concealed Shot",
        "Cryptogram",
        "Eldritch Orb",
        "Lightning Surge",
        "Minor Lifesteal",
        "Sulfuric Smoke",
        "True Strike",
      ]),
    )
    expect(NECROMANCER_SPELLS_BY_LEVEL[1]).toEqual(
      expect.arrayContaining([
        "Alarm",
        "Exhume",
        "Gahoul's Shrieking Skull",
        "Mage Armor",
        "Ray of Sickness",
      ]),
    )
  })
})
