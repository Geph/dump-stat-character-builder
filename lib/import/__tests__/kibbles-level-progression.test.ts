import { describe, expect, it } from "vitest"
import { featureChoiceKey } from "@/lib/builder/choices"
import { attachClassDetails } from "@/lib/character/character-classes"
import { collectSheetActions } from "@/lib/character/sheet-actions"
import { prepareImportedContent } from "@/lib/import/prepare-import"
import { applyProposalSelections, defaultProposalSelections } from "@/lib/import/import-proposals"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { enrichAbilityImportRows } from "@/lib/import/enrich-ability-import"
import { normalizeAbilityImportRows } from "@/lib/import/normalize-ability-import"
import { INVENTOR_UPGRADE_LEVEL_CORRECTIONS } from "@/lib/import/enrichment-presets/packs/inventor"
import { resolveUsesAtLevel, resolveDieSidesAtLevel } from "@/lib/compendium/resolve-uses-config"
import { resolveFeatureChoiceOptions } from "@/lib/builder/aggregate-psionic-talents"
import { customAbilityAppliesOnCharacterSheet, type CharacterSheetAbilityContext } from "@/lib/character/filter-sheet-custom-abilities"
import { applyCompanionScopedChoiceModifiers } from "@/lib/character/apply-companion-choice-modifiers"
import type { CompanionStatBlockTemplate } from "@/lib/character/companion-stat-block"
import { ChoiceOptionsSchema, type ImportContent } from "@/lib/import/content-schema"
import type { CustomAbility, DndClass, Feature, Subclass, UsesConfig } from "@/lib/types"
import inventor from "@/lib/seed-packs/kibbles-tasty/kibbles-inventor-class.json"
import occultist from "@/lib/seed-packs/kibbles-tasty/kibbles-occultist-class.json"
import psion from "@/lib/seed-packs/kibbles-tasty/kibbles-psion-class.json"
import psionics from "@/lib/seed-packs/kibbles-tasty/kibbles-psionics-custom.json"
import warden from "@/lib/seed-packs/kibbles-tasty/kibbles-warden-class.json"

const ownAction = /\bas (?:an?|your) (?:action|bonus action|reaction)\b|\byou can (?:use|take) (?:an?|your) (?:action|bonus action|reaction)\b/i

it("preserves nested gates, repeatability, references and rest swaps through choice normalization", () => {
  const choices = ChoiceOptionsSchema.parse({ category: "Talents", count: 1,
    choiceCountByLevel: [{ level: 1, count: 1 }, { level: 5, count: 2 }],
    swappableOnRest: true, swapRestType: "long",
    options: [{ name: "Practice", description: "An optional practice.", level_requirement: 5,
      prerequisite: "Level 5", repeatable: true, modifierRefs: ["existing-modifier"] }],
  })
  const [row] = normalizeAbilityImportRows([{ name: "Training", choices }])
  expect(row.choices).toEqual(choices)
})

function load(raw: unknown) {
  const prepared = prepareImportedContent(raw as ImportContent)
  const content = prepared.kind === "confirm"
    ? enrichImportContentModifiers(applyProposalSelections(prepared.pendingContent, prepared.proposals, defaultProposalSelections(prepared.proposals)))
    : prepared.content
  const cls = { ...content.classes![0], id: "audit-class", class_resources: (content.class_resources ?? []).map((r) => ({ ...r, id: r.resource_key })) } as unknown as DndClass
  const subclasses = (content.subclasses ?? []).map((s, i) => ({ ...s, id: `sub-${i}`, class_id: cls.id })) as unknown as Subclass[]
  const abilities = enrichAbilityImportRows(normalizeAbilityImportRows((content as unknown as { abilities: Record<string, unknown>[] }).abilities ?? []) as unknown as Record<string, unknown>[]).map((a, i) => ({ ...a,
    id: `ability-${i}`, linked_modifiers: a.linkedModifiers ?? a.linked_modifiers,
    prerequisites: a.prerequisite ?? a.prerequisites,
  })) as unknown as CustomAbility[]
  return { cls, subclasses, abilities }
}

