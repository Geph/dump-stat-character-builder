import { describe, expect, it } from "vitest"

import {
  expandAlchemistBombProfiles,
  isShortRestActivityText,
  resolveBombRiderAttackVariants,
  shouldSuppressStandaloneBombCard,
  talentAlertAppliesToVariant,
} from "@/lib/character/alchemist-bomb-sheet"
import type { SpecialAttackCharacteristic } from "@/lib/compendium/characteristic-modifiers"

function bombPair(withScale = true): SpecialAttackCharacteristic[] {
  const scale = withScale
    ? {
        resourceScaleKey: "reagents",
        bonusDicePerResource: "1d10",
        maxResourcesSpentByLevel: [
          { level: 2, mode: "fixed" as const, fixed: 1 },
          { level: 5, mode: "fixed" as const, fixed: 2 },
        ],
      }
    : {}
  return [
    {
      id: "attack",
      type: "special_attack",
      attackVariant: "attack",
      attackProfile: "ranged",
      properties: [],
      damageTypes: ["Fire"],
      damageDiceCount: 1,
      damageDieType: "d10",
      ...scale,
    },
    {
      id: "explode",
      type: "special_attack",
      attackVariant: "explode",
      attackProfile: "force_save",
      properties: [],
      damageTypes: ["Fire"],
      damageDiceCount: 1,
      damageDieType: "d10",
      ...scale,
    },
  ]
}

describe("expandAlchemistBombProfiles", () => {
  it("keeps Attack and Explode before Prime Bomb scaling", () => {
    expect(expandAlchemistBombProfiles(bombPair(), 1).map((row) => row.attackVariant)).toEqual([
      "attack",
      "explode",
    ])
  })

  it("adds Primed once Reagent scaling is available", () => {
    const profiles = expandAlchemistBombProfiles(bombPair(), 5)
    expect(profiles.map((row) => row.attackVariant)).toEqual(["attack", "primed", "explode"])
    expect(profiles.find((row) => row.attackVariant === "attack")?.resourceScaleKey).toBeNull()
    expect(profiles.find((row) => row.attackVariant === "explode")?.resourceScaleKey).toBeNull()
    expect(profiles.find((row) => row.attackVariant === "primed")?.resourceScaleKey).toBe("reagents")
  })
})

describe("shouldSuppressStandaloneBombCard", () => {
  it("hides Prime Bomb and formula clones, but keeps Bombs", () => {
    const pair = bombPair()
    expect(shouldSuppressStandaloneBombCard("Bombs", pair)).toBe(false)
    expect(shouldSuppressStandaloneBombCard("Prime Bomb", pair)).toBe(true)
    expect(shouldSuppressStandaloneBombCard("Painkiller Bomb", pair)).toBe(true)
  })
})

describe("talentAlertAppliesToVariant", () => {
  it("shows formula riders only on regular attacks", () => {
    expect(talentAlertAppliesToVariant(["attack"], "attack")).toBe(true)
    expect(talentAlertAppliesToVariant(["attack"], "primed")).toBe(false)
    expect(talentAlertAppliesToVariant(["attack"], "explode")).toBe(false)
    expect(talentAlertAppliesToVariant(undefined, "primed")).toBe(true)
  })
})

describe("resolveBombRiderAttackVariants", () => {
  it("puts When you prime riders on Primed bombs", () => {
    expect(
      resolveBombRiderAttackVariants({
        name: "Timed Demolition",
        description: "When you prime a Bomb, you can set a delay.",
      }),
    ).toEqual(["primed"])
  })
})

describe("isShortRestActivityText", () => {
  it("treats spend/take minutes as a rest activity, not a duration", () => {
    expect(isShortRestActivityText("Potion Brewing", "Brew potions.")).toBe(true)
    expect(isShortRestActivityText("Workshop", "You can spend 10 minutes to finish the item.")).toBe(
      true,
    )
    expect(
      isShortRestActivityText(
        "Tremorsense",
        "As a Bonus Action, you gain Tremorsense for 10 minutes.",
      ),
    ).toBe(false)
    expect(
      isShortRestActivityText(
        "Divine Respite",
        "When you finish a Short Rest, you can choose to regain up to 3 expended Hit Point Dice.",
      ),
    ).toBe(true)
  })
})
