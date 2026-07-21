import { describe, expect, it } from "vitest"
import { getSheetToggleDefinition } from "@/lib/compendium/sheet-toggle-registry"
import { detectFeatureModifiers } from "@/lib/import/detect-feature-modifiers"
import {
  detectRiskDieCost,
  enrichImportedClassRow,
  mergeTableParsedClassResources,
} from "@/lib/import/enrich-import-classes"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import { buildImportCollisions } from "@/lib/import/import-collisions"
import { parseClassProgressionTable } from "@/lib/import/parse-class-progression-table"
import { THIRD_PARTY_RESOURCE_PATTERNS } from "@/lib/import/third-party-resources"
import type { ImportContent } from "@/lib/import/content-schema"
import type { Feature } from "@/lib/types"

const classCtx = { contentKind: "class_feature" as const, sourceName: "Test" }

describe("MHP batch wiring (Risk / Martyr / Thralls / Warden)", () => {
  it("registers risk_dice, spell_uses, interrupt, and thrall caps", () => {
    const keys = THIRD_PARTY_RESOURCE_PATTERNS.map((row) => row.resourceKey)
    expect(keys).toEqual(
      expect.arrayContaining([
        "risk_dice",
        "spell_uses",
        "interrupt",
        "thralls",
        "thrall_cr_total",
      ]),
    )
    expect(detectRiskDieCost("expend one Risk Die as a Bonus Action")).toBe(1)
    expect(detectRiskDieCost("expend 2 Risk Dice to restore Headshot")).toBe(2)
  })

  it("parses Risk Dice and links spend on Gunslinger features", () => {
    const description = `<table>
<tr><th>Level</th><th>Features</th><th>Risk Dice</th></tr>
<tr><td>2nd</td><td>Risk</td><td>4d8</td></tr>
<tr><td>5th</td><td>Extra Attack</td><td>5d8</td></tr>
</table>`
    const resources = mergeTableParsedClassResources({
      classes: [{ name: "Gunslinger", description }],
    } as ImportContent)
    const risk = resources.find((row) => row.resource_key === "risk_dice")
    expect(risk?.uses.atLevelTable).toEqual(
      expect.arrayContaining([
        { level: 2, count: 4 },
        { level: 5, count: 5 },
      ]),
    )
    expect(risk?.uses.rechargeOnInitiative).toBeUndefined()

    const row = enrichImportedClassRow(
      {
        name: "Gunslinger",
        description,
        features: [
          {
            level: 2,
            name: "Dodge Roll",
            description: "You can expend one Risk Die as a Bonus Action to move.",
          },
        ],
      },
      resources,
    )
    const feature = (row.features as Feature[]).find((f) => f.name === "Dodge Roll")
    expect(feature?.limitedUses?.classResourceKey).toBe("risk_dice")
  })

  it("sets Risk Dice rechargeOnInitiative when Dire Gambit is present", () => {
    const content = applyImportEnrichmentPresets(
      {
        classes: [
          {
            name: "Gunslinger",
            features: [{ level: 15, name: "Dire Gambit", description: "Regain one Risk Die." }],
          },
        ],
        class_resources: [
          {
            class_name: "Gunslinger",
            resource_key: "risk_dice",
            name: "Risk Dice",
            uses: {
              type: "at_level",
              atLevelMode: "tier",
              atLevelTable: [{ level: 2, count: 4 }],
              recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
            },
          },
        ],
      } as ImportContent,
      new Set(["gunslinger"]),
    )
    expect(
      (content.class_resources?.[0]?.uses as { rechargeOnInitiative?: boolean | number })
        ?.rechargeOnInitiative,
    ).toBe(1)
  })

  it("parses Martyr Spell Uses and Necromancer thrall caps including CR fractions", () => {
    const martyr = mergeTableParsedClassResources({
      classes: [
        {
          name: "Martyr",
          description: `<table>
<tr><th>Level</th><th>Features</th><th>Spell Uses</th></tr>
<tr><td>1st</td><td>Spellcasting</td><td>2</td></tr>
<tr><td>5th</td><td>Extra Attack</td><td>5</td></tr>
</table>`,
        },
      ],
    } as ImportContent)
    expect(martyr.find((r) => r.resource_key === "spell_uses")?.uses.recharges).toEqual([
      { rest: "long_rest" },
    ])

    const necroDesc = `<table>
<tr><th>Level</th><th>Thralls</th><th>CR Total</th></tr>
<tr><td>2nd</td><td>1</td><td>1/4</td></tr>
<tr><td>5th</td><td>2</td><td>1</td></tr>
</table>`
    const parsed = parseClassProgressionTable(necroDesc)
    expect(parsed?.columns.map((c) => c.resourceKey)).toEqual(
      expect.arrayContaining(["thralls", "thrall_cr_total"]),
    )
    const cr = parsed?.columns.find((c) => c.resourceKey === "thrall_cr_total")
    expect(cr?.valuesByLevel).toEqual(
      expect.arrayContaining([
        { level: 2, count: 0.25 },
        { level: 5, count: 1 },
      ]),
    )
  })

  it("parses MHP Warden Interrupt and gates Bloodied resistance", () => {
    const resources = mergeTableParsedClassResources({
      classes: [
        {
          name: "Warden",
          description: `<table>
<tr><th>Level</th><th>Features</th><th>Interrupt</th><th>Weapon Mastery</th></tr>
<tr><td>5th</td><td>Interrupt</td><td>3</td><td>3</td></tr>
<tr><td>9th</td><td>Survive</td><td>4</td><td>3</td></tr>
</table>`,
        },
      ],
    } as ImportContent)
    const interrupt = resources.find((r) => r.resource_key === "interrupt")
    expect(interrupt?.uses.type).toBe("at_level")
    expect(interrupt?.uses.recharges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rest: "short_rest", amount: 1 }),
        expect.objectContaining({ rest: "long_rest" }),
      ]),
    )

    const detections = detectFeatureModifiers(
      "While you are Bloodied, you have Resistance to Bludgeoning, Piercing, and Slashing damage.",
      { ...classCtx, featureName: "Unyielding Resolve", sourceName: "Warden" },
    )
    const res = detections.find((row) => row.ruleId === "resistance.damage")
    expect(res?.instance.characteristics?.[0]).toMatchObject({
      type: "damage_resistance",
      requiresSheetToggle: "below_half_hp",
    })
    expect(getSheetToggleDefinition("below_half_hp")?.label).toBe("Bloodied")
  })

  it("suggests Mage Hand Press Warden when colliding with an existing Warden", () => {
    const collisions = buildImportCollisions(
      { classes: [{ name: "Warden", features: [] }] } as unknown as ImportContent,
      { class: [{ name: "Warden", source: "KibblesTasty" }] },
    )
    expect(collisions).toHaveLength(1)
    expect(collisions[0]?.suggestedName).toBe("Mage Hand Press Warden")
    expect(collisions[0]?.suggestedResourcePrefix).toBe("mage_hand_press_warden")
  })

  it("wires Guardian Tactics as a free Block/Challenge/Grasp menu", () => {
    const content = applyImportEnrichmentPresets(
      {
        classes: [
          {
            name: "Warden",
            features: [
              {
                level: 2,
                name: "Guardian Tactics",
                description:
                  "Block. As a Bonus Action, you can choose one ally. Challenge. Grasp.",
              },
            ],
          },
        ],
      } as ImportContent,
      new Set(["mhp_warden"]),
    )
    const feature = content.classes?.[0]?.features?.find((f) => f.name === "Guardian Tactics") as
      | Feature
      | undefined
    const menu = feature?.linkedModifiers
      ?.flatMap((mod) => mod.characteristics ?? [])
      .find((char) => char.type === "resource_ability_menu")
    expect(menu).toMatchObject({
      type: "resource_ability_menu",
      resourceKey: "guardian_tactics",
      waiveResourceCost: true,
    })
    if (menu?.type === "resource_ability_menu") {
      expect(menu.options?.map((opt) => opt.name)).toEqual([
        "Block",
        "Challenge",
        "Grasp",
        "Extended Tactics",
      ])
    }
    expect(content.class_resources?.some((row) => row.resource_key === "guardian_tactics")).toBe(
      true,
    )
  })
})
