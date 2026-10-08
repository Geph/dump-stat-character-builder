import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { featureChoiceKey } from "@/lib/builder/choices"
import { attachClassDetails } from "@/lib/character/character-classes"
import { collectSheetActions } from "@/lib/character/sheet-actions"
import { getSpellSlotTable, resolveEffectiveClassSpellcasting } from "@/lib/compendium/spell-slots"
import { resolveHomebrewImportJsonPath } from "@/lib/import/homebrew-import-ops"
import { parseImportContentJson } from "@/lib/import/parse-import-content-json"
import { prepareImportedContent } from "@/lib/import/prepare-import"
import { enrichSubclassFeaturesWithPresets } from "@/lib/import/enrichment-presets/apply"
import type { CustomAbility, DndClass, Feature, Subclass } from "@/lib/types"

// Private Drive fixtures only: no publisher prose is bundled with this regression suite.
const names = ["alchemist", "captain", "craftsman", "dancer", "gunslinger", "investigator", "martyr", "necromancer", "vagabond", "warden", "warmage", "witch"]
const explicitOwnAction = /\byou (?:can |may )?(?:take|use) (?:an?|the) (?:(?:Magic|Utilize|Bonus) action|Reaction)\b|\bas an? (?:(?:Magic|Utilize|Bonus) action|Reaction)\b/i

it("replaces obsolete or previously attached subclass modifiers when preparing again", () => {
  for (const [className, subclass, name, type] of [
    ["Alchemist", "Apothecary", "Miracle Serum", "power_rider"],
    ["Alchemist", "Mad Bomber", "Timed Demolition", "player_note"],
    ["Witch", "Steel Magic", "Soulsteel", "power_rider"],
  ]) {
    const once = enrichSubclassFeaturesWithPresets([{ name, level: 14, description: "" }], className, subclass)
    const twice = enrichSubclassFeaturesWithPresets(once, className, subclass)
    expect(twice[0].linkedModifiers?.flatMap((m) => m.characteristics ?? []).filter((c) => c.type === type), name).toHaveLength(1)
  }
  const [charmer] = enrichSubclassFeaturesWithPresets([{ name: "Charmer", level: 3, description: "",
    linkedModifiers: [{ instanceId: "obsolete", catalogRefId: "cat_char_skill_check_alternate_ability", characteristics: [{
      id: "old-ability", type: "skill_check_alternate_ability", ability: "intelligence", skills: ["Persuasion"],
    }] }],
  }], "Alchemist", "Amorist")
  expect(charmer.linkedModifiers?.flatMap((m) => m.characteristics ?? []).some((c) => c.type === "skill_check_alternate_ability")).toBe(false)
})

it("Tower Shield adds one AC only while a shield is equipped", () => {
  const [shield] = enrichSubclassFeaturesWithPresets([{ name: "Tower Shield", level: 3, description: "" }], "Craftsman", "Armigers' Guild")
  expect(shield.linkedModifiers?.flatMap((m) => m.characteristics ?? []).find((c) => c.type === "ac"))
    .toMatchObject({ mode: "flat_bonus", flatBonus: 1, limitations: [{ kind: "armor_type", rule: "requires_wearing", value: "Shield" }] })
})

function load(name: string) {
  const path = resolveHomebrewImportJsonPath(`magehandpress-${name}-class`)!
  const raw = readFileSync(path, "utf8")
  const prepared = prepareImportedContent(parseImportContentJson(raw)!, { charLength: raw.length })
  const content = prepared.kind === "confirm" ? prepared.pendingContent : prepared.content
  const cls = { ...content.classes![0], id: name } as unknown as DndClass
  cls.class_resources = (content.class_resources ?? []).map((r) => ({ ...r, id: r.resource_key })) as DndClass["class_resources"]
  const subclasses = (content.subclasses ?? []).map((s, i) => ({ ...s, id: `${name}-${i}`, class_id: name })) as unknown as Subclass[]
  const abilities = [...(content.abilities ?? []), ...(content.import_proposals?.custom_abilities ?? [])]
    .map((a, i) => ({ ...a, id: `${name}-ability-${i}` })) as unknown as CustomAbility[]
  return { cls, subclasses, abilities }
}

