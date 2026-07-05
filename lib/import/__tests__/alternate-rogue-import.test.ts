import { describe, expect, it } from "vitest"
import { aggregateCharacteristics } from "@/lib/compendium/characteristic-modifiers"
import { enrichWildcardFeaturePresets } from "@/lib/compendium/enrich-srd-class-features"
import { detectFeatureModifiers } from "@/lib/import/detect-feature-modifiers"
import { enrichImportedClassRow } from "@/lib/import/enrich-import-classes"
import type { Feature } from "@/lib/types"

const SLIPPERY_MIND_TEXT =
  "Whenever you are forced to make an Intelligence, Wisdom, or Charisma saving throw, you gain a bonus to your roll equal to your Exploit Die."

const STROKE_OF_LUCK_TEXT =
  "When you fail an ability check or attack roll, you can turn the roll into a 20. After you do so, you must finish a short or long rest before you can use it again."

const CUNNING_STRIKE_ALT_TEXT =
  "When you deal Sneak Attack damage, you can expend one or more of the Sneak Attack dice to activate Exploits you know, spending dice equal to each Exploit's degree."

const EXPERTISE_L1_TEXT =
  "Choose any combination of two skill and tool proficiencies. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies."

const EXPERTISE_MILESTONE_TEXT =
  "Another skill or tool proficiency of your choice gains this benefit."

const BLINDSENSE_TEXT =
  "At 14th level, you gain Blindsense out to a range of 10 feet. At 17th level, this range increases to 20 feet. At 20th level, this range increases to 30 feet."

