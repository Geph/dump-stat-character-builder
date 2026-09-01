import { describe, expect, it } from "vitest"
import {
  appliesToFromResourceDieOption,
  requiredToggleFromResourceMenu,
  rollResourceDieUseBonuses,
  bonusFromResourceDieOption,
} from "@/lib/character/resource-die-use"
import type { ResourceAbilityMenuCharacteristic } from "@/lib/compendium/characteristic-modifiers"

const DANCE_MENU = {
  type: "resource_ability_menu",
  resourceKey: "dance_die",
  options: [
    {
      name: "Graceful Dodge",
      description: "Add your Dance Die to your AC against one attack.",
      resourceCost: 0,
      bonusConfig: {
        mode: "die" as const,
        dieScaling: "class_resource" as const,
        classResourceKey: "dance_die",
      },
    },
  ],
} as ResourceAbilityMenuCharacteristic

describe("resource-die-use", () => {
  it("infers AC applies-to and while_dancing from a dance_die menu", () => {
    const option = DANCE_MENU.options[0]
    expect(appliesToFromResourceDieOption(option)).toBe("AC against one attack")
    expect(requiredToggleFromResourceMenu(DANCE_MENU, option, "Dance")).toBe("while_dancing")
    expect(bonusFromResourceDieOption(option)?.bonusConfig).toMatchObject({
      mode: "die",
      classResourceKey: "dance_die",
    })
  })

  it("rolls a class-resource die and reports the result", () => {
    const bonus = bonusFromResourceDieOption(DANCE_MENU.options[0])
    const rolled = rollResourceDieUseBonuses(bonus ? [bonus] : [], {
      proficiencyBonus: 2,
      abilityMods: {
        strength: 0,
        dexterity: 3,
        constitution: 0,
        intelligence: 0,
        wisdom: 0,
        charisma: 0,
      },
      characterLevel: 3,
      classResourceDieSides: { dance_die: 8 },
    })
    expect(rolled).toHaveLength(1)
    expect(rolled[0]?.natural).toBeGreaterThanOrEqual(1)
    expect(rolled[0]?.natural).toBeLessThanOrEqual(8)
    expect(rolled[0]?.line).toMatch(/[+][1-8] \(1d8\) to AC against one attack/)
  })
})
