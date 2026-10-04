import { describe, expect, it } from "vitest"
import { attachClassDetails } from "@/lib/character/character-classes"
import { collectSheetActions } from "@/lib/character/sheet-actions"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import { sanitizeVagabondImportContent } from "@/lib/import/enrichment-presets/packs/vagabond"
import { auditImportWiring, summarizeFindings } from "@/lib/import/homebrew-import-ops"
import type { ImportContent } from "@/lib/import/content-schema"
import type { DndClass, Feature, Subclass } from "@/lib/types"

function sampleVagabond(): ImportContent {
  return {
    classes: [
      {
        name: "Vagabond",
        features: [
          {
            level: 1,
            name: "Battle Tactics",
            description: "Learn maneuvers fueled by Battle Dice.",
            isChoice: true,
            choices: {
              category: "Maneuver",
              count: 3,
              resourceKey: "maneuvers_known",
              optionsSource: "class_knacks",
              options: [],
              choiceCountByLevel: [
                { level: 1, count: 3 },
                { level: 2, count: 4 },
              ],
            },
          },
          {
            level: 2,
            name: "Desperate Attack",
            description: "You have Advantage on attack rolls while you are Bloodied.",
          },
        ],
      },
    ],
    class_resources: [
      {
        class_name: "Vagabond",
        resource_key: "battle_dice",
        name: "Battle Dice",
        uses: {
          type: "at_level",
          atLevelMode: "tier",
          atLevelTable: [{ level: 1, count: 2 }],
          recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
          rechargeOnInitiative: true,
        },
      },
    ],
    subclasses: [
      {
        name: "Brigand",
        class_name: "Vagabond",
        features: [
          {
            level: 3,
            name: "Ambush [Maneuver]",
            description: "Expend one Battle Die to Ambush.",
          },
        ],
      },
      {
        name: "Mage Brand",
        class_name: "Vagabond",
        features: [
          {
            level: 3,
            name: "Spellbranding",
            description: "Cantrips and Spellbrand Spellcasting.",
            mechanics: [
              {
                kind: "spellcasting_ability",
                spellcastingAbility: "charisma",
                confidence: "high",
              },
              {
                kind: "spells_known",
                spellChoiceGrants: [{ level: 0, count: 2 }],
                spellChoiceLabel: "Sorcerer cantrips",
                confidence: "high",
              },
            ],
          },
        ],
      },
    ],
    import_proposals: {
      custom_abilities: [
        {
          proposal_id: "battle_edge",
          name: "Battle Edge",
          ability_role: "knack",
          source_type: "class",
          source_name: "Vagabond",
          description: "Expend one Battle Die.",
        },
        {
          proposal_id: "ambush",
          name: "Ambush",
          ability_role: "knack",
          source_type: "subclass",
          source_name: "Brigand",
          description: "Expend one Battle Die to Ambush.",
        },
      ],
    },
  } as ImportContent
}

describe("Vagabond enrichment sanitize", () => {
  it("strips Battle Tactics resourceKey and demotes subclass maneuver knacks", () => {
    const sanitized = sanitizeVagabondImportContent(sampleVagabond())
    const tactics = sanitized.classes?.[0]?.features?.find((f) => f.name === "Battle Tactics")
    expect(tactics?.choices?.optionsSource).toBe("class_knacks")
    expect(tactics?.choices?.resourceKey).toBeUndefined()

    const ambush = sanitized.import_proposals?.custom_abilities?.find((a) => a.name === "Ambush")
    expect(ambush?.ability_role).toBeUndefined()
    expect(sanitized.import_proposals?.custom_abilities?.find((a) => a.name === "Battle Edge")?.ability_role).toBe(
      "knack",
    )

    const brigand = sanitized.subclasses?.find((s) => s.name === "Brigand")
    const feat = brigand?.features?.find((f) => f.name === "Ambush [Maneuver]") as Feature | undefined
    const grant = feat?.linkedModifiers
      ?.flatMap((m) => m.characteristics ?? [])
      .find((c) => c.type === "grant_custom_ability") as { abilityNames?: string[] } | undefined
    expect(grant?.abilityNames).toEqual(["Ambush"])
  })

  it("adds Mage Brand level-10 cantrip grant", () => {
    const sanitized = sanitizeVagabondImportContent(sampleVagabond())
    const spellbrand = sanitized.subclasses
      ?.find((s) => s.name === "Mage Brand")
      ?.features?.find((f) => f.name === "Spellbranding")
    const grants = (spellbrand?.mechanics ?? []).flatMap((m) => {
      if (!m || typeof m !== "object" || Array.isArray(m)) return []
      const row = m as { kind?: string; spellChoiceGrants?: { level?: number; unlocksAtClassLevel?: number }[] }
      return row.kind === "spells_known" ? (row.spellChoiceGrants ?? []) : []
    })
    expect(grants.some((g) => g.level === 0 && g.unlocksAtClassLevel === 10)).toBe(true)
  })

  it("enrichment path leaves auditor with no errors", () => {
    const enriched = applyImportEnrichmentPresets(sampleVagabond())
    const findings = auditImportWiring(enriched)
    expect(summarizeFindings(findings).errors, JSON.stringify(findings, null, 2)).toBe(0)
    expect(findings.some((f) => f.id === "vagabond.subclass_maneuver_knack")).toBe(false)
    expect(findings.some((f) => f.id === "vagabond.battle_tactics_resource_key")).toBe(false)
  })
})

