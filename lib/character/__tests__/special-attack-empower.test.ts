import { describe, expect, it } from "vitest"
import {
  resolveOverloadedCharge,
  resolveSpecialAttackAtLevel,
  resolveSpecialAttackEmpower,
} from "@/lib/character/special-attack-empower"
import type { SpecialAttackCharacteristic } from "@/lib/compendium/characteristic-modifiers"

describe("special attack empower", () => {
  it("resolves Prime Bomb level caps", () => {
    expect(
      resolveSpecialAttackEmpower(
        {
          resourceScaleKey: "reagents",
          bonusDicePerResource: "1d10",
          maxResourcesSpentByLevel: [
            { level: 2, mode: "fixed", fixed: 1 },
            { level: 5, mode: "fixed", fixed: 2 },
          ],
          radiusIncreaseFeetPerResource: 5,
        },
        5,
      ),
    ).toMatchObject({ maxSpend: 2, dicePerResource: 1, dieSides: 10 })
  })

  it("charges PB Reagents while granting two extra Overloaded Charge dice", () => {
    expect(resolveOverloadedCharge(5, 5)).toEqual({
      resourceCost: 5,
      effectiveSpend: 7,
      canAfford: true,
    })
    expect(resolveOverloadedCharge(5, 4).canAfford).toBe(false)
  })

  it("resolves level-scaled base Bomb damage", () => {
    const bomb = {
      id: "bomb",
      type: "special_attack",
      properties: [],
      damageTypes: ["Fire"],
      damageDiceCount: 1,
      damageDieType: "d10",
      damageByLevel: [
        { level: 1, mode: "dice", dieCount: 1, dieType: "d10" },
        { level: 5, mode: "dice", dieCount: 2, dieType: "d10" },
        { level: 11, mode: "dice", dieCount: 3, dieType: "d10" },
      ],
    } as SpecialAttackCharacteristic

    expect(resolveSpecialAttackAtLevel(bomb, 10)).toMatchObject({
      damageDiceCount: 2,
      damageDieType: "d10",
    })
  })
})