for (const name of names) {
  describe.skipIf(!resolveHomebrewImportJsonPath(`magehandpress-${name}-class`))(`${name}: levels 1–20`, () => {
    it("surfaces current-level actions for the base class and every subclass", () => {
      const { cls, subclasses, abilities } = load(name)
      for (const sub of [null, ...subclasses]) {
        for (let level = 1; level <= 20; level++) {
          const details = attachClassDetails([{ class_id: name, subclass_id: sub?.id, level, order: 0 }], [cls], subclasses)
          const owners = [details[0].class, details[0].subclass].filter(Boolean)
          const grantedNames = owners.flatMap((o) => ((o!.features ?? []) as Feature[])
            .filter((f) => (f.level ?? 1) <= level)
            .flatMap((f) => f.linkedModifiers ?? [])
            .flatMap((m) => m.characteristics ?? [])
            .flatMap((c) => c.type === "grant_custom_ability" ? c.abilityNames ?? [] : []))
          const grantedAbilities = abilities.filter((a) => grantedNames.some((n) => n.toLowerCase() === a.name.toLowerCase()))
          const actions = collectSheetActions({ classDetails: details, species: null, customAbilities: grantedAbilities })
          for (const ability of grantedAbilities) {
            if ((ability.level_requirement ?? 1) > level || !explicitOwnAction.test(ability.description ?? "")) continue
            expect(actions.some((a) => a.name === ability.name || a.id.endsWith(`:${ability.name}`)),
              `${name}/${sub?.name ?? "base"}/${level}/granted ${ability.name}`).toBe(true)
          }
          for (const owner of owners) {
            for (const feature of (owner!.features ?? []) as Feature[]) {
              if (feature.level !== level || !explicitOwnAction.test(feature.description ?? "")) continue
              // These grants resolve to individual custom abilities, spells or choice cards.
              const chars = feature.linkedModifiers?.flatMap((m) => m.characteristics ?? []) ?? []
              if (chars.some((c) => ["grant_custom_ability", "spells_known"].includes(c.type))) continue
              if (feature.isChoice || /^(holy )?trinkets$/i.test(feature.name)) continue
              const card = actions.find((a) => a.id.endsWith(`:${feature.name}`))
              expect(card, `${name}/${owner!.name}/${level}/${feature.name}`).toBeDefined()
            }
          }
          // Feature and selected-option cards must never leak from a later level.
          for (const action of actions) {
            const match = /:(?:opt:)?(\d+):/.exec(action.id)
            if (match) expect(Number(match[1]), action.id).toBeLessThanOrEqual(level)
            if (action.spendsEconomy !== false && action.kinds.some((k) => k === "bonus" || k === "reaction")) {
              expect(action.showOnCombatTab ?? action.category !== "utility", `${name}/${sub?.name ?? "base"}/${level}/${action.name} turn cost`).toBe(true)
            }
          }
        }
      }
    }, 30_000)

    it("surfaces each selected action option at its unlock level", () => {
      const { cls, subclasses } = load(name)
      for (const sub of [null, ...subclasses]) {
        const owner = sub ?? cls
        for (const feature of (owner.features ?? []) as Feature[]) {
          if (!feature.isChoice || feature.choices?.applyTo === "companion") continue
          // Mastery effects are on the equipped weapon card (e.g. Nick), not standalone uses.
          if (/weapon mastery/i.test(feature.name)) continue
          for (const option of feature.choices?.options ?? []) {
            if (!explicitOwnAction.test(option.description)) continue
            const level = Math.max(feature.level ?? 1, option.level_requirement ?? 1)
            const details = attachClassDetails([{ class_id: name, subclass_id: sub?.id, level, order: 0 }], [cls], subclasses)
            const actions = collectSheetActions({ classDetails: details, species: null,
              featureChoicePicks: { [featureChoiceKey(name, feature.name, feature.level)]: [option.name] } })
            expect(actions.some((a) => a.name === option.name), `${name}/${owner.name}/${feature.name}/${option.name}`).toBe(true)
          }
        }
      }
    }, 30_000)
  })
}

describe.skipIf(!resolveHomebrewImportJsonPath("magehandpress-gunslinger-class"))("Valda 1.2 progression corrections", () => {
  it("assigns Gunslinger features to the correct subclass", () => {
    const { subclasses } = load("gunslinger")
    for (const [owner, feature, level] of [
      ["Deadeye", "Reposition", 10], ["Deadeye", "Focused Shot", 14],
      ["Gun Tank", "Thick-Skulled", 6], ["Gun Tank", "Gatling Shot", 14],
      ["Gun-Ko Master", "Predictive Dodge", 10], ["Gun-Ko Master", "Flash Assault", 14],
      ["High Roller", "Risky Business", 6], ["High Roller", "Double or Nothing", 14],
      ["Musketeer", "Mobile Tactics", 10], ["Musketeer", "All For One", 14],
    ] as const) {
      const matches = subclasses.filter((s) => s.features?.some((f) => f.name === feature && f.level === level))
      expect(matches.map((s) => s.name)).toEqual([owner])
    }
  })
})

