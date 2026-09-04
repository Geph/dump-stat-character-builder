import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import { sanitizeInvestigatorImportContent } from "@/lib/import/enrichment-presets/packs/investigator"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { applyClassSpellListsToImport } from "@/lib/import/class-spell-lists"
import { resolveHomebrewImportJsonPath } from "@/lib/import/homebrew-import-ops"
import { parseImportContentJson } from "@/lib/import/parse-import-content-json"
import type { Feature } from "@/lib/types"

const investigatorPath = resolveHomebrewImportJsonPath("magehandpress-investigator-class")
const martyrPath = resolveHomebrewImportJsonPath("magehandpress-martyr-class")
const hasInvestigator = Boolean(investigatorPath)
const hasMartyr = Boolean(martyrPath)

function load(name: string) {
  const path = resolveHomebrewImportJsonPath(name)!
  return parseImportContentJson(readFileSync(path, "utf8"))!
}

function enrich(name: string) {
  return enrichImportContentModifiers(applyClassSpellListsToImport(applyImportEnrichmentPresets(load(name))))
}

describe.skipIf(!hasInvestigator)("Investigator Drive import wiring", () => {
  it("remaps finisher_dice to finisher and strips Trinkets picker", () => {
    const content = enrich("magehandpress-investigator-class")
    expect(content.class_resources?.some((r) => r.resource_key === "finisher_dice")).toBe(false)
    const finisher = content.class_resources?.find((r) => r.resource_key === "finisher")
    expect(finisher?.uses.type).toBe("special")
    expect(finisher?.uses.dieType).toBe("d8")

    const trinkets = content.classes?.[0]?.features?.find((f) => f.name === "Trinkets") as Feature | undefined
    expect(trinkets?.isChoice).toBeFalsy()
    expect(trinkets?.choices).toBeUndefined()
  })

  it("auto-grants Antiquarian trinkets from subclass Trinkets feature", () => {
    const content = enrich("magehandpress-investigator-class")
    const antiquarian = content.subclasses?.find((s) => s.name === "Antiquarian")
    const trinkets = antiquarian?.features?.find((f) => f.name === "Trinkets") as Feature | undefined
    const grant = trinkets?.linkedModifiers?.flatMap((m) => m.characteristics ?? []).find(
      (c) => c.type === "grant_custom_ability",
    ) as { abilityNames?: string[] } | undefined
    expect(grant?.abilityNames).toEqual(
      expect.arrayContaining(["Hateful Arrowhead", "Warped Prism", "Razortooth Bandages"]),
    )
  })

  it("wires Finisher and Rushed Incantation", () => {
    const content = enrich("magehandpress-investigator-class")
    const finisher = content.classes?.[0]?.features?.find((f) => f.name === "Finisher") as Feature | undefined
    const rider = finisher?.linkedModifiers
      ?.flatMap((m) => m.characteristics ?? [])
      .find((c) => c.type === "power_rider")
    expect(rider).toMatchObject({
      type: "power_rider",
      weaponDamageMenu: true,
      classResourceKey: "finisher",
    })
    expect(
      finisher?.linkedModifiers?.some((m) => m.characteristics?.some((c) => c.type === "on_hit_trigger")),
    ).toBe(false)
    const rushed = content.classes?.[0]?.features?.find((f) => f.name === "Rushed Incantation") as Feature | undefined
    expect(rushed?.limitedUses).toMatchObject({
      type: "class_resource",
      classResourceKey: "rushed_incantation",
    })
  })

  it("sanitize alone remaps finisher_dice without full enrich", () => {
    const next = sanitizeInvestigatorImportContent(load("magehandpress-investigator-class"))
    expect(next.class_resources?.find((r) => r.resource_key === "finisher")).toBeTruthy()
  })
})

