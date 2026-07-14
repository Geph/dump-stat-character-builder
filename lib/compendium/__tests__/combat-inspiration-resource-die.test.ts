import { describe, expect, it } from "vitest"
import { enrichWildcardFeaturePresets } from "@/lib/compendium/enrich-srd-class-features"
import { formatRollBonusSummary } from "@/lib/compendium/roll-bonus-config"
import type { ResourceAbilityMenuCharacteristic } from "@/lib/compendium/characteristic-modifiers"
import type { Feature } from "@/lib/types"

function resourceAbilityMenu(feature: Feature): ResourceAbilityMenuCharacteristic | undefined {
  for (const instance of feature.linkedModifiers ?? []) {
    for (const characteristic of instance.characteristics ?? []) {
      if (characteristic.type === "resource_ability_menu") {
        return characteristic as ResourceAbilityMenuCharacteristic
      }
    }
  }
  return undefined
}

describe("Combat Inspiration — structured resource-die bonus", () => {
  it("attaches a class-resource bonusConfig to Defense and Offense options, not just prose", () => {
    const feature = enrichWildcardFeaturePresets({
      name: "Combat Inspiration",
      description: "You can inspire allies with words or music.",
    } as Feature)

    const menu = resourceAbilityMenu(feature)
    expect(menu?.resourceKey).toBe("bardic_inspiration")

    const defense = menu?.options.find((option) => option.name === "Defense")
    const offense = menu?.options.find((option) => option.name === "Offense")
    expect(defense?.bonusConfig).toEqual({
      mode: "die",
      dieScaling: "class_resource",
      classResourceKey: "bardic_inspiration",
    })
    expect(offense?.bonusConfig).toEqual({
      mode: "die",
      dieScaling: "class_resource",
      classResourceKey: "bardic_inspiration",
    })
  })

  it("resolves to real dice notation once composed with a character's current die size", () => {
    const feature = enrichWildcardFeaturePresets({
      name: "Combat Inspiration",
      description: "",
    } as Feature)
    const defense = resourceAbilityMenu(feature)?.options.find((option) => option.name === "Defense")

    // Bard is level 10 here, so Bardic Inspiration is a d10 (see resolve-class-resource-die.test.ts).
    expect(
      formatRollBonusSummary(defense?.bonusConfig, {
        classResourceDieSides: { bardic_inspiration: 10 },
      }),
    ).toBe("1d10 (bardic_inspiration die)")
  })
})
