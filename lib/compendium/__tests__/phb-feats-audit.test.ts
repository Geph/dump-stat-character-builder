import { describe, expect, it } from "vitest"
import { enrichCustomFeatRow } from "@/lib/compendium/enrich-custom-feats"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { aiMechanicsToDetections } from "@/lib/import/parse-ai-mechanics"

const PHB = "Player's Handbook"

function chars(row: Record<string, unknown>) {
  const linked = (row.linked_modifiers ?? row.linkedModifiers ?? []) as {
    characteristics?: { type: string; [k: string]: unknown }[]
    catalogRefId?: string
    activation?: { effects?: { kind?: string }[] }
  }[]
  return linked.flatMap((entry) => entry.characteristics ?? [])
}

function enrich(name: string, description = name, extras: Record<string, unknown> = {}) {
  return enrichCustomFeatRow({ name, source: PHB, description, ...extras })
}

describe("PHB feats wiring (Origin / General / Fighting Style)", () => {
  it("wires Origin staples: Alert, Tough, Lucky, Magic Initiate, Savage Attacker, Skilled", () => {
    const alert = enrich("Alert")
    expect(chars(alert).length + ((alert.linked_modifiers as unknown[])?.length ?? 0)).toBeGreaterThan(0)

    const tough = enrich("Tough")
    expect(chars(tough).some((c) => c.type === "hit_points")).toBe(true)

    const lucky = enrich("Lucky")
    const luckyUses = chars(lucky).find((c) => c.type === "uses")
    expect(luckyUses).toMatchObject({ uses: { type: "proficiency" } })

    const mi = enrich("Magic Initiate")
    expect(chars(mi).some((c) => c.type === "spells_known")).toBe(true)

    const savage = enrich("Savage Attacker")
    expect(((savage.linked_modifiers as { catalogRefId?: string }[]) ?? []).length).toBeGreaterThan(0)

    const skilled = enrich("Skilled")
    expect(chars(skilled).some((c) => c.type === "skills")).toBe(true)
  })

  it("wires Crafter / Musician / Tavern Brawler / Healer / ASI", () => {
    const crafter = enrich("Crafter")
    expect(chars(crafter).some((c) => c.type === "tool_proficiencies")).toBe(true)

    const musician = enrich("Musician")
    expect(chars(musician).some((c) => c.type === "tool_proficiencies")).toBe(true)

    const tavern = enrich("Tavern Brawler")
    expect(chars(tavern).some((c) => c.type === "unarmed_strike_damage")).toBe(true)

    const healer = enrich("Healer")
    expect(chars(healer).length).toBeGreaterThan(0)

    const asi = enrich(
      "Ability Score Improvement",
      "Increase one ability score of your choice by 2, or increase two ability scores of your choice by 1.",
    )
    const pool = chars(asi).find((c) => c.type === "ability_scores")
    expect(pool).toMatchObject({ mode: "asi_pool", points: 2 })
  })

  it("wires Durable death saves and Blind Fighting blindsight via presets", () => {
    const durable = enrich("Durable")
    const fx = ((durable.linked_modifiers as { activation?: { effects?: { checkCategory?: string }[] } }[]) ?? [])
      .flatMap((m) => m.activation?.effects ?? [])
    expect(fx.some((e) => e.checkCategory === "death_save")).toBe(true)

    const blind = enrich("Blind Fighting")
    const vision = chars(blind).find((c) => c.type === "vision")
    expect(vision).toMatchObject({ visionType: "blindsight", rangeFeet: 10 })
  })

  it("import applies name presets so review sees wired modifiers (not empty shells)", () => {
    const content = enrichImportContentModifiers({
      feats: [
        {
          name: "Ability Score Improvement",
          description:
            "Increase one ability score of your choice by 2, or increase two ability scores of your choice by 1.",
          category: "General",
          prerequisite: "Level 4+",
          mechanics: [
            {
              kind: "grant_feat",
              featCategories: ["General"],
              featCount: 1,
              sourcePhrase: "wrong",
              confidence: "high",
            },
          ],
        },
        {
          name: "Blind Fighting",
          description: "You have Blindsight with a range of 10 feet.",
          category: "Fighting Style",
          prerequisite: "Fighting Style Feature",
          mechanics: [
            {
              kind: "vision",
              visionRangeFeet: 10,
              sourcePhrase: "Blindsight 10 feet",
              confidence: "high",
            },
          ],
        },
        {
          name: "Alert",
          description: "You can add your Proficiency Bonus to Initiative rolls.",
          category: "Origin",
        },
        {
          name: "Tough",
          description: "Your Hit Point maximum increases by twice your character level.",
          category: "Origin",
        },
      ],
    })

    const byName = Object.fromEntries((content.feats ?? []).map((feat) => [feat.name, feat]))

    const asiLinked = (byName["Ability Score Improvement"] as { linkedModifiers?: unknown[] })
      ?.linkedModifiers ?? []
    expect(asiLinked.length).toBeGreaterThan(0)
    expect(chars(byName["Ability Score Improvement"] as Record<string, unknown>).some((c) => c.type === "ability_scores")).toBe(
      true,
    )
    expect(chars(byName["Ability Score Improvement"] as Record<string, unknown>).every((c) => c.type !== "grant_feat")).toBe(
      true,
    )

    expect(
      chars(byName["Blind Fighting"] as Record<string, unknown>).find((c) => c.type === "vision"),
    ).toMatchObject({ visionType: "blindsight", rangeFeet: 10 })

    expect(
      ((byName.Alert as { linkedModifiers?: unknown[] })?.linkedModifiers ?? []).length,
    ).toBeGreaterThan(0)
    expect(chars(byName.Tough as Record<string, unknown>).some((c) => c.type === "hit_points")).toBe(
      true,
    )
  })

  it("parses visionType blindsight and usesProficiency from AI mechanics", () => {
    const vision = aiMechanicsToDetections(
      [
        {
          kind: "vision",
          visionRangeFeet: 10,
          visionType: "blindsight",
          sourcePhrase: "Blindsight 10 feet",
          confidence: "high",
        },
      ],
      { contentKind: "feat", sourceName: "Blind Fighting", featureName: "Blind Fighting" },
    )
    expect(vision[0]?.instance.characteristics?.[0]).toMatchObject({
      type: "vision",
      visionType: "blindsight",
      rangeFeet: 10,
    })

    const uses = aiMechanicsToDetections(
      [
        {
          kind: "uses",
          usesProficiency: true,
          usesRecharge: "long_rest",
          sourcePhrase: "equal to your Proficiency Bonus",
          confidence: "high",
        },
      ],
      { contentKind: "feat", sourceName: "Lucky", featureName: "Lucky" },
    )
    expect(uses[0]?.instance.characteristics?.[0]).toMatchObject({
      type: "uses",
      uses: { type: "proficiency" },
    })
  })
})
