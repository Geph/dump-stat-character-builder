import { describe, expect, it } from "vitest"
import { normalizeCharacteristics } from "@/lib/compendium/characteristic-modifiers"
import {
  formatSpecialAttackDamageTypes,
  specialAttackChoosesDamageType,
} from "@/lib/compendium/special-attack-damage-type"

describe("special attack damage type choice", () => {
  it("formats a pick-one pair as or", () => {
    expect(formatSpecialAttackDamageTypes(["Necrotic", "Radiant"], true)).toBe(
      "Necrotic or Radiant",
    )
  })

  it("keeps a single type unchanged", () => {
    expect(formatSpecialAttackDamageTypes(["Fire"], true)).toBe("Fire")
  })

  it("only treats multi-type attacks as a choice when flagged", () => {
    expect(
      specialAttackChoosesDamageType({
        chooseDamageType: true,
        damageTypes: ["Necrotic", "Radiant"],
      }),
    ).toBe(true)
    expect(
      specialAttackChoosesDamageType({
        chooseDamageType: false,
        damageTypes: ["Fire", "Cold"],
      }),
    ).toBe(false)
  })

  it("normalizes chooseDamageType on stored special_attack rows", () => {
    const [attack] = normalizeCharacteristics(
      [
        {
          id: "mod_reprisal",
          type: "special_attack",
          attackName: "Reprisal",
          properties: [],
          damageTypes: ["Necrotic", "Radiant"],
          chooseDamageType: true,
          damageDiceCount: 1,
          damageDieType: "d6",
        },
      ],
      null,
    )
    expect(attack).toMatchObject({
      type: "special_attack",
      chooseDamageType: true,
      icon: "crossed-swords",
    })
  })
})
