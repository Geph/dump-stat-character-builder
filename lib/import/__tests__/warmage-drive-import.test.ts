import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { resolveHomebrewImportJsonPath } from "@/lib/import/homebrew-import-ops"
import { collectImportModifierReview } from "@/lib/import/import-modifier-previews"
import { parseImportContentJson } from "@/lib/import/parse-import-content-json"
import type { Feature } from "@/lib/types"

const PATH = resolveHomebrewImportJsonPath("magehandpress-warmage-class")
const hasDriveFixture = Boolean(PATH)

function load() {
  return parseImportContentJson(readFileSync(PATH!, "utf8"))!
}

function enrich() {
  return enrichImportContentModifiers(applyImportEnrichmentPresets(load()))
}

function classFeature(content: ReturnType<typeof enrich>, name: string): Feature | undefined {
  return content.classes?.[0]?.features?.find((f) => f.name === name) as Feature | undefined
}

function subclassFeature(
  content: ReturnType<typeof enrich>,
  subclassName: string,
  featureName: string,
): Feature | undefined {
  const sc = content.subclasses?.find((s) => s.name === subclassName)
  return sc?.features?.find((f) => f.name === featureName) as Feature | undefined
}

function chars(feature: Feature | undefined) {
  return feature?.linkedModifiers?.flatMap((m) => m.characteristics ?? []) ?? []
}