describe.skipIf(!hasMartyr)("Martyr Drive import wiring", () => {
  it("keeps spell_uses + max_spell_level and does not invent slots", () => {
    const content = enrich("magehandpress-martyr-class")
    expect(content.class_resources?.map((r) => r.resource_key).sort()).toEqual([
      "max_spell_level",
      "spell_uses",
    ])
    expect(content.classes?.[0]?.spellcasting).toBeUndefined()
    const spellcasting = content.classes?.[0]?.features?.find((f) => f.name === "Spellcasting") as Feature | undefined
    expect(spellcasting?.description).toMatch(/Hit Point Spellcasting/i)
    expect(spellcasting?.description).toMatch(/current HP/i)
  })

  it("wires Undying, Miraculous Healing, and Reprisal activations", () => {
    const content = enrich("magehandpress-martyr-class")
    const undying = content.classes?.[0]?.features?.find((f) => f.name === "Undying") as Feature | undefined
    expect(undying?.limitedUses).toMatchObject({ type: "fixed", fixedAmount: 1 })
    expect(undying?.activation?.onDropToZeroHp).toBe(true)
    expect(undying?.activation?.alsoActivateFeatureNames).toEqual(["Miraculous Healing"])
    expect(undying?.activation?.reaction).toBeFalsy()

    const heal = content.classes?.[0]?.features?.find((f) => f.name === "Miraculous Healing") as Feature | undefined
    expect(heal?.activation?.bonusAction).toBe(true)
    expect(heal?.activation?.spendHitDice).toBe(1)
    const healFx = heal?.linkedModifiers
      ?.flatMap((instance) => instance.activation?.effects ?? [])
      .find((effect) => effect.kind === "heal_self")
    expect(healFx).toMatchObject({ healMode: "hit_dice", healAbility: "CON" })

    const reprisal = content.classes?.[0]?.features?.find((f) => f.name === "Reprisal") as Feature | undefined
    expect(reprisal?.activation?.reaction).toBe(true)
    const attack = reprisal?.linkedModifiers
      ?.flatMap((instance) => instance.characteristics ?? [])
      .find((char) => char.type === "special_attack") as
      | { damageTypes?: string[]; chooseDamageType?: boolean; damageDieType?: string }
      | undefined
    expect(attack).toMatchObject({
      type: "special_attack",
      chooseDamageType: true,
      damageDieType: "d6",
    })
    expect(attack?.damageTypes).toEqual(["Necrotic", "Radiant"])
  })

  it("splits Sacrifice into Sacrificial Strike and Sacrificial Skill", () => {
    const content = enrich("magehandpress-martyr-class")
    const features = (content.classes?.[0]?.features ?? []) as Feature[]
    const names = features.map((feature) => feature.name)
    expect(names).toContain("Sacrificial Strike")
    expect(names).toContain("Sacrificial Skill")

    const strike = features.find((feature) => feature.name === "Sacrificial Strike")
    expect(strike?.activation?.bonusAction).toBe(true)
    expect(
      strike?.linkedModifiers
        ?.flatMap((instance) => instance.activation?.effects ?? [])
        .some((effect) => effect.kind === "extra_damage_on_hit"),
    ).toBe(true)

    const skill = features.find((feature) => feature.name === "Sacrificial Skill")
    expect(
      skill?.linkedModifiers
        ?.flatMap((instance) => instance.characteristics ?? [])
        .some((char) => char.type === "failed_roll_trigger"),
    ).toBe(true)

    const foe = features.find((feature) => feature.name === "Sacrifice Foe")
    const rider = foe?.linkedModifiers
      ?.flatMap((instance) => instance.characteristics ?? [])
      .find((char) => char.type === "power_rider") as { parentPowerNames?: string[] } | undefined
    expect(rider?.parentPowerNames).toEqual(["Sacrificial Strike", "Sacrificial Skill"])
    expect(foe?.sheetDisplay).toMatchObject({ combatActions: false, featuresTab: true })
  })

  it("wires Improved Sacrificial Strike as a replacement for Sacrificial Strike", () => {
    const content = enrich("magehandpress-martyr-class")
    const features = (content.classes?.[0]?.features ?? []) as Feature[]
    expect(features.some((feature) => /bonus action free/i.test(feature.name))).toBe(false)
    const improved = features.find((f) => f.name === "Improved Sacrificial Strike") as
      | Feature
      | undefined
    expect(improved?.sheetDisplay?.combatActions).toBe(true)
    expect(improved?.activation).toMatchObject({
      bonusAction: true,
      spendHitPoints: 10,
      firstUseNoAction: true,
      firstUseNoActionFromLevel: 17,
    })
    const replace = improved?.linkedModifiers
      ?.flatMap((instance) => instance.characteristics ?? [])
      .find((char) => char.type === "replace_feature") as
      | { replacedFeatureNames?: string[] }
      | undefined
    expect(replace?.replacedFeatureNames).toEqual(["Sacrificial Strike"])
  })

  it("wires Divine Respite as a short-rest Hit Point Dice restore", () => {
    const content = enrich("magehandpress-martyr-class")
    const features = (content.classes?.[0]?.features ?? []) as Feature[]
    const respiteRows = features.filter((feature) => feature.name === "Divine Respite")
    expect(respiteRows).toHaveLength(1)
    expect(respiteRows[0]?.level).toBe(9)
    const restore = respiteRows[0]?.linkedModifiers
      ?.flatMap((instance) => instance.characteristics ?? [])
      .find((char) => char.type === "hit_dice_restore") as
      | { amount?: number; amountByLevel?: { level: number; fixed?: number | null }[] }
      | undefined
    expect(restore?.amount).toBe(3)
    expect(restore?.amountByLevel?.some((row) => row.level === 13 && row.fixed === 6)).toBe(true)
    expect(restore?.amountByLevel?.some((row) => row.level === 17 && row.fixed === 10)).toBe(true)
    expect(respiteRows[0]?.sheetDisplay).toMatchObject({
      abilitiesActions: false,
      combatActions: false,
      restDialogues: true,
    })
  })

  it("keeps Armor of Faith as a picker", () => {
    const content = enrich("magehandpress-martyr-class")
    const armor = content.classes?.[0]?.features?.find((f) => f.name === "Armor of Faith") as Feature | undefined
    expect(armor?.choices?.options?.length).toBeGreaterThanOrEqual(2)
  })
})