describe("Inventor PDF upgrade tiers", () => {
  it("routes golem upgrades onto the companion without granting the inventor its proficiencies or flight", () => {
    const { abilities, cls, subclasses } = load(inventor)
    const golemsmith = subclasses.find((s) => s.name === "Golemsmith")!
    const template = { name: "Mechanical Golem", traits: [], actions: [] } as unknown as CompanionStatBlockTemplate
    for (const name of ["Fine-Tuned Dexterity", "Structural Constitution", "Systematic Strength", "Airborne Propulsion"]) {
      const ability = { ...abilities.find((a) => a.name === name)!, attached_to_type: "subclass", attached_to_id: golemsmith.id }
      expect(ability.choices?.applyTo).toBe("companion")
      expect(ability.linked_modifiers).toEqual([])
      for (const level of [1, 20]) {
        const details = attachClassDetails([{ class_id: cls.id, subclass_id: golemsmith.id, level, order: 0 }], [cls], subclasses)
        const result = applyCompanionScopedChoiceModifiers({ template, source: { classId: cls.id, featureName: "Mechanical Golem" } as Parameters<typeof applyCompanionScopedChoiceModifiers>[0]["source"], classDetails: details, customAbilities: [ability] })
        expect(result.traits.some((t) => t.name === name)).toBe(level >= (ability.level_requirement ?? 1))
      }
    }
    const details = attachClassDetails([{ class_id: cls.id, subclass_id: golemsmith.id, level: 20, order: 0 }], [cls], subclasses)
    const armament = { ...abilities.find((a) => a.name === "Arcane Barrage Armament")!, attached_to_type: "subclass", attached_to_id: golemsmith.id }
    const armed = applyCompanionScopedChoiceModifiers({ template, source: { classId: cls.id, featureName: "Mechanical Golem" } as Parameters<typeof applyCompanionScopedChoiceModifiers>[0]["source"], classDetails: details, customAbilities: [armament] })
    expect(armed.actions.some((a) => a.name === armament.name)).toBe(true)
    expect(armed.traits.some((a) => a.name === armament.name)).toBe(false)
  })
  it("keeps bundled and enriched upgrade levels aligned with the original page columns", () => {
    const enriched = load(inventor).abilities
    for (const [owner, upgrades] of Object.entries(INVENTOR_UPGRADE_LEVEL_CORRECTIONS)) {
      for (const [name, level] of Object.entries(upgrades)) {
        expect(inventor.abilities.find((a) => a.name === name && a.source_name === owner)?.level_requirement, `${owner}/${name}`).toBe(level)
        expect(enriched.find((a) => a.name === name && (a as unknown as { source_name: string }).source_name === owner)?.level_requirement, name).toBe(level)
      }
    }
    expect(JSON.stringify(inventor)).not.toContain("Tier uncertain:")
  })
})

