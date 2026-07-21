import { describe, expect, it } from "vitest"
import { getSheetToggleDefinition } from "@/lib/compendium/sheet-toggle-registry"
import { detectFeatureModifiers } from "@/lib/import/detect-feature-modifiers"
import {
  detectBattleDieCost,
  detectDanceCost,
  detectDanceDieCost,
  enrichImportedClassRow,
  mergeTableParsedClassResources,
} from "@/lib/import/enrich-import-classes"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import { parseClassProgressionTable } from "@/lib/import/parse-class-progression-table"
import { THIRD_PARTY_RESOURCE_PATTERNS } from "@/lib/import/third-party-resources"
import type { ImportContent } from "@/lib/import/content-schema"
import type { Feature } from "@/lib/types"

const classCtx = {
  contentKind: "class_feature" as const,
  sourceName: "Test",
}

const MHP_PACKS = new Set(["warmage", "dancer", "vagabond"])

describe("MHP Warmage / Dancer / Vagabond wiring", () => {
  it("registers dances, dance_die, battle_dice initiative, and warmage pools", () => {
    const keys = THIRD_PARTY_RESOURCE_PATTERNS.map((row) => row.resourceKey)
    expect(keys).toEqual(
      expect.arrayContaining([
        "dances",
        "dance_die",
        "battle_dice",
        "cantrip_bonus_dice",
        "arcane_surge",
        "tricks_known",
      ]),
    )
    const battle = THIRD_PARTY_RESOURCE_PATTERNS.find((row) => row.resourceKey === "battle_dice")
    expect(battle?.defaultUses?.rechargeOnInitiative).toBe(true)
    expect(getSheetToggleDefinition("while_dancing")?.label).toBe("Dancing")
    expect(getSheetToggleDefinition("below_half_hp")?.label).toBe("Bloodied")
  })

  it("detects dance and battle die spends", () => {
    expect(detectDanceCost("You can expend 2 Dance uses to restore Grand Finale")).toBe(2)
    expect(detectDanceDieCost("expend one Dance Die and add it to your AC")).toBe(1)
    expect(detectDanceDieCost("add your Dance Die to your AC")).toBeNull()
    expect(detectBattleDieCost("expend a Battle Die to use this maneuver")).toBe(1)
  })

  it("parses Battle Dice with initiative recharge from a table", () => {
    const description = `<table>
<tr><th>Level</th><th>PB</th><th>Features</th><th>Maneuvers</th><th>Battle Dice</th></tr>
<tr><td>1st</td><td>+2</td><td>Secret</td><td>3</td><td>2d6</td></tr>
<tr><td>5th</td><td>+3</td><td>Extra Attack</td><td>5</td><td>3d8</td></tr>
</table>`
    const content = {
      classes: [{ name: "Vagabond", description }],
    } as ImportContent
    const parsed = parseClassProgressionTable(description)
    expect(parsed?.columns.some((col) => col.resourceKey === "battle_dice")).toBe(true)

    const resources = mergeTableParsedClassResources(content)
    const battleDice = resources.find(
      (row) => row.class_name === "Vagabond" && row.resource_key === "battle_dice",
    )
    expect(battleDice?.uses.rechargeOnInitiative).toBe(true)
    expect(battleDice?.uses.atLevelTable).toEqual(
      expect.arrayContaining([
        { level: 1, count: 2 },
        { level: 5, count: 3 },
      ]),
    )
  })

  it("parses Dances and Dance Die columns", () => {
    const description = `<table>
<tr><th>Level</th><th>Features</th><th>Dances</th><th>Dance Die</th></tr>
<tr><td>2nd</td><td>Dance</td><td>2</td><td>d4</td></tr>
<tr><td>5th</td><td>Extra Attack</td><td>3</td><td>d6</td></tr>
<tr><td>11th</td><td>Grand Finale</td><td>4</td><td>d8</td></tr>
</table>`
    const content = {
      classes: [{ name: "Dancer", description }],
    } as ImportContent
    const resources = mergeTableParsedClassResources(content)
    const dances = resources.find((row) => row.resource_key === "dances")
    const danceDie = resources.find((row) => row.resource_key === "dance_die")
    expect(dances?.uses.type).toBe("at_level")
    expect(dances?.uses.recharges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rest: "short_rest", amount: 1 }),
        expect.objectContaining({ rest: "long_rest" }),
      ]),
    )
    expect(danceDie?.uses.type).toBe("special")
    expect(danceDie?.uses.dieType).toBe("d8")
  })

  it("wires Warmage Edge and Graceful Dodge presets", () => {
    const edge = applyImportEnrichmentPresets(
      {
        classes: [
          {
            name: "Warmage",
            features: [
              {
                level: 1,
                name: "Warmage Edge",
                description: "Once per turn add INT to a cantrip damage roll.",
              },
            ],
          },
        ],
      } as ImportContent,
      MHP_PACKS,
    )
    const edgeFeatures = (edge.classes?.[0]?.features ?? []) as Feature[]
    const edgeFeature = edgeFeatures.find((f) => f.name === "Warmage Edge")
    const edgeTypes = (edgeFeature?.linkedModifiers ?? []).flatMap((mod) =>
      (mod.characteristics ?? []).map((c) => c.type),
    )
    expect(edgeTypes).toContain("on_cast_spell_trigger")

    const dodgeRow = enrichImportedClassRow(
      {
        name: "Dancer",
        features: [
          {
            level: 2,
            name: "Graceful Dodge",
            description: "Add your Dance Die to your AC against one attack.",
          },
        ],
      },
      [],
    )
    const dodgeFeatures = (dodgeRow.features ?? []) as Feature[]
    const dodgeFeature = dodgeFeatures.find((f) => f.name === "Graceful Dodge")
    const dodgeTypes = (dodgeFeature?.linkedModifiers ?? []).flatMap((mod) =>
      (mod.characteristics ?? []).map((c) => c.type),
    )
    expect(dodgeTypes).toContain("resource_ability_menu")
  })

  it("gates Bloodied attack advantage with below_half_hp", () => {
    const detections = detectFeatureModifiers(
      "While you are Bloodied, you have Advantage on attack rolls.",
      { ...classCtx, featureName: "Desperate Attack", sourceName: "Vagabond" },
    )
    const adv = detections.find((row) => row.ruleId === "check.advantage.attack")
    expect(adv).toBeTruthy()
    const effects = adv?.instance.activation?.effects ?? []
    const limitations = effects.flatMap((fx) => fx.limitations ?? [])
    expect(limitations.some((lim) => lim.value === "below_half_hp")).toBe(true)
  })

  it("detects Dance Die AC bonus as dance_die resource menu", () => {
    const detections = detectFeatureModifiers(
      "You can add your Dance Die to your AC against that attack.",
      { ...classCtx, featureName: "Graceful Dodge", sourceName: "Dancer" },
    )
    const hit = detections.find((row) => row.ruleId === "check.bonus.resource_die")
    expect(hit).toBeTruthy()
    const chars = hit?.instance.characteristics ?? []
    expect(chars.some((c) => c.type === "resource_ability_menu")).toBe(true)
    const menu = chars.find((c) => c.type === "resource_ability_menu")
    if (menu?.type === "resource_ability_menu") {
      expect(menu.resourceKey).toBe("dance_die")
    }
  })

  it("gates while-dancing riders with while_dancing", () => {
    const detections = detectFeatureModifiers(
      "While you are dancing, you have Advantage on Dexterity saving throws.",
      { ...classCtx, featureName: "Dance Style Rider", sourceName: "Dancer" },
    )
    const adv = detections.find((row) => row.ruleId === "save.advantage")
    expect(adv).toBeTruthy()
    const effects = adv?.instance.activation?.effects ?? []
    const limitations = effects.flatMap((fx) => fx.limitations ?? [])
    expect(limitations.some((lim) => lim.value === "while_dancing")).toBe(true)
  })
})
