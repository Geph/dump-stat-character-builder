import { describe, expect, it } from "vitest"
import { aggregateCharacteristics } from "@/lib/compendium/characteristic-modifiers"
import { enrichClassFeatureWithModifierPresets } from "@/lib/compendium/enrich-srd-class-features"
import { enrichSrdClassList } from "@/lib/compendium/enrich-srd-classes"
import classes from "@/lib/srd/seed-data/classes.json"
import {
  blockedWhenConditionLimitation,
  isWearingArmorLimitation,
  modifierLimitationsMet,
  notWearingArmorLimitation,
} from "@/lib/compendium/modifier-limitations"
import { collectFeatureRollModes } from "@/lib/character/collect-feature-roll-modes"
import type { Equipment } from "@/lib/types"

const heavyPlate: Equipment = {
  id: "heavy-1",
  name: "Plate Armor",
  category: "Armor",
  subcategory: "Heavy Armor",
}

const leather: Equipment = {
  id: "light-1",
  name: "Leather Armor",
  category: "Armor",
  subcategory: "Light Armor",
}

describe("modifierLimitationsMet", () => {
  it("blocks when character has a gated condition", () => {
    expect(
      modifierLimitationsMet(
        { limitations: [blockedWhenConditionLimitation("Incapacitated")] },
        { activeConditions: ["Incapacitated"] },
      ),
    ).toBe(false)
    expect(
      modifierLimitationsMet(
        { limitations: [blockedWhenConditionLimitation("Incapacitated")] },
        { activeConditions: [] },
      ),
    ).toBe(true)
  })

  it("blocks speed bonus while wearing heavy armor", () => {
    expect(
      modifierLimitationsMet(
        { limitations: [notWearingArmorLimitation("Heavy armor")] },
        { equippedArmor: heavyPlate },
      ),
    ).toBe(false)
    expect(
      modifierLimitationsMet(
        { limitations: [notWearingArmorLimitation("Heavy armor")] },
        { equippedArmor: leather },
      ),
    ).toBe(true)
  })

  it("detects shield and any armor", () => {
    expect(isWearingArmorLimitation("Heavy armor", heavyPlate, null)).toBe(true)
    expect(isWearingArmorLimitation("Any armor", leather, null)).toBe(true)
    expect(isWearingArmorLimitation("Shield", null, { id: "s", name: "Shield", category: "Armor" })).toBe(
      true,
    )
  })
})

describe("Fast Movement on character sheet", () => {
  const enriched = enrichSrdClassList(classes as Record<string, unknown>[])
  const barbarian = enriched.find((row) => row.name === "Barbarian")!
  const fastMovement = ((barbarian.features ?? []) as import("@/lib/types").Feature[]).find(
    (feature) => feature.name === "Fast Movement",
  )!

  it("wires heavy-armor limitation on the speed modifier", () => {
    const speedMod = fastMovement.linkedModifiers?.[0]?.characteristics?.find((mod) => mod.type === "speed")
    expect(speedMod?.limitations?.some((entry) => entry.value === "Heavy armor")).toBe(true)
  })

  it("includes +10 walk only when not wearing heavy armor", () => {
    const speedMods =
      fastMovement.linkedModifiers?.flatMap((instance) => instance.characteristics ?? []) ?? []
    const withoutHeavy = aggregateCharacteristics(speedMods, { equippedArmor: leather })
    const withHeavy = aggregateCharacteristics(speedMods, { equippedArmor: heavyPlate })
    expect(withoutHeavy.speed.walk).toBe(10)
    expect(withHeavy.speed.walk ?? 0).toBe(0)
  })
})

describe("Danger Sense roll gating", () => {
  it("respects incapacitated via limitations", () => {
    const feature = enrichClassFeatureWithModifierPresets("Barbarian", {
      level: 2,
      name: "Danger Sense",
      description: "Advantage on Dexterity saving throws unless Incapacitated.",
    })
    const ok = collectFeatureRollModes(
      [feature],
      { kind: "save", ability: "dexterity" },
      { activeConditions: [] },
    )
    expect(ok.mode).toBe("advantage")

    const blocked = collectFeatureRollModes(
      [feature],
      { kind: "save", ability: "dexterity" },
      { activeConditions: ["Incapacitated"] },
    )
    expect(blocked.mode).toBe("normal")
  })
})
