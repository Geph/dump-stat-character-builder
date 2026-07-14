import { describe, expect, it } from "vitest"
import { SRD_CLASS_RESOURCES_BY_NAME } from "@/lib/compendium/class-resources-defaults"
import { SUBCLASS_GATED_CLASS_RESOURCES } from "@/lib/compendium/subclass-gated-class-resources"
import {
  formatResourceDieLabel,
  resolveDieSidesAtLevel,
  resolveUsesAtLevel,
} from "@/lib/compendium/resolve-uses-config"
import { resolveStaticResourceLabel } from "@/lib/compendium/class-resource-display"

describe("Bardic Inspiration class resource die ladder", () => {
  const bardic = SRD_CLASS_RESOURCES_BY_NAME.Bard.find((row) => row.id === "bardic_inspiration")!

  it("keeps CHA-modifier uses and scales die sides by Bard level", () => {
    expect(bardic.uses.type).toBe("ability_modifier")
    expect(bardic.uses.abilityModifier).toBe("CHA")
    expect(resolveUsesAtLevel(bardic.uses, 5, { abilityModifiers: { CHA: 3 } })).toBe(3)

    expect(resolveDieSidesAtLevel(bardic.uses, 1)).toBe(6)
    expect(resolveDieSidesAtLevel(bardic.uses, 4)).toBe(6)
    expect(resolveDieSidesAtLevel(bardic.uses, 5)).toBe(8)
    expect(resolveDieSidesAtLevel(bardic.uses, 10)).toBe(10)
    expect(resolveDieSidesAtLevel(bardic.uses, 15)).toBe(12)
    expect(formatResourceDieLabel(bardic.uses, 10)).toBe("d10")
  })

  it("shows uses with die label on the sheet", () => {
    expect(
      resolveStaticResourceLabel(bardic, 5, { abilityModifiers: { CHA: 4 } }),
    ).toBe("4 (d8)")
  })
})

describe("Lay on Hands pool", () => {
  const layOnHands = SRD_CLASS_RESOURCES_BY_NAME.Paladin.find((row) => row.id === "lay_on_hands")!

  it("is 5 × Paladin level (multiply_level), not a tier table of uses", () => {
    expect(layOnHands.uses.type).toBe("at_level")
    expect(layOnHands.uses.atLevelMode).toBe("multiply_level")
    expect(layOnHands.uses.atLevelTable).toEqual([{ level: 1, count: 5 }])
    expect(resolveUsesAtLevel(layOnHands.uses, 1)).toBe(5)
    expect(resolveUsesAtLevel(layOnHands.uses, 5)).toBe(25)
    expect(resolveUsesAtLevel(layOnHands.uses, 20)).toBe(100)
  })
})

describe("Superiority Dice die ladder on the resource", () => {
  const superiority = SUBCLASS_GATED_CLASS_RESOURCES.find(
    (entry) => entry.resource.id === "superiority_dice",
  )!.resource

  it("scales die sides at Improved / Ultimate Combat Superiority levels", () => {
    expect(resolveDieSidesAtLevel(superiority.uses, 3)).toBe(8)
    expect(resolveDieSidesAtLevel(superiority.uses, 10)).toBe(10)
    expect(resolveDieSidesAtLevel(superiority.uses, 18)).toBe(12)
    expect(resolveUsesAtLevel(superiority.uses, 3)).toBe(4)
    expect(resolveUsesAtLevel(superiority.uses, 7)).toBe(5)
    expect(resolveUsesAtLevel(superiority.uses, 15)).toBe(6)
  })
})