describe.skipIf(!hasDriveFixture)("Warmage Drive import wiring", () => {
  it("has zero unwired review rows", () => {
    const content = enrich()
    const rows = collectImportModifierReview(content)
    const unwired = rows.filter((r) => r.status === "unwired")
    expect(unwired, JSON.stringify(unwired, null, 2)).toHaveLength(0)
  })

  it("Arcane Surge / Improvement / Master Warmage have no competing AI-parsed uses", () => {
    const content = enrich()
    const surge = classFeature(content, "Arcane Surge")
    const surgeUses = chars(surge).filter((c) => c.type === "uses")
    expect(surgeUses).toHaveLength(0)
    expect(surge?.limitedUses).toMatchObject({ type: "class_resource", classResourceKey: "arcane_surge" })

    const improvement = classFeature(content, "Arcane Surge Improvement")
    expect(chars(improvement).filter((c) => c.type === "uses")).toHaveLength(0)

    const master = classFeature(content, "Master Warmage")
    expect(chars(master).filter((c) => c.type === "uses")).toHaveLength(0)
  })

  it("Warmage Tricks does not get a false spells_known characteristic", () => {
    const content = enrich()
    const tricks = classFeature(content, "Warmage Tricks")
    expect(chars(tricks).some((c) => c.type === "spells_known")).toBe(false)
  })

  it("Arcane Initiation grants named cantrips per option", () => {
    const content = enrich()
    const feature = classFeature(content, "Arcane Initiation")
    const adventurer = feature?.choices?.options?.find((o) => o.name === "Adventurer") as
      | { linkedModifiers?: Feature["linkedModifiers"] }
      | undefined
    const spellsKnown = adventurer?.linkedModifiers
      ?.flatMap((m) => m?.characteristics ?? [])
      .find((c) => c?.type === "spells_known") as { spells?: { spellId: string }[] } | undefined
    expect(spellsKnown?.spells?.map((s) => s.spellId)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Mage Hand"),
        expect.stringContaining("Ray of Frost"),
      ]),
    )
  })

  it("Mystical Companion grant_creature has creatureNames", () => {
    const content = enrich()
    const feature = subclassFeature(content, "House of Bishops", "Mystical Companion")
    const grant = chars(feature).find((c) => c.type === "grant_creature") as
      | { creatureNames?: string[] }
      | undefined
    expect(grant?.creatureNames).toEqual(
      expect.arrayContaining(["Imp", "Pseudodragon", "Quasit", "Sprite"]),
    )
  })

  it("Deck of Fate has no false ac/speed/temp-hp grants (power_rider instead)", () => {
    const content = enrich()
    const feature = subclassFeature(content, "House of Cards", "Deck of Fate")
    expect(chars(feature).some((c) => c.type === "ac")).toBe(false)
    expect(chars(feature).some((c) => c.type === "speed")).toBe(false)
    const effects = feature?.linkedModifiers?.flatMap(
      (m) => (m as unknown as { activation?: { effects?: { kind?: string }[] } }).activation?.effects ?? [],
    )
    expect(effects?.some((e) => e.kind === "grant_temp_hp")).toBe(false)
    expect(chars(feature).some((c) => c.type === "power_rider")).toBe(true)
  })

  it("Bullseye has no unconditional damage_roll_modifiers (power_rider instead)", () => {
    const content = enrich()
    const feature = subclassFeature(content, "House of Darts", "Bullseye")
    expect(chars(feature).some((c) => c.type === "damage_roll_modifiers")).toBe(false)
    expect(chars(feature).some((c) => c.type === "power_rider")).toBe(true)
  })

  it("Tactical Master has an ally save aura, not a false weapon-mastery attack mod", () => {
    const content = enrich()
    const feature = subclassFeature(content, "House of Kings", "Tactical Master")
    expect(chars(feature).some((c) => c.type === "attack_roll_modifiers")).toBe(false)
    const aura = chars(feature).find((c) => c.type === "aura") as
      | { affectsAllies?: boolean; radiusFeet?: number }
      | undefined
    expect(aura).toMatchObject({ affectsAllies: true, radiusFeet: 10 })
  })

  it("Dice of Fate links limitedUses to class_resources.dice_of_fate", () => {
    const content = enrich()
    const feature = subclassFeature(content, "House of Dice", "Dice of Fate")
    expect(feature?.limitedUses).toMatchObject({
      type: "class_resource",
      classResourceKey: "dice_of_fate",
    })
  })

  it("Covert Magic wires each spell as an independent free cast per Long Rest", () => {
    const content = enrich()
    const feature = subclassFeature(content, "House of Rooks", "Covert Magic")
    expect(chars(feature).filter((c) => c.type === "uses")).toHaveLength(0)
    const spellsKnown = chars(feature).find((c) => c.type === "spells_known") as
      | { freeCastPerLongRest?: { spellName: string; count: number }[] }
      | undefined
    expect(spellsKnown?.freeCastPerLongRest?.map((r) => r.spellName)).toEqual(
      expect.arrayContaining(["Feather Fall", "Invisibility", "Knock", "Silence", "Spider Climb"]),
    )
  })

  it("Intercepting Shot, Roll the Bones, and Fleeting Decoy are wired as reactions", () => {
    const content = enrich()
    expect(subclassFeature(content, "House of Darts", "Intercepting Shot")?.activation?.reaction).toBe(true)
    expect(subclassFeature(content, "House of Dice", "Roll the Bones")?.activation?.reaction).toBe(true)
    expect(subclassFeature(content, "House of Rooks", "Fleeting Decoy")?.activation?.reaction).toBe(true)
  })

  it("Field of Blades and Chaos Roll are wired as actions", () => {
    const content = enrich()
    expect(subclassFeature(content, "House of Knights", "Field of Blades")?.activation?.action).toBe(true)
    expect(subclassFeature(content, "House of Dice", "Chaos Roll")?.activation?.action).toBe(true)
  })

  it("Siege Casting, Arcane Dominance, and Multidiscipline carry power_rider reminders", () => {
    const content = enrich()
    expect(
      chars(subclassFeature(content, "House of Bishops", "Siege Casting")).some(
        (c) => c.type === "power_rider",
      ),
    ).toBe(true)
    expect(
      chars(subclassFeature(content, "House of Bishops", "Arcane Dominance")).some(
        (c) => c.type === "power_rider",
      ),
    ).toBe(true)
    expect(
      chars(subclassFeature(content, "House of Pawns", "Multidiscipline")).some(
        (c) => c.type === "power_rider",
      ),
    ).toBe(true)
  })

  it("Promotion's Adaptive Magic option carries a power_rider explaining the extra pick", () => {
    const content = enrich()
    const promotion = subclassFeature(content, "House of Pawns", "Promotion")
    const option = promotion?.choices?.options?.find((o) => o.name === "Adaptive Magic") as
      | { linkedModifiers?: Feature["linkedModifiers"] }
      | undefined
    const rider = option?.linkedModifiers
      ?.flatMap((m) => m.characteristics ?? [])
      .find((c) => c.type === "power_rider")
    expect(rider).toBeTruthy()
  })

  it("legitimately narrative Warmage features are classified structural, not unwired", () => {
    const content = enrich()
    const rows = collectImportModifierReview(content)
    const structuralNames = [
      "Reliable Cantrip",
      "Arcane Surge Improvement",
      "Master Warmage",
      "Spell Sculpting",
      "High Stakes",
      "Card Reading",
      "Ace in the Hole",
      "Loaded Dice",
      "Twisted Fate",
      "Steal Luck",
      "Grandmaster",
      "Tactical Maneuver",
      "Vanishing Toss",
      "Elusive Step",
      "Pawn Wall",
      "Fundamental Mastery",
      "Lead from the Front",
      "Checkmate [Maneuver]",
    ]
    for (const name of structuralNames) {
      const row = rows.find((r) => r.featureName === name)
      expect(row?.status, `${name} status`).toBe("structural")
    }
  })
})
