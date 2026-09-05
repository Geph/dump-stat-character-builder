import { describe, expect, it } from "vitest"

import { collectSheetActions } from "@/lib/character/sheet-actions"
import { detectFeatureModifiers } from "@/lib/import/detect-feature-modifiers"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import type { ImportContent } from "@/lib/import/content-schema"
import type { Feature } from "@/lib/types"

function featureCharacteristics(feature: Feature | undefined) {
  return (
    feature?.linkedModifiers?.flatMap(
      (instance) => instance.characteristics ?? [],
    ) ?? []
  )
}

describe("Mage Hand Press Necromancer feature wiring", () => {
  it("wires Dead Space as an action with capacity, item choice, and player notes", () => {
    const cls = enrichImportContentModifiers(
      applyImportEnrichmentPresets({
        classes: [
          {
            name: "Necromancer",
            features: [
              {
                level: 2,
                name: "Dead Space",
                description:
                  "The extradimensional space is linked to an item of your choice, such as a bag, a cloak, or a backpack. As a Magic action, you can use the linked item to place a corpse in the extradimensional space. You can link a new item during a Short Rest.",
                mechanics: [
                  {
                    kind: "equipment_and_magic_items",
                    itemOptions: ["Bag", "Cloak", "Backpack"],
                    choiceCount: 1,
                    allowCustom: true,
                    confidence: "high",
                  },
                  {
                    kind: "uses",
                    usesFixed: 12,
                    sourcePhrase: "The space can hold up to 12 corpses.",
                    confidence: "high",
                  },
                  {
                    kind: "player_note",
                    notePrompt: "Dead Space notes",
                    notePlaceholder: "Record the linked item and contents.",
                    noteTarget: "feature",
                    confidence: "high",
                  },
                  {
                    kind: "inventory_container",
                    containerName: "Dead Space",
                    capacityMode: "slot_count",
                    capacityAmount: 12,
                    contentKinds: ["corpse", "companion", "freeform"],
                    maxCreatureSize: "Medium",
                    linkHostItem: true,
                    confidence: "high",
                  },
                ],
              },
            ],
          },
        ],
      } as unknown as ImportContent),
    ).classes![0]

    const feature = (cls.features as Feature[]).find(
      (row) => row.name === "Dead Space",
    )
    const characteristics = featureCharacteristics(feature)
    expect(
      characteristics.find((row) => row.type === "equipment_and_magic_items"),
    ).toMatchObject({
      itemOptions: ["Bag", "Cloak", "Backpack"],
      choiceCount: 1,
      allowCustom: true,
    })
    expect(characteristics.find((row) => row.type === "uses")).toMatchObject({
      uses: { type: "fixed", fixedAmount: 12 },
    })
    expect(
      characteristics.find((row) => row.type === "player_note"),
    ).toMatchObject({
      prompt: "Dead Space notes",
      target: "feature",
    })
    expect(characteristics.find((row) => row.type === "inventory_container")).toMatchObject({
      capacityMode: "slot_count",
      capacityAmount: 12,
      linkHostItem: true,
    })

    const actions = collectSheetActions({
      classDetails: [
        {
          row: {
            class_id: "necromancer",
            level: 2,
            subclass_id: null,
            order: 0,
          },
          class: {
            id: "necromancer",
            name: "Necromancer",
            hit_die: 6,
            features: cls.features,
          } as never,
          subclass: null,
        },
      ],
      species: null,
    })
    expect(
      actions.find((action) => action.name === "Dead Space"),
    ).toMatchObject({
      kinds: ["action"],
      limitedUses: { type: "fixed", fixedAmount: 12 },
      playerNotes: [{ prompt: "Dead Space notes" }],
      equipmentChoices: [
        {
          options: ["Bag", "Cloak", "Backpack"],
          allowCustom: true,
        },
      ],
    })
  })

  it("keeps spell critical ranges scoped to spell attacks", () => {
    const cls = enrichImportContentModifiers({
      classes: [
        {
          name: "Necromancer",
          features: [
            {
              level: 5,
              name: "Critical Spellcasting",
              description:
                "Your spell attacks can score a Critical Hit on a roll of 19 or 20.",
              mechanics: [
                {
                  kind: "attack_roll_modifiers",
                  attackTarget: "spell",
                  criticalHitMinimum: 19,
                  confidence: "high",
                },
              ],
            },
          ],
        },
      ],
    } as unknown as ImportContent).classes![0]

    const feature = (cls.features as Feature[])[0]
    expect(
      featureCharacteristics(feature).find(
        (row) => row.type === "attack_roll_modifiers",
      ),
    ).toMatchObject({
      entries: [{ target: "spell", criticalHitMinimum: 19 }],
    })
  })

  it("does not grant a Necromancer the immunities that belong only to their thralls", () => {
    const detections = detectFeatureModifiers(
      "Your thralls have Immunity to the Charmed and Frightened conditions, and are immune to effects that turn Undead.",
      {
        contentKind: "class_feature",
        sourceName: "Necromancer",
        featureName: "Improved Thralls",
      },
    )
    const characteristics = detections.flatMap(
      (row) => row.instance.characteristics ?? [],
    )
    expect(
      characteristics.some((row) => row.type === "condition_immunity"),
    ).toBe(false)
  })

  it("does not turn resistance/immunity bypass text into self defenses", () => {
    const detections = detectFeatureModifiers(
      "When you deal Poison damage or give the Poisoned condition, it ignores Resistance to Poison damage and Immunity to the Poisoned condition.",
      {
        contentKind: "subclass_feature",
        sourceName: "Plague Lord",
        featureName: "Necrotoxin",
      },
    )
    const types = detections.flatMap((row) =>
      (row.instance.characteristics ?? []).map((characteristic) => characteristic.type),
    )
    expect(types).not.toContain("damage_resistance")
    expect(types).not.toContain("condition_immunity")
  })

  it("wires Lichdom immunities and Truesight from the enrichment preset alone", () => {
    const cls = enrichImportContentModifiers(
      applyImportEnrichmentPresets({
        classes: [
          {
            name: "Necromancer",
            features: [
              {
                level: 20,
                name: "Lichdom",
                description:
                  "You undergo a transformation into a Lich. You have Truesight with a range of 120 feet. You have Immunity to Necrotic and Poison damage and to the Exhaustion and Poisoned conditions.",
              },
            ],
          },
        ],
      } as unknown as ImportContent),
    ).classes![0]

    const characteristics = featureCharacteristics((cls.features as Feature[])[0])
    expect(characteristics.find((row) => row.type === "vision")).toMatchObject({
      visionType: "truesight",
      rangeFeet: 120,
    })
    expect(characteristics.find((row) => row.type === "damage_immunity")).toMatchObject({
      damageTypes: ["Necrotic", "Poison"],
    })
    expect(characteristics.find((row) => row.type === "condition_immunity")).toMatchObject({
      conditions: ["Exhaustion", "Poisoned"],
    })
  })

  it("wires every supported Lichdom immunity and Truesight", () => {
    const cls = enrichImportContentModifiers({
      classes: [
        {
          name: "Necromancer",
          features: [
            {
              level: 20,
              name: "Lichdom",
              description:
                "You have Truesight with a range of 120 feet. You have Immunity to Necrotic and Poison damage and to the Exhaustion and Poisoned conditions.",
              mechanics: [
                {
                  kind: "vision",
                  visionType: "truesight",
                  visionRangeFeet: 120,
                  confidence: "high",
                },
                {
                  kind: "damage_immunity",
                  damageTypes: ["Necrotic", "Poison"],
                  confidence: "high",
                },
                {
                  kind: "condition_immunity",
                  conditions: ["Exhaustion", "Poisoned"],
                  confidence: "high",
                },
              ],
            },
          ],
        },
      ],
    } as unknown as ImportContent).classes![0]

    const feature = (cls.features as Feature[])[0]
    const characteristics = featureCharacteristics(feature)
    expect(characteristics.find((row) => row.type === "vision")).toMatchObject({
      visionType: "truesight",
      rangeFeet: 120,
    })
    expect(
      characteristics.find((row) => row.type === "damage_immunity"),
    ).toMatchObject({
      damageTypes: ["Necrotic", "Poison"],
    })
    expect(
      characteristics.find((row) => row.type === "condition_immunity"),
    ).toMatchObject({
      conditions: ["Exhaustion", "Poisoned"],
    })
  })
})