describe("Kibbles resource and choice progression against PDF tables", () => {
  it("resolves every level's pools and choice counts, including levels before unlock", () => {
    const count = (raw: typeof psion | typeof inventor | typeof occultist | typeof warden, key: string, level: number) =>
      resolveUsesAtLevel(raw.class_resources.find((r) => r.resource_key === key)!.uses as UsesConfig, level)
    for (let level = 1; level <= 20; level++) {
      expect(count(psion, "psi_points", level)).toBe(level)
      expect(count(psion, "psi_limit", level)).toBe(Math.ceil(level / 2))
      const talents = level < 2 ? 0 : 2 + [5, 7, 9, 12, 15, 18].filter((n) => level >= n).length
      expect(count(psion, "psionic_talents_known", level)).toBe(talents)
      expect(count(occultist, "occult_rites_known", level)).toBe(talents)
      expect(count(inventor, "upgrades", level)).toBe(Math.max(0, Math.floor((level - 1) / 2)))
      expect(count(inventor, "spells_known", level)).toBe(level < 2 ? 0 : 3 + Math.floor((level - 1) / 2))
      expect(count(warden, "endurance_dice", level)).toBe(level < 2 ? 0 : 3 + [5, 9, 13, 17].filter((n) => level >= n).length)
      expect(count(warden, "primal_manifestations", level)).toBe(level < 3 ? 0 : 1 + Math.floor(level / 3))
      expect(resolveDieSidesAtLevel(warden.class_resources[0].uses as UsesConfig, level)).toBe(level < 2 ? null : level < 5 ? 8 : level < 11 ? 10 : 12)
    }
  })

  it("unlocks powers only through their known disciplines, with free base uses and separate augments", () => {
    const { abilities, cls, subclasses } = load({ ...psion, abilities: psionics.abilities })
    const details = attachClassDetails([{ class_id: cls.id, level: 20, order: 0 }], [cls], subclasses)
    const context: CharacterSheetAbilityContext = { classIds: ["audit-class"], classNames: ["Psion"], subclassIds: [], subclassNames: [], speciesId: null, speciesName: null, backgroundId: null, backgroundName: null, featIds: [], featNames: [], equipmentIds: [], equipmentCategories: [], spellIds: [], selectedAbilityNames: [], knownDisciplineNames: [] }
    expect(abilities.filter((a) => a.ability_role === "psionic_power")).toHaveLength(10)
    expect(abilities.filter((a) => a.ability_role === "discipline")).toHaveLength(9)
    for (const power of abilities.filter((a) => a.ability_role === "psionic_power")) {
      expect(customAbilityAppliesOnCharacterSheet(power, context), power.name).toBe(false)
      const parent = (power as unknown as { parent_ability_name: string }).parent_ability_name
      expect(parent, power.name).toBeTruthy()
      expect(customAbilityAppliesOnCharacterSheet(power, { ...context, knownDisciplineNames: [parent] }), power.name).toBe(true)
      if (power.psionic_augments?.augments.length) {
        expect(power.uses?.classResourceAmount ?? 0, `${power.name} base cost`).toBe(0)
        const action = collectSheetActions({ classDetails: details, species: null, customAbilities: [power] }).find((a) => a.name === power.name)
        expect(action?.limitedUses?.classResourceAmount ?? 0, `${power.name} sheet base cost`).toBe(0)
      }
    }
    expect(abilities.find((a) => a.name === "Mind Devourer")?.uses?.classResourceAmount ?? 0).toBe(0)
  })

  it("keeps talent prerequisites, exclusions, and specializations separate through the real import path", () => {
    const { abilities, cls } = load({ ...psion, abilities: psionics.abilities })
    const feature = cls.features?.find((f) => f.name === "Psionic Talents")!
    expect(feature).toBeTruthy()
    const options = (level: number, picks: string[] = []) => resolveFeatureChoiceOptions(feature, { customAbilities: abilities, classNames: ["Psion"], classLevel: level, featureChoicePicks: { disciplines: ["Telekinesis Discipline", "Enhancement Discipline", "Psychokinesis Discipline"], talents: picks } }).map((o) => o.name)
    expect(options(4)).not.toContain("Body Control")
    expect(options(5)).toContain("Body Control")
    expect(options(5)).not.toContain("Metamorphosis")
    expect(options(5, ["Body Control"])).toContain("Metamorphosis")
    expect(options(8)).not.toContain("Precise Power")
    expect(options(9)).toContain("Precise Power")
    expect(options(9, ["Unchecked Power"])).not.toContain("Precise Power")
    expect(options(20)).not.toContain("Cryokinetic")
  })

  it("surfaces every selected active discipline talent without granting unselected siblings", () => {
    const { abilities, cls, subclasses } = load({ ...psion, abilities: psionics.abilities })
    const details = attachClassDetails([{ class_id: cls.id, level: 20, order: 0 }], [cls], subclasses)
    const talentFeature = cls.features!.find((f) => f.name === "Psionic Talents")!
    const missing: string[] = []
    for (const discipline of abilities.filter((a) => a.ability_role === "discipline")) {
      for (const option of discipline.choices?.options ?? []) {
        if (!ownAction.test(option.description ?? "")) continue
        const actions = collectSheetActions({ classDetails: details, species: null, customAbilities: [discipline], featureChoicePicks: { [featureChoiceKey(cls.id, talentFeature.name, talentFeature.level)]: [option.name] } })
        if (!actions.some((a) => a.name === option.name)) missing.push(`${discipline.name}/${option.name}`)
        const unselected = collectSheetActions({ classDetails: details, species: null, customAbilities: [discipline], featureChoicePicks: {} })
        expect(unselected.some((a) => a.name === option.name)).toBe(false)
      }
    }
    expect(missing).toEqual([])
  })
})

