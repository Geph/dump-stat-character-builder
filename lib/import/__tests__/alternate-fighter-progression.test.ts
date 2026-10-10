import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { parseImportContentJsonDetailed } from "@/lib/import/parse-import-content-json"
import { prepareImportedContent } from "@/lib/import/prepare-import"
import { applyProposalSelections, defaultProposalSelections } from "@/lib/import/import-proposals"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { enrichAbilityImportRows } from "@/lib/import/enrich-ability-import"
import { normalizeAbilityImportRows } from "@/lib/import/normalize-ability-import"
import { resolveHomebrewImportJsonPath } from "@/lib/import/homebrew-import-ops"
import { attachClassDetails } from "@/lib/character/character-classes"
import { collectSheetActions } from "@/lib/character/sheet-actions"
import { attacksPerAttackAction } from "@/lib/character/action-economy"
import { applyCustomAbilityModifications } from "@/lib/character/modify-custom-ability"
import { resolveUsesAtLevel } from "@/lib/compendium/resolve-uses-config"
import type { ImportContent } from "@/lib/import/content-schema"
import type { DndClass, CustomAbility, Subclass } from "@/lib/types"

describe("Alternate Fighter through the real import pipeline", () => {
  const classPath = resolveHomebrewImportJsonPath("laserllama-altfighter-class")
  const exploitsPath = resolveHomebrewImportJsonPath("laserllama-exploits-custom")
  it.skipIf(!classPath || !exploitsPath)("preserves costs and checks all 20 class levels and 19 archetypes", () => {
    const raw = JSON.parse(readFileSync(classPath!, "utf8")) as ImportContent
    const library = JSON.parse(readFileSync(exploitsPath!, "utf8")) as ImportContent
    const parsed = parseImportContentJsonDetailed(JSON.stringify({ ...raw, import_proposals: {
      ...raw.import_proposals, custom_abilities: [...(raw.import_proposals?.custom_abilities ?? []), ...(library.import_proposals?.custom_abilities ?? [])],
    } }))
    if (!parsed.ok) throw new Error(parsed.error)
    expect(parsed.content.import_proposals?.custom_abilities?.filter((a) => a.mechanics?.length).length).toBeGreaterThan(50)
    const prepared = prepareImportedContent(parsed.content)
    const content = enrichImportContentModifiers(prepared.kind === "confirm"
      ? applyProposalSelections(prepared.pendingContent, prepared.proposals, defaultProposalSelections(prepared.proposals))
      : prepared.content)
    const cls = { ...content.classes![0], id: "fighter", class_resources: content.class_resources?.map((r) => ({ ...r, id: r.resource_key })) } as unknown as DndClass
    const subclasses = content.subclasses!.map((s, i) => ({ ...s, id: `sub${i}`, class_id: cls.id })) as unknown as Subclass[]
    const abilities = enrichAbilityImportRows(normalizeAbilityImportRows(content.abilities ?? [])).map((a, i) => ({ ...a, id: `ability${i}`, linked_modifiers: a.linkedModifiers ?? a.linked_modifiers })) as unknown as CustomAbility[]
    expect(subclasses).toHaveLength(19)
    expect(cls.features.some((feature) => feature.name === "Subclass")).toBe(false)
    expect(cls.features.find((feature) => feature.name === "Warrior Archetype")?.modifierRefs).toContain("cat_char_subclass_unlock")
    const pool = cls.class_resources!.find((r) => r.id === "exploit_dice")!
    expect(pool.uses.rechargeOnInitiative).toBeUndefined()
    for (let level = 1; level <= 20; level++) {
      const details = attachClassDetails([{ class_id: cls.id, level, order: 0 }], [cls], subclasses)
      const features = details[0].class!.features.filter((f) => (f.level ?? 1) <= level)
      expect(attacksPerAttackAction(features), `attacks at ${level}`).toBe(level < 5 ? 1 : level < 11 ? 2 : level < 17 ? 3 : 4)
      const modifications = features.flatMap((f) => f.linkedModifiers ?? []).flatMap((m) => m.characteristics ?? []).filter((m) => m.type === "modify_custom_ability")
      const known = applyCustomAbilityModifications(abilities, modifications)
      const actions = collectSheetActions({ classDetails: details, species: null, customAbilities: known })
      const assessment = actions.find((action) => action.name === "Eye for Talent")
      if (level < 3) expect(assessment).toBeUndefined()
      else {
        expect(assessment?.kinds).toEqual(["bonus"])
        expect(assessment?.playerNotes).toHaveLength(1)
        expect(assessment?.limitedUses).toBeFalsy()
      }
      for (const [name, unlock, max] of [["Second Wind", 1, level >= 14 ? 2 : 1], ["Action Surge", 6, level === 20 ? 2 : 1], ["Indomitable", 9, level >= 17 ? 3 : level >= 13 ? 2 : 1]] as const) {
        const action = actions.find((a) => a.name === name)
        if (level < unlock) expect(action).toBeUndefined()
        else expect(resolveUsesAtLevel(action!.limitedUses!, level), `${name} at ${level}`).toBe(max)
      }
      const feat = actions.find((a) => a.name === "Feat of Strength")!
      if (level >= 2) {
        expect(feat.limitedUses?.classResourceCostMode).toBe("up_to_proficiency_bonus")
        expect(Boolean(feat.limitedUses?.resourceCostWaiver), `waiver at ${level}`).toBe(level >= 11)
      }
      const third = actions.find((a) => a.name === "Heroic Focus")
      if (level >= 9) {
        expect(third?.classResourceKey).toBe("exploit_dice")
        expect(third?.limitedUses?.type).toBe(level === 20 ? "class_resource" : "fixed")
      }
      // Every newly unlocked explicit action must be discoverable on the sheet.
      for (const subclass of subclasses) {
        const subDetails = attachClassDetails([{ class_id: cls.id, subclass_id: subclass.id, level, order: 0 }], [cls], subclasses)
        const subActions = collectSheetActions({ classDetails: subDetails, species: null })
        for (const feature of subDetails[0].subclass?.features ?? []) {
          if (feature.level !== level || feature.isChoice || !/\bas (?:an?|your) (?:action|bonus action|reaction)\b/i.test(feature.description ?? "")) continue
          expect(subActions.some((a) => a.name === feature.name), `${subclass.name} ${level}: ${feature.name}`).toBe(true)
        }
      }
    }
  })
})
