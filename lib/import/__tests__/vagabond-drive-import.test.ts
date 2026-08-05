import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { resolveHomebrewImportJsonPath } from "@/lib/import/homebrew-import-ops"
import { collectImportModifierReview } from "@/lib/import/import-modifier-previews"
import { parseImportContentJson } from "@/lib/import/parse-import-content-json"
import type { Feature } from "@/lib/types"

const PATH = resolveHomebrewImportJsonPath("magehandpress-vagabond-class")
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
  name: string,
): Feature | undefined {
  const sub = content.subclasses?.find((s) => s.name === subclassName)
  return sub?.features?.find((f) => f.name === name) as Feature | undefined
}

function characteristics(feature: Feature | undefined) {
  return feature?.linkedModifiers?.flatMap((m) => m.characteristics ?? []) ?? []
}

function effects(feature: Feature | undefined) {
  return (
    feature?.linkedModifiers?.flatMap(
      (m) =>
        (m as { effects?: unknown[]; activation?: { effects?: unknown[] } }).effects ??
        (m as { activation?: { effects?: unknown[] } }).activation?.effects ??
        [],
    ) ?? []
  )
}

describe.skipIf(!hasDriveFixture)("Vagabond Drive import wiring", () => {
  it("has zero unwired review rows after enrichment", () => {
    const content = enrich()
    const rows = collectImportModifierReview(content)
    const unwired = rows.filter((r) => r.status === "unwired")
    expect(unwired.map((r) => r.featureName)).toEqual([])
  })

  it("Mettle's evasion check uses Constitution, not Dexterity", () => {
    const content = enrich()
    const mettle = classFeature(content, "Mettle")
    const evasion = effects(mettle).find(
      (e) => (e as { kind?: string }).kind === "damage_reduction",
    ) as { checkAbility?: string; defensiveSaveScope?: boolean } | undefined
    expect(evasion?.defensiveSaveScope).toBe(true)
    expect(evasion?.checkAbility).toBe("Constitution")
  })

  it("Tenacity spends a Battle Die and adds a class-resource die to a save reroll", () => {
    const content = enrich()
    const tenacity = classFeature(content, "Tenacity")
    const usesCharacteristic = characteristics(tenacity).find((c) => c.type === "uses") as
      | { uses?: { type?: string; classResourceKey?: string } }
      | undefined
    expect(usesCharacteristic?.uses).toMatchObject({
      type: "class_resource",
      classResourceKey: "battle_dice",
    })
    const rollBonus = effects(tenacity).find(
      (e) => (e as { kind?: string }).kind === "check_roll_modifier",
    ) as { checkCategory?: string; bonusConfig?: { mode?: string; classResourceKey?: string } } | undefined
    expect(rollBonus?.checkCategory).toBe("save")
    expect(rollBonus?.bonusConfig).toMatchObject({ mode: "die", classResourceKey: "battle_dice" })
  })

  it("marks Desperate Survival, Deft Maneuver, and Wayworn as structural, not unwired", () => {
    const content = enrich()
    const rows = collectImportModifierReview(content)
    for (const name of ["Desperate Survival", "Deft Maneuver", "Wayworn"]) {
      const row = rows.find((r) => r.featureName === name)
      expect(row?.status).toBe("structural")
    }
  })

  it("Old Dog, New Tricks is not routed into the class-wide Tricks/knacks picker", () => {
    const content = enrich()
    // Battle Tactics is the real Maneuvers Known picker; it must keep its own
    // choiceCountByLevel and not be polluted by a second "Tricks"-named feature.
    const battleTactics = classFeature(content, "Battle Tactics")
    expect(battleTactics?.choices?.category).toBe("Maneuver")

    const oldDog = subclassFeature(content, "Houndmaster", "Old Dog, New Tricks")
    expect(oldDog?.isChoice).toBe(true)
    expect(oldDog?.choices?.optionsSource).toBe("class_knacks")
    expect(oldDog?.choices?.count).toBe(2)
  })

  it("Houndmaster gets its own hound_battle_dice class resource, distinct from battle_dice", () => {
    const content = enrich()
    const resources = content.class_resources ?? []
    const hound = resources.find((r) => r.resource_key === "hound_battle_dice")
    expect(hound?.subclass_name).toBe("Houndmaster")
    expect(resources.find((r) => r.resource_key === "battle_dice")?.subclass_name).toBeFalsy()
  })

  it("Grudge is a Bonus Action linked to the grudge_battle_die resource", () => {
    const content = enrich()
    const grudge = subclassFeature(content, "Rōnin", "Grudge")
    expect(grudge?.activation?.bonusAction).toBe(true)
    const resources = content.class_resources ?? []
    expect(resources.find((r) => r.resource_key === "grudge_battle_die")?.subclass_name).toBe("Rōnin")
  })

  it("Adrenaline grants adrenaline_battle_die at turn start while Bloodied", () => {
    const content = enrich()
    const adrenaline = subclassFeature(content, "Adrenaline Junkie", "Adrenaline")
    const trigger = characteristics(adrenaline).find((c) => c.type === "turn_start_trigger") as
      | { accrueResourceKey?: string; requiresSheetToggle?: string }
      | undefined
    expect(trigger?.accrueResourceKey).toBe("adrenaline_battle_die")
    expect(trigger?.requiresSheetToggle).toBe("below_half_hp")

    const resources = content.class_resources ?? []
    expect(resources.find((r) => r.resource_key === "adrenaline_battle_die")?.subclass_name).toBe(
      "Adrenaline Junkie",
    )
  })

  it("Adrenaline High adds an always-on grant alongside the base Bloodied-gated one", () => {
    const content = enrich()
    const adrenaline = subclassFeature(content, "Adrenaline Junkie", "Adrenaline")
    const baseTrigger = characteristics(adrenaline).find((c) => c.type === "turn_start_trigger") as
      | { requiresSheetToggle?: string }
      | undefined
    expect(baseTrigger?.requiresSheetToggle).toBe("below_half_hp")

    const adrenalineHigh = subclassFeature(content, "Adrenaline Junkie", "Adrenaline High")
    const ungatedTrigger = characteristics(adrenalineHigh).find(
      (c) => c.type === "turn_start_trigger",
    ) as { requiresSheetToggle?: string } | undefined
    expect(ungatedTrigger?.requiresSheetToggle).toBeFalsy()
    const rider = characteristics(adrenalineHigh).find((c) => c.type === "power_rider") as
      | { parentPowerNames?: string[] }
      | undefined
    expect(rider?.parentPowerNames).toContain("Adrenaline High")
  })

  it("Monster Meal has no permanent AC / Speed / condition-immunity grant on the base feature", () => {
    const content = enrich()
    const meal = subclassFeature(content, "Gourmand", "Monster Meal")
    const types = characteristics(meal).map((c) => c.type)
    expect(types).not.toContain("ac")
    expect(types).not.toContain("speed")
    expect(types).not.toContain("condition_immunity")
    // The creature-type table is instead modeled as a real choice pool.
    expect(meal?.isChoice).toBe(true)
    expect((meal?.choices?.options ?? []).length).toBeGreaterThan(0)
  })

  it("Desperate Companion grants Advantage to the hound, not the player", () => {
    const content = enrich()
    const companion = subclassFeature(content, "Houndmaster", "Desperate Companion")
    const types = characteristics(companion).map((c) => c.type)
    const fxKinds = effects(companion).map((e) => (e as { kind?: string }).kind)
    // No self check_roll_modifier granting the player Advantage on attacks.
    expect(types).not.toContain("check_advantage")
    expect(fxKinds.filter((k) => k === "check_roll_modifier")).toHaveLength(0)
    // Wired instead as a reminder on the Desperate Companion action itself.
    const rider = characteristics(companion).find((c) => c.type === "power_rider") as
      | { parentPowerNames?: string[] }
      | undefined
    expect(rider?.parentPowerNames).toContain("Desperate Companion")
  })

  it("Lone Wolf only grants initiative Advantage, not attack-roll Advantage", () => {
    const content = enrich()
    const loneWolf = subclassFeature(content, "Rōnin", "Lone Wolf")
    const rollModifiers = effects(loneWolf).filter(
      (e) => (e as { kind?: string }).kind === "check_roll_modifier",
    ) as { checkCategory?: string; checkRollMode?: string }[]
    expect(rollModifiers.some((m) => m.checkCategory === "initiative" && m.checkRollMode === "advantage")).toBe(
      true,
    )
    expect(rollModifiers.some((m) => m.checkCategory === "attack")).toBe(false)
  })

  it("Analgesic Remedy grants character-level-scaled Temporary Hit Points", () => {
    const content = enrich()
    const remedy = subclassFeature(content, "Plague Doctor", "Analgesic Remedy")
    const thp = effects(remedy).find((e) => (e as { kind?: string }).kind === "grant_temp_hp") as
      | { healMode?: string }
      | undefined
    expect(thp?.healMode).toBe("character_level")
  })
})