describe("Vagabond level-up features on the live sheet", () => {
  const feature = (level: number, name: string, description: string): Feature => ({
    level,
    name,
    description,
  })

  const vagabond = {
    id: "vag",
    name: "Vagabond",
    hit_die: 10,
    class_resources: [
      {
        id: "battle_dice",
        name: "Battle Dice",
        uses: { type: "at_level", atLevelMode: "tier", atLevelTable: [{ level: 1, count: 2 }] },
      },
    ],
    features: [
      feature(2, "Breather", "Spend a Hit Point Die to catch your breath and recover."),
      feature(3, "Overexertion", "With an empty pool you can push past your limit at a cost."),
      feature(9, "Last Stand", "When you would fall, you keep standing instead."),
      feature(17, "Deft Maneuver", "You gain an extra Bonus Action each turn, only for maneuvers."),
      feature(20, "Martial Recovery", "Catch a second wind for your Battle Dice."),
    ],
  } as unknown as DndClass

  function sheetFor(subclass: { name: string; features: Feature[] }) {
    const sub = { id: "sub", class_id: "vag", ...subclass } as unknown as Subclass
    const details = attachClassDetails(
      [{ class_id: "vag", subclass_id: "sub", level: 20, order: 0 } as never],
      [vagabond],
      [sub],
    )
    return collectSheetActions({ classDetails: details, species: null })
  }

  it("makes class features actionable on the Combat tab", () => {
    const actions = sheetFor({ name: "Brigand", features: [] })
    const byName = (name: string) => actions.find((action) => action.name === name)

    expect(byName("Breather")?.healEffects).toEqual(
      expect.arrayContaining([expect.objectContaining({ healMode: "hit_dice", healAbility: "CON" })]),
    )
    expect(byName("Last Stand")?.dropToOneHpOnUse).toBe(true)
    expect(byName("Last Stand")?.healEffects).toEqual(
      expect.arrayContaining([expect.objectContaining({ healMode: "character_level", healLevelMultiplier: 2 })]),
    )
    expect(byName("Martial Recovery")?.restoreClassResourceOnUse).toEqual({
      resourceKey: "battle_dice",
      amount: "all",
    })
    expect(byName("Overexertion")).toMatchObject({
      trigger: "When you have no Battle Dice",
      restoreClassResourceOnUse: { resourceKey: "battle_dice", amount: 1 },
    })
    // Passive action-economy grant: Features tab only, no inert Use button.
    expect(byName("Deft Maneuver")).toBeUndefined()
  })

  it("leaves subclass [Maneuver] cards to the granted ability and files consumables on Combat", () => {
    expect(
      sheetFor({
        name: "Brigand",
        features: [feature(3, "Ambush [Maneuver]", "You learn the Ambush maneuver.")],
      }).some((action) => action.name === "Ambush [Maneuver]"),
    ).toBe(false)

    const stim = sheetFor({
      name: "Adrenaline Junkie",
      features: [
        feature(
          3,
          "Stim Potion",
          "When you finish a Long Rest, you brew potions equal to your Constitution modifier. You drink one as a Bonus Action.",
        ),
      ],
    }).find((action) => action.name === "Stim Potion")
    expect(stim).toMatchObject({ kinds: ["bonus"], showOnCombatTab: true })

    const snack = sheetFor({
      name: "Gourmand",
      features: [feature(10, "Quick Snack", "At the start of your turn, eat a snack to catch your breath.")],
    }).find((action) => action.name === "Quick Snack")
    expect(snack?.showOnCombatTab).toBe(true)
    expect(snack?.alsoActivate?.map((entry) => entry.name)).toEqual(["Breather"])
  })
})
