import { describe, expect, it } from "vitest"
import type { LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { detectFeatureModifiers } from "@/lib/import/detect-feature-modifiers"
import type { ImportContent } from "@/lib/import/content-schema"
import type { Feature } from "@/lib/types"

type FeatureOptionWithModifiers = {
  name: string
  linkedModifiers?: LinkedModifierInstance[]
}

const baseCtx = {
  contentKind: "subclass_feature" as const,
  sourceName: "Path of the Wild Heart",
}

describe("Wild Heart import wiring", () => {
  it("grants ritual-only spells from Animal Speaker phrasing", () => {
    const detections = detectFeatureModifiers(
      "You can cast the Beast Sense and Speak with Animals spells but only as Rituals. Wisdom is your spellcasting ability for them.",
      { ...baseCtx, featureName: "Animal Speaker", level: 3 },
    )
    const spellsKnown = detections.find((entry) => entry.ruleId === "spell.can_cast_named")
    expect(spellsKnown).toBeTruthy()
    const char = spellsKnown!.instance.characteristics?.[0]
    expect(char?.type).toBe("spells_known")
    if (char?.type !== "spells_known") return
    expect(char.spells.map((entry) => entry.spellId)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Beast Sense"),
        expect.stringContaining("Speak with Animals"),
      ]),
    )
    expect(char.spells.every((entry) => entry.castAsRitual === true)).toBe(true)
    expect(char.castingAbility).toBe("wisdom")
  })

  it("grants ritual-only Commune with Nature from Nature Speaker", () => {
    const detections = detectFeatureModifiers(
      "You can cast the Commune with Nature spell but only as a Ritual. Wisdom is your spellcasting ability for it.",
      { ...baseCtx, featureName: "Nature Speaker", level: 10 },
    )
    const spellsKnown = detections.find((entry) => entry.ruleId === "spell.can_cast_named")
    const char = spellsKnown?.instance.characteristics?.[0]
    expect(char?.type).toBe("spells_known")
    if (char?.type !== "spells_known") return
    expect(char.spells[0]?.spellId).toContain("Commune with Nature")
    expect(char.spells[0]?.castAsRitual).toBe(true)
  })

  it("wires Rage of the Wilds options and does not put Wolf advantage on the parent", () => {
    const content: ImportContent = {
      subclasses: [
        {
          name: "Path of the Wild Heart",
          class_name: "Barbarian",
          description: null,
          features: [
            {
              level: 3,
              name: "Rage of the Wilds",
              description:
                "<p>Your Rage taps into the primal power of animals. Whenever you activate your Rage, you gain one of the following options of your choice.</p><ul><li><strong>Bear.</strong> While your Rage is active, you have Resistance to every damage type except Force, Necrotic, Psychic, and Radiant.</li><li><strong>Eagle.</strong> When you activate your Rage, you can take the Disengage and Dash actions as part of that Bonus Action.</li><li><strong>Wolf.</strong> While your Rage is active, your allies have Advantage on attack rolls against any enemy of yours within 5 feet of you.</li></ul>",
              isChoice: true,
              choices: {
                category: "Rage Option",
                count: 1,
                options: [
                  {
                    name: "Bear",
                    description:
                      "While your Rage is active, you have Resistance to every damage type except Force, Necrotic, Psychic, and Radiant.",
                  },
                  {
                    name: "Eagle",
                    description:
                      "When you activate your Rage, you can take the Disengage and Dash actions as part of that Bonus Action. While your Rage is active, you can take a Bonus Action to take both of those actions.",
                  },
                  {
                    name: "Wolf",
                    description:
                      "While your Rage is active, your allies have Advantage on attack rolls against any enemy of yours within 5 feet of you.",
                  },
                ],
              },
            },
          ],
        },
      ],
    }

    const enriched = enrichImportContentModifiers(content)
    const feature = enriched.subclasses![0].features[0] as Feature
    const parentChars = (feature.linkedModifiers ?? []).flatMap(
      (instance) => instance.characteristics ?? [],
    )
    const parentEffectKinds = (feature.linkedModifiers ?? []).flatMap((instance) =>
      (instance.activation?.effects ?? []).map((effect) => (effect as { kind?: string }).kind),
    )
    expect(parentEffectKinds.includes("check_roll_modifier")).toBe(false)
    expect(parentChars.some((char) => char.type === "damage_resistance")).toBe(false)

    const options = feature.choices!.options as FeatureOptionWithModifiers[]
    const bear = options.find((option) => option.name === "Bear")!
    const bearRes = (bear.linkedModifiers ?? [])
      .flatMap((instance) => instance.characteristics ?? [])
      .find((char) => char.type === "damage_resistance")
    expect(bearRes?.type).toBe("damage_resistance")
    if (bearRes?.type === "damage_resistance") {
      expect(bearRes.damageTypes).toContain("Fire")
      expect(bearRes.damageTypes).not.toContain("Force")
      expect(bearRes.damageTypes).not.toContain("Psychic")
      expect(bearRes.requiresSheetToggle).toBe("while_raging")
    }

    const eagle = options.find((option) => option.name === "Eagle")!
    const eagleFx = (eagle.linkedModifiers ?? []).find(
      (instance) => instance.activation?.bonusAction === true,
    )
    expect(eagleFx).toBeTruthy()
    expect(eagleFx?.activation?.requirements).toEqual([{ kind: "while_raging" }])
    expect(
      (eagleFx?.activation?.effects ?? []).some(
        (effect) => (effect as { kind?: string }).kind === "movement_option",
      ),
    ).toBe(true)
    expect(
      (eagleFx?.activation?.effects ?? []).some(
        (effect) =>
          (effect as { movementDash?: boolean }).movementDash ||
          (effect as { movementDisengage?: boolean }).movementDisengage,
      ),
    ).toBe(false)

    const wolf = options.find((option) => option.name === "Wolf")!
    const wolfEffectKinds = (wolf.linkedModifiers ?? []).flatMap((instance) =>
      (instance.activation?.effects ?? []).map((effect) => (effect as { kind?: string }).kind),
    )
    expect(wolfEffectKinds.includes("check_roll_modifier")).toBe(false)
  })

  it("wires Aspect of the Wilds speeds and darkvision onto options", () => {
    const content: ImportContent = {
      subclasses: [
        {
          name: "Path of the Wild Heart",
          class_name: "Barbarian",
          description: null,
          features: [
            {
              level: 6,
              name: "Aspect of the Wilds",
              description:
                "<p>You gain one of the following options of your choice. Whenever you finish a Long Rest, you can change your choice.</p>",
              isChoice: true,
              choices: {
                category: "Aspect Option",
                count: 1,
                options: [
                  {
                    name: "Owl",
                    description:
                      "You have Darkvision with a range of 60 feet. If you already have Darkvision, its range increases by 60 feet.",
                  },
                  {
                    name: "Panther",
                    description: "You have a Climb Speed equal to your Speed.",
                  },
                  {
                    name: "Salmon",
                    description: "You have a Swim Speed equal to your Speed.",
                  },
                ],
              },
            },
          ],
        },
      ],
    }

    const enriched = enrichImportContentModifiers(content)
    const feature = enriched.subclasses![0].features[0] as Feature
    const options = feature.choices!.options as FeatureOptionWithModifiers[]
    const owl = options.find((option) => option.name === "Owl")!
    expect(
      (owl.linkedModifiers ?? [])
        .flatMap((instance) => instance.characteristics ?? [])
        .some((char) => char.type === "vision"),
    ).toBe(true)

    const panther = options.find((option) => option.name === "Panther")!
    const climb = (panther.linkedModifiers ?? [])
      .flatMap((instance) => instance.characteristics ?? [])
      .find((char) => char.type === "speed" && char.speedType === "climb")
    expect(climb).toBeTruthy()

    const salmon = options.find((option) => option.name === "Salmon")!
    const swim = (salmon.linkedModifiers ?? [])
      .flatMap((instance) => instance.characteristics ?? [])
      .find((char) => char.type === "speed" && char.speedType === "swim")
    expect(swim).toBeTruthy()
  })
})