const combatCases = [
  ["alchemist", "Mad Bomber", "Timed Demolition", 6, "action"],
  ["alchemist", "Venomsmith", "Toxic Recompense", 14, "reaction"],
  ["craftsman", null, "Magnum Opus", 20, "bonus"],
  ["craftsman", "Trappers' Guild", "Rapid Deployment", 14, "action"],
  ["dancer", null, "Freestyle", 13, "bonus"],
  ["martyr", "Burden of Atonement", "Sin Eater", 6, "action"],
  ["warden", null, "Font of Life", 13, "action"],
  ["warden", null, "Legendary Resistance", 20, "action"],
  ["warmage", "House of Bishops", "Arcane Dominance", 18, "bonus"],
  ["warmage", "House of Darts", "Dart Burst", 18, "action"],
  ["witch", "Black Magic", "Undeath Command", 6, "bonus"],
] as const

for (const [name, owner, feature, level, kind] of combatCases) {
  it.skipIf(!resolveHomebrewImportJsonPath(`magehandpress-${name}-class`))(`${name}/${feature} is on Combat starting at ${level}`, () => {
    const { cls, subclasses } = load(name)
    const sub = subclasses.find((s) => s.name === owner)
    const actionsAt = (at: number) => collectSheetActions({ species: null,
      classDetails: attachClassDetails([{ class_id: name, subclass_id: sub?.id, level: at, order: 0 }], [cls], subclasses) })
    expect(actionsAt(level - 1).some((a) => a.name === feature)).toBe(false)
    const action = actionsAt(level).find((a) => a.name === feature)
    expect(action).toMatchObject({ showOnCombatTab: true })
    expect(action?.kinds).toContain(kind)
    if (feature === "Magnum Opus") expect(action?.limitedUses).toBeNull()
    if (feature === "Font of Life") {
      expect(action?.spendsEconomy).toBe(false)
      expect(action?.limitedUses?.recharges).toContainEqual({ rest: "short_rest", amount: 1 })
    }
  })
}

it.skipIf(!resolveHomebrewImportJsonPath("magehandpress-investigator-class"))("Occultist pact slots follow the revised table at every level", () => {
  const { cls, subclasses } = load("investigator")
  const sub = subclasses.find((s) => s.name === "Occultist")!
  const spellcasting = resolveEffectiveClassSpellcasting({ class: cls, subclass: sub })
  for (let level = 1; level <= 20; level++) {
    const slots = getSpellSlotTable(cls.name, level, spellcasting)!
    const count = level < 3 ? 0 : level < 5 ? 1 : 2
    expect(slots.slotsByLevel.reduce((a, b) => a + b, 0)).toBe(count)
    if (level >= 3) expect(slots.pactSlotLevel).toBe(level < 7 ? 1 : level < 13 ? 2 : level < 19 ? 3 : 4)
  }
})

it.skipIf(!resolveHomebrewImportJsonPath("magehandpress-alchemist-class"))("revised Alchemist modifiers do not retain obsolete math", () => {
  const { cls, subclasses } = load("alchemist")
  expect(cls.features?.some((f) => f.name === "Ability Score Improvement" && f.level === 14)).toBe(false)
  const apothecary = subclasses.find((s) => s.name === "Apothecary")!
  expect(apothecary.features?.some((f) => f.name === "Self-Medication")).toBe(false)
  expect(apothecary.features?.find((f) => f.name === "Alchemical Resurrection")?.level).toBe(10)
  expect(apothecary.features?.find((f) => f.name === "Miracle Serum")?.level).toBe(14)
  const toxic = subclasses.find((s) => s.name === "Venomsmith")?.features?.find((f) => f.name === "Toxic Recompense")
  expect(toxic?.linkedModifiers?.flatMap((m) => m.characteristics ?? []).find((c) => c.type === "special_attack"))
    .toMatchObject({ damageDiceCount: 2, damageDieType: "d10" })
  const charmer = subclasses.find((s) => s.name === "Amorist")?.features?.find((f) => f.name === "Charmer")
  expect(charmer?.linkedModifiers?.flatMap((m) => m.characteristics ?? []).some((c) => c.type === "skill_check_alternate_ability")).toBe(false)
  expect(charmer?.linkedModifiers?.flatMap((m) => m.activation?.effects ?? []).find((e) => e.kind === "check_roll_modifier"))
    .toMatchObject({ bonusConfig: { mode: "ability_modifier", ability: "INT", resultFloor: { mode: "fixed", fixed: 1 } } })
})
