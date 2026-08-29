import { describe, expect, it } from "vitest"
import { attachClassDetails } from "@/lib/character/character-classes"
import type { DndClass, Feature } from "@/lib/types"

describe("attachClassDetails class-feature presets", () => {
  it("wires Reprisal as a choose-one special attack on a stored Martyr row", () => {
    const martyr = {
      id: "cls_martyr",
      name: "Martyr",
      features: [
        {
          name: "Reprisal",
          level: 2,
          description:
            "When you take damage from a creature you can see within 5 feet of yourself, you can take a Reaction to halve the damage taken. The creature takes 1d6 Necrotic or Radiant damage (your choice).",
          activation: { reaction: true },
        },
      ],
    } as DndClass

    const [detail] = attachClassDetails(
      [{ class_id: "cls_martyr", level: 3, order: 0 }],
      [martyr],
      [],
    )
    const reprisal = (detail.class?.features ?? []).find((feature) => feature.name === "Reprisal") as
      | Feature
      | undefined
    const attack = reprisal?.linkedModifiers
      ?.flatMap((instance) => instance.characteristics ?? [])
      .find((char) => char.type === "special_attack") as
      | { chooseDamageType?: boolean; damageTypes?: string[]; damageDieType?: string }
      | undefined

    expect(attack).toMatchObject({
      type: "special_attack",
      chooseDamageType: true,
      damageDieType: "d6",
    })
    expect(attack?.damageTypes).toEqual(["Necrotic", "Radiant"])
  })

  it("wires Miraculous Healing as a hit-dice heal + CON on a stored Martyr row", () => {
    const martyr = {
      id: "cls_martyr",
      name: "Martyr",
      hit_die: 12,
      features: [
        {
          name: "Miraculous Healing",
          level: 2,
          description:
            "As a Bonus Action, you can heal your own wounds. Roll one of your unexpended Hit Point Dice and regain a number of Hit Points equal to the roll's total plus your Constitution modifier.",
          activation: { bonusAction: true },
        },
      ],
    } as DndClass

    const [detail] = attachClassDetails(
      [{ class_id: "cls_martyr", level: 3, order: 0 }],
      [martyr],
      [],
    )
    const heal = (detail.class?.features ?? []).find((feature) => feature.name === "Miraculous Healing") as
      | Feature
      | undefined
    expect(heal?.activation?.spendHitDice).toBe(1)
    const effect = heal?.linkedModifiers
      ?.flatMap((instance) => instance.activation?.effects ?? [])
      .find((row) => row.kind === "heal_self")
    expect(effect).toMatchObject({
      healMode: "hit_dice",
      healAbility: "CON",
      healDiceCount: 1,
    })
  })

  it("splits Sacrifice into Sacrificial Strike (bonus) and Sacrificial Skill (failed-roll +5)", () => {
    const martyr = {
      id: "cls_martyr",
      name: "Martyr",
      features: [
        {
          name: "Sacrifice",
          level: 1,
          description:
            "The gods demand that you undergo trials to curry their favor, granting you the following benefits. Sacrificial Strike. When you deal damage to a creature with a Melee weapon or Unarmed Strike, you can take a Bonus Action to enhance the strike. You take 5 Radiant damage and the target takes an extra 10 Radiant damage. Sacrificial Skill. Once per turn when you fail a D20 Test, you can take 10 Radiant damage to gain a +5 bonus to that roll, potentially turning it into a success.",
        },
      ],
    } as DndClass

    const [detail] = attachClassDetails(
      [{ class_id: "cls_martyr", level: 3, order: 0 }],
      [martyr],
      [],
    )
    const names = (detail.class?.features ?? []).map((feature) => feature.name)
    expect(names).toContain("Sacrificial Strike")
    expect(names).toContain("Sacrificial Skill")
    expect(names).not.toContain("Sacrifice")

    const strike = (detail.class?.features ?? []).find(
      (feature) => feature.name === "Sacrificial Strike",
    ) as Feature | undefined
    expect(strike?.activation?.bonusAction).toBe(true)
    const extra = strike?.linkedModifiers
      ?.flatMap((instance) => instance.activation?.effects ?? [])
      .find((effect) => effect.kind === "extra_damage_on_hit")
    expect(extra).toMatchObject({
      damageTypes: ["Radiant"],
      bonusAmount: 10,
    })
    expect(strike?.activation?.spendHitPoints).toBe(5)

    const skill = (detail.class?.features ?? []).find(
      (feature) => feature.name === "Sacrificial Skill",
    ) as Feature | undefined
    const triggers = skill?.linkedModifiers?.flatMap((instance) => instance.characteristics ?? []) ?? []
    expect(triggers.filter((char) => char.type === "failed_roll_trigger")).toHaveLength(4)
    expect(triggers[0]).toMatchObject({
      spendResourceKey: "hit_points",
      spendResourceAmount: 10,
      refundResourceOnStillFailed: true,
    })
    const attack = triggers.find(
      (char) => char.type === "failed_roll_trigger" && char.rollKind === "attack",
    ) as { effect?: { activation?: { effects?: { bonusConfig?: { fixed?: number } }[] } } } | undefined
    expect(attack?.effect?.activation?.effects?.[0]?.bonusConfig?.fixed).toBe(5)
  })

  it("wires Improved Sacrificial Strike as a selectable rider on Sacrificial Strike", () => {
    const martyr = {
      id: "cls_martyr",
      name: "Martyr",
      features: [
        {
          name: "Sacrificial Strike",
          level: 1,
          description: "Bonus Action: take 5 Radiant and deal +10 Radiant.",
        },
        {
          name: "Improved Sacrificial Strike",
          level: 11,
          description:
            "Your Sacrificial Strike improves. When you use this feature, you can choose to take 10 Radiant damage, and the target takes an extra 20 Radiant damage.",
        },
      ],
    } as DndClass

    const [detail] = attachClassDetails(
      [{ class_id: "cls_martyr", level: 11, order: 0 }],
      [martyr],
      [],
    )
    const improved = (detail.class?.features ?? []).find(
      (feature) => feature.name === "Improved Sacrificial Strike",
    ) as Feature | undefined
    expect(improved?.sheetDisplay).toMatchObject({
      combatActions: false,
      abilitiesActions: false,
    })
    const rider = improved?.linkedModifiers
      ?.flatMap((instance) => instance.characteristics ?? [])
      .find((char) => char.type === "power_rider") as
      | { parentPowerNames?: string[]; selectable?: boolean; spendHitPoints?: number }
      | undefined
    expect(rider).toMatchObject({
      type: "power_rider",
      parentPowerNames: ["Sacrificial Strike"],
      selectable: true,
      spendHitPoints: 10,
    })
  })

  it("attaches Sacrifice Foe as a notice on Sacrificial Strike and Skill", () => {
    const martyr = {
      id: "cls_martyr",
      name: "Martyr",
      features: [
        {
          name: "Sacrificial Strike",
          level: 1,
          description: "Bonus Action: take 5 Radiant and deal +10 Radiant.",
          activation: { bonusAction: true },
        },
        {
          name: "Sacrificial Skill",
          level: 1,
          description: "When you fail a D20 Test, take 10 Radiant for +5.",
        },
        {
          name: "Sacrifice Foe",
          level: 7,
          description:
            "When you make an attack or damage roll that is improved by your Sacrifice feature, and the attack reduces an enemy to 0 Hit Points, you don't take Radiant damage from using the feature.",
        },
      ],
    } as DndClass

    const [detail] = attachClassDetails(
      [{ class_id: "cls_martyr", level: 7, order: 0 }],
      [martyr],
      [],
    )
    const foe = (detail.class?.features ?? []).find((feature) => feature.name === "Sacrifice Foe") as
      | Feature
      | undefined
    expect(foe?.sheetDisplay).toMatchObject({
      featuresTab: true,
      combatActions: false,
      abilitiesActions: false,
    })
    const rider = foe?.linkedModifiers
      ?.flatMap((instance) => instance.characteristics ?? [])
      .find((char) => char.type === "power_rider") as
      | { parentPowerNames?: string[]; alertSummary?: string }
      | undefined
    expect(rider).toMatchObject({
      type: "power_rider",
      parentPowerNames: ["Sacrificial Strike", "Sacrificial Skill"],
    })
    expect(rider?.alertSummary).toMatch(/0 Hit Points/i)
  })

  it("wires Undying as a drop-to-0 Passive that can also fire Miraculous Healing", () => {
    const martyr = {
      id: "cls_martyr",
      name: "Martyr",
      hit_die: 12,
      features: [
        {
          name: "Undying",
          level: 10,
          description:
            "When you are reduced to 0 Hit Points but not killed outright, you can drop to 1 Hit Point instead and you can immediately use your Miraculous Healing (no action required).",
        },
        {
          name: "Miraculous Healing",
          level: 2,
          description:
            "As a Bonus Action, you can heal your own wounds. Roll one of your unexpended Hit Point Dice.",
        },
      ],
    } as DndClass

    const [detail] = attachClassDetails(
      [{ class_id: "cls_martyr", level: 10, order: 0 }],
      [martyr],
      [],
    )
    const undying = (detail.class?.features ?? []).find((feature) => feature.name === "Undying") as
      | Feature
      | undefined
    expect(undying?.activation).toMatchObject({
      onDropToZeroHp: true,
      alsoActivateFeatureNames: ["Miraculous Healing"],
    })
    expect(undying?.activation?.reaction).toBeFalsy()
    expect(undying?.sheetDisplay).toMatchObject({ combatActions: true })
  })

  it("wires Divine Respite to restore Hit Point Dice and drops leftover scaling rows", () => {
    const martyr = {
      id: "cls_martyr",
      name: "Martyr",
      features: [
        {
          name: "Divine Respite",
          level: 9,
          description:
            "When you finish a Short Rest, you can choose to regain up to 3 expended Hit Point Dice. Once you use this feature, you can't do so again until you finish a Long Rest.",
        },
        {
          name: "Divine Respite",
          level: 13,
          description: "The number of expended Hit Point Dice you regain with Divine Respite increases to 6.",
        },
      ],
    } as DndClass

    const [detail] = attachClassDetails(
      [{ class_id: "cls_martyr", level: 13, order: 0 }],
      [martyr],
      [],
    )
    const features = (detail.class?.features ?? []) as Feature[]
    const respiteRows = features.filter((feature) => feature.name === "Divine Respite")
    expect(respiteRows).toHaveLength(1)
    const respite = respiteRows[0]
    expect(respite?.activation).toMatchObject({ action: true, noEconomyCost: true })
    expect(respite?.sheetDisplay).toMatchObject({
      abilitiesActions: true,
      combatActions: false,
    })
    const restore = respite?.linkedModifiers
      ?.flatMap((instance) => instance.characteristics ?? [])
      .find((char) => char.type === "hit_dice_restore") as
      | { amount?: number; amountByLevel?: { level: number; fixed?: number | null }[] }
      | undefined
    expect(restore?.amount).toBe(3)
    expect(restore?.amountByLevel?.map((row) => [row.level, row.fixed])).toEqual([
      [9, 3],
      [13, 6],
      [17, 10],
    ])
  })

  it("injects the Hit Point Spellcasting table on a stored Martyr row", () => {
    const [detail] = attachClassDetails(
      [{ class_id: "cls_martyr", level: 9, order: 0 }],
      [{ id: "cls_martyr", name: "Martyr", features: [] } as unknown as DndClass],
      [],
    )
    expect(detail.class?.spellcasting?.hit_point_cost_by_level).toEqual({
      1: 5,
      2: 10,
      3: 20,
      4: 30,
      5: 45,
    })
  })
})
