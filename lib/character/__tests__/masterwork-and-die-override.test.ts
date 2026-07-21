import { describe, expect, it } from "vitest"
import { aggregateCharacteristics } from "@/lib/compendium/characteristic-modifiers"
import { replaceDamageDiceSides } from "@/lib/compendium/weapon-damage-die-override"
import { resolveClassResourceCounts } from "@/lib/character/resolve-class-resource-counts"
import { isGatedClassResourceUnlockedForClass } from "@/lib/compendium/subclass-gated-class-resources"
import type { DndClass } from "@/lib/types"

describe("weapon_damage_die_override", () => {
  it("rewrites weapon die sides", () => {
    expect(replaceDamageDiceSides("1d8", 4)).toBe("1d4")
    expect(replaceDamageDiceSides("2d6", 4)).toBe("2d4")
  })

  it("aggregates override and resolves Masterwork Bonus into attack/AC", () => {
    const aggregated = aggregateCharacteristics(
      [
        {
          id: "1",
          type: "weapon_damage_die_override",
          dieSides: 4,
          scope: "weapons",
        },
        {
          id: "2",
          type: "attack_roll_modifiers",
          entries: [
            {
              bonus: 0,
              target: "all",
              bonusFromClassResourceKey: "masterwork_bonus",
              bonusClassResourceScale: "full",
            },
          ],
        },
        {
          id: "3",
          type: "ac",
          mode: "flat_bonus",
          flatBonus: 0,
          flatBonusFromClassResourceKey: "masterwork_bonus",
          flatBonusClassResourceScale: "half_ceil",
        },
      ],
      {
        characterLevel: 5,
        classResourceCounts: { masterwork_bonus: 2 },
        activeSheetToggles: new Set(["masterwork_weapon_active", "masterwork_armor_active"]),
      },
    )

    expect(aggregated.weaponDamageDieOverrides).toHaveLength(1)
    expect(aggregated.attackRollModifiers[0]?.bonus).toBe(2)
    expect(aggregated.acFlatBonus).toBe(1)
  })
})

describe("subclass-gated momentum / charge_points", () => {
  it("unlocks Momentum only for Momentum-named Dancer subclasses", () => {
    expect(
      isGatedClassResourceUnlockedForClass("momentum", "Dancer", ["Momentum"]),
    ).toBe(true)
    expect(
      isGatedClassResourceUnlockedForClass("momentum", "Dancer", ["Cheerleader"]),
    ).toBe(false)
  })

  it("unlocks Charge Points only for Thunderlords", () => {
    expect(
      isGatedClassResourceUnlockedForClass("charge_points", "Craftsman", [
        "Thunderlords' Guild",
      ]),
    ).toBe(true)
    expect(
      isGatedClassResourceUnlockedForClass("charge_points", "Craftsman", [
        "Armigers' Guild",
      ]),
    ).toBe(false)
  })

  it("resolves Masterwork Bonus tier counts from class_resources", () => {
    const cls = {
      id: "craftsman-1",
      name: "Craftsman",
      class_resources: [
        {
          id: "masterwork_bonus",
          name: "Masterwork Bonus",
          uses: {
            type: "special" as const,
            atLevelMode: "tier" as const,
            atLevelTable: [
              { level: 1, count: 1 },
              { level: 5, count: 2 },
              { level: 13, count: 3 },
            ],
          },
        },
      ],
    } as DndClass

    const counts = resolveClassResourceCounts({
      classLevels: [{ classId: "craftsman-1", level: 5 }],
      classes: [cls],
    })
    expect(counts.masterwork_bonus).toBe(2)
  })
})