describe("Alternate Rogue import wiring", () => {
  it("detects Slippery Mind resource-die save bonus phrasing", () => {
    const detections = detectFeatureModifiers(SLIPPERY_MIND_TEXT, {
      contentKind: "class_feature",
      sourceName: "Alternate Rogue",
      featureName: "Slippery Mind",
      level: 15,
    })
    const hit = detections.find((row) => row.ruleId === "check.bonus.resource_die")
    expect(hit).toBeDefined()
    const effects = hit?.instance.activation?.effects ?? []
    expect(effects).toHaveLength(3)
    expect(effects[0]?.bonusConfig).toMatchObject({
      mode: "die",
      dieScaling: "class_resource",
      classResourceKey: "exploit_dice",
    })
  })

  it("does not treat unrelated bonus-to-your-roll prose as resource-die bonus", () => {
    const detections = detectFeatureModifiers(
      "You gain a +1 bonus to your roll when making a Dexterity (Stealth) check.",
      {
        contentKind: "class_feature",
        sourceName: "Alternate Rogue",
        featureName: "Nimble",
      },
    )
    expect(detections.some((row) => row.ruleId === "check.bonus.resource_die")).toBe(false)
  })

  it("detects Stroke of Luck short-or-long rest reuse phrasing", () => {
    const detections = detectFeatureModifiers(STROKE_OF_LUCK_TEXT, {
      contentKind: "class_feature",
      sourceName: "Alternate Rogue",
      featureName: "Stroke of Luck",
      level: 20,
    })
    const hit = detections.find((row) => row.ruleId === "uses.once_short_long_rest")
    expect(hit).toBeDefined()
    const uses = hit?.instance.characteristics?.[0]
    expect(uses?.type).toBe("uses")
    expect((uses as { uses?: { fixedAmount?: number; recharges?: unknown[] } }).uses).toMatchObject({
      fixedAmount: 1,
      recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
    })
  })

  it("does not treat generic rest prose without feature reuse anchor as once-per-rest uses", () => {
    const detections = detectFeatureModifiers(
      "You must finish a short or long rest before you can cast this spell again.",
      {
        contentKind: "class_feature",
        sourceName: "Alternate Rogue",
        featureName: "Unrelated",
      },
    )
    expect(detections.some((row) => row.ruleId === "uses.once_short_long_rest")).toBe(false)
  })

  it("skips SRD Cunning Strike riders for Exploit-based Cunning Strike text", () => {
    const feature = enrichWildcardFeaturePresets({
      level: 9,
      name: "Cunning Strike",
      description: CUNNING_STRIKE_ALT_TEXT,
    } as Feature)
    const json = JSON.stringify(feature.linkedModifiers ?? [])
    expect(json).not.toContain("Poison")
    expect(json).not.toContain("Trip")
    expect(json).not.toContain("Withdraw")
    expect(json).not.toContain("bonusRiderOptions")
  })

  it("still wires SRD Cunning Strike riders for SRD-style text", () => {
    const feature = enrichWildcardFeaturePresets({
      level: 9,
      name: "Cunning Strike",
      description:
        "When you use Sneak Attack, you can add one of the following Cunning Strike effects, each of which costs 1d6 from your Sneak Attack damage: Poison, Trip, or Withdraw.",
    } as Feature)
    const json = JSON.stringify(feature.linkedModifiers ?? [])
    expect(json).toContain("Poison")
  })

  it("yields six total Expertise picks across five milestone features", () => {
    const features: Feature[] = [
      { level: 1, name: "Expertise", description: EXPERTISE_L1_TEXT },
      { level: 6, name: "Expertise", description: EXPERTISE_MILESTONE_TEXT },
      { level: 10, name: "Expertise", description: EXPERTISE_MILESTONE_TEXT },
      { level: 15, name: "Expertise", description: EXPERTISE_MILESTONE_TEXT },
      { level: 18, name: "Expertise", description: EXPERTISE_MILESTONE_TEXT },
    ].map((row) => enrichWildcardFeaturePresets(row as Feature))

    let totalPicks = 0
    for (const feature of features) {
      const sharedGroups = new Set<string>()
      for (const inst of feature.linkedModifiers ?? []) {
        for (const mod of inst.characteristics ?? []) {
          if (mod.sharedChoiceGroup) {
            if (sharedGroups.has(mod.sharedChoiceGroup)) continue
            sharedGroups.add(mod.sharedChoiceGroup)
            totalPicks += mod.sharedChoiceCount ?? 0
          } else if (mod.type === "skills" && mod.choiceCount) {
            totalPicks += mod.choiceCount
          }
        }
      }
    }
    expect(totalPicks).toBe(6)
  })

  it("keeps SRD Rogue Expertise at four total picks", () => {
    const features = [1, 6].map((level) =>
      enrichWildcardFeaturePresets({
        level,
        name: "Expertise",
        description:
          level === 1
            ? "Choose two of your skill proficiencies. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies."
            : "Choose two more of your skill proficiencies. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies.",
      } as Feature),
    )

    let totalPicks = 0
    for (const feature of features) {
      for (const inst of feature.linkedModifiers ?? []) {
        for (const mod of inst.characteristics ?? []) {
          if (mod.choiceCount) totalPicks += mod.choiceCount
        }
      }
    }
    expect(totalPicks).toBe(4)
  })

  it("wires Blindsense with by-level range tiers", () => {
    const feature = enrichWildcardFeaturePresets({
      level: 14,
      name: "Blindsense",
      description: BLINDSENSE_TEXT,
    } as Feature)
    const vision = feature.linkedModifiers?.[0]?.characteristics?.[0]
    expect(vision?.type).toBe("vision")
    expect(vision?.rangeFeetByLevel?.map((row) => row.level)).toEqual([14, 17, 20])
    expect(vision?.rangeFeetByLevel?.map((row) => row.fixed)).toEqual([10, 20, 30])

    const at14 = aggregateCharacteristics(
      [{ type: "vision", visionType: "blindsight", rangeFeet: 10, rangeFeetByLevel: vision?.rangeFeetByLevel ?? [] }],
      { characterLevel: 14 },
    )
    const at17 = aggregateCharacteristics(
      [{ type: "vision", visionType: "blindsight", rangeFeet: 10, rangeFeetByLevel: vision?.rangeFeetByLevel ?? [] }],
      { characterLevel: 17 },
    )
    const at20 = aggregateCharacteristics(
      [{ type: "vision", visionType: "blindsight", rangeFeet: 10, rangeFeetByLevel: vision?.rangeFeetByLevel ?? [] }],
      { characterLevel: 20 },
    )
    expect(at14.vision[0]?.rangeFeet).toBe(10)
    expect(at17.vision[0]?.rangeFeet).toBe(20)
    expect(at20.vision[0]?.rangeFeet).toBe(30)
  })

  it("round-trips class starting equipment through import enrichment", () => {
    const row = enrichImportedClassRow(
      {
        name: "Alternate Rogue",
        description: "A skilled infiltrator.",
        hit_die: 8,
        features: [],
        starting_equipment_groups: [
          {
            description: "You start with the following equipment, in addition to the equipment granted by your background:",
            options: [
              {
                label: "(a) a rapier; or (b) a scimitar; or (c) a shortsword",
                items: [{ name: "Rapier", quantity: 1 }],
              },
              {
                label: "(a) a shortbow and quiver of 20 arrows; or (b) a shortsword",
                items: [{ name: "Shortbow", quantity: 1 }, { name: "Quiver", quantity: 1 }],
              },
              {
                label: "(a) a burglar's pack; or (b) a dungeoneer's pack",
                items: [{ name: "Burglar's Pack", quantity: 1 }],
              },
            ],
          },
          {
            description: "You also start with leather armor, two daggers, and a set of tools.",
            options: [
              {
                label: "Fixed",
                items: [
                  { name: "Leather Armor", quantity: 1 },
                  { name: "Dagger", quantity: 2 },
                ],
              },
            ],
          },
        ],
      },
      [],
    )
    const groups = row.starting_equipment_groups as { options: unknown[] }[]
    expect(groups).toHaveLength(2)
    expect(groups[0]?.options).toHaveLength(3)
    expect(groups[1]?.options[0]).toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({ name: "Leather Armor" }),
      ]),
    })
  })
})

describe("collectFeatureUsesResources catalog safety", () => {
  it("accepts an empty catalog without throwing", async () => {
    const { collectFeatureUsesResources } = await import("@/lib/character/collect-feature-uses-resources")
    expect(
      collectFeatureUsesResources(
        [
          {
            row: { class_id: "cls_1", level: 5, subclass_id: null },
            class: {
              name: "Rogue",
              features: [
                {
                  level: 5,
                  name: "Stroke of Luck",
                  description: STROKE_OF_LUCK_TEXT,
                  modifierRefs: ["cat_char_uses"],
                },
              ],
            },
          },
        ],
        [],
      ),
    ).toEqual([])
  })
})