for (const [name, raw] of Object.entries({ inventor, occultist, psion: { ...psion, abilities: psionics.abilities }, warden })) {
  describe(`${name} bundled progression`, () => {
    const { cls, subclasses, abilities } = load(raw)
    it("surfaces active base and subclass features at each level from 1 to 20", () => {
      const missing: string[] = []
      for (const sub of [null, ...subclasses]) {
        for (let level = 1; level <= 20; level++) {
          const details = attachClassDetails([{ class_id: cls.id, subclass_id: sub?.id, level, order: 0 }], [cls], subclasses)
          const actions = collectSheetActions({ classDetails: details, species: null })
          for (const owner of [details[0].class, details[0].subclass]) {
            for (const feature of (owner?.features ?? []) as Feature[]) {
              if (feature.level !== level || feature.isChoice || !ownAction.test(feature.description ?? "")) continue
              const chars = feature.linkedModifiers?.flatMap((m) => m.characteristics ?? []) ?? []
              if (chars.some((c) => ["spells_known", "grant_custom_ability", "modify_custom_ability"].includes(c.type))) continue
              if (!actions.some((a) => a.name === feature.name || a.id.endsWith(`:${feature.name}`))) missing.push(`${owner?.name} L${level} ${feature.name}`)
            }
          }
          for (const action of actions) {
            const match = /:(?:opt:)?(\d+):/.exec(action.id)
            if (match) expect(Number(match[1]), action.id).toBeLessThanOrEqual(level)
          }
        }
      }
      expect([...new Set(missing)]).toEqual([])
    })

    it("surfaces each selected active feature option", () => {
      const missing: string[] = []
      for (const sub of [null, ...subclasses]) {
        for (const f of ((sub ?? cls).features ?? []) as Feature[]) {
          if (!f.isChoice || f.choices?.applyTo === "companion") continue
          for (const opt of f.choices?.options ?? []) {
            if (!ownAction.test(opt.description ?? "")) continue
            const level = Math.max(f.level ?? 1, opt.level_requirement ?? 1)
            const details = attachClassDetails([{ class_id: cls.id, subclass_id: sub?.id, level, order: 0 }], [cls], subclasses)
            const actions = collectSheetActions({ classDetails: details, species: null, featureChoicePicks: { [featureChoiceKey(cls.id, f.name, f.level)]: [opt.name] } })
            if (!actions.some((a) => a.name === opt.name)) missing.push(`${sub?.name ?? cls.name}/${f.name}/${opt.name}`)
          }
        }
      }
      expect(missing).toEqual([])
    })

    it("surfaces selected active custom abilities at their required level", () => {
      const missing: string[] = []
      for (const ability of abilities) {
        if (ability.choices?.applyTo === "companion") continue
        if (["discipline", "talent_pool"].includes(ability.ability_role ?? "") || !ownAction.test(ability.description ?? "")) continue
        const level = Math.max(1, ability.level_requirement ?? 1)
        const details = attachClassDetails([{ class_id: cls.id, level, order: 0 }], [cls], subclasses)
        const actions = collectSheetActions({ classDetails: details, species: null, customAbilities: [ability] })
        if (!actions.some((a) => a.name === ability.name)) missing.push(`${ability.name} L${level}`)
      }
      expect(missing).toEqual([])
    })
  })
}
