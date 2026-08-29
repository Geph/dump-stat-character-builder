import { describe, expect, it } from "vitest"
import { normalizeCharacteristics } from "@/lib/compendium/characteristic-modifiers"
import {
  defaultSpecialAttackIcon,
  resolveSpecialAttackIcon,
} from "@/lib/compendium/special-attack-icons-defaults"

describe("special attack icon defaults", () => {
  it("uses rolling-bomb for the Alchemist Bomb attack", () => {
    expect(defaultSpecialAttackIcon({ attackName: "Bomb", attackVariant: "attack" })).toBe(
      "rolling-bomb",
    )
    expect(defaultSpecialAttackIcon({ attackName: "Bomb" })).toBe("rolling-bomb")
  })

  it("uses explosion-rays for Bomb explode", () => {
    expect(defaultSpecialAttackIcon({ attackName: "Bomb", attackVariant: "explode" })).toBe(
      "explosion-rays",
    )
  })

  it("maps other loaded class attacks", () => {
    expect(defaultSpecialAttackIcon({ attackName: "Nuclear Bomb" })).toBe("nuclear-bomb")
    expect(defaultSpecialAttackIcon({ attackName: "Armored Slam" })).toBe("mailed-fist")
    expect(defaultSpecialAttackIcon({ attackName: "Radiance of the Dawn" })).toBe("sun-radiations")
    expect(defaultSpecialAttackIcon({ attackName: "Breath Weapon" })).toBe("dragon-breath")
    expect(defaultSpecialAttackIcon({ attackName: "Reprisal" })).toBe("crossed-swords")
  })

  it("keeps an authored icon", () => {
    expect(
      resolveSpecialAttackIcon({
        icon: "fire-bomb",
        attackName: "Bomb",
        attackVariant: "attack",
      }),
    ).toBe("fire-bomb")
  })

  it("stamps defaults when normalizing stored special_attack rows", () => {
    const [attack] = normalizeCharacteristics(
      [
        {
          id: "mod_bomb_attack",
          type: "special_attack",
          attackName: "Bomb",
          attackVariant: "attack",
          properties: [],
          damageTypes: ["Fire"],
          damageDiceCount: 1,
          damageDieType: "d10",
        },
      ],
      null,
    )
    expect(attack).toMatchObject({ type: "special_attack", icon: "rolling-bomb" })
  })
})
