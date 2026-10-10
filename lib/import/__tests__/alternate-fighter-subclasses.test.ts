import { describe, expect, it } from "vitest"
import { enrichSubclassFeaturesWithPresets } from "@/lib/import/enrichment-presets/apply"
import { modifierLimitationsMet } from "@/lib/compendium/modifier-limitations"
import { collectSheetActions } from "@/lib/character/sheet-actions"
import type { DndClass, Equipment, Feature, Subclass } from "@/lib/types"

function enrich(subclass: string, features: Feature[]) {
  return enrichSubclassFeaturesWithPresets(features, "Alternate Fighter", subclass)
}
const row = (name: string, level = 3): Feature => ({ name, level, description: "Imported source rules." })

describe("Alternate Fighter subclass mechanics", () => {
  it("replaces permanent trance AC with gated bonuses, including its level-seven upgrade", () => {
    const features = [row("Battle Trance"), row("Mythic Reflexes", 7)].map((feature) => ({ ...feature,
      linkedModifiers: [{ instanceId: "old", catalogRefId: "cat_char_ac", characteristics: [{ id: "old", type: "ac" as const, mode: "flat_bonus" as const, flatBonus: 2 }] }],
    }))
    const wired = enrich("Swordsage", features)
    expect(wired[0].limitedUses).toMatchObject({ restoreByResource: { resourceKey: "exploit_dice", resourceAmount: 1 } })
    expect(wired[0].linkedModifiers?.flatMap((m) => m.characteristics ?? []).find((m) => m.type === "uses")).toMatchObject({ uses: wired[0].limitedUses })
    const ac = wired.flatMap((f) => f.linkedModifiers ?? []).flatMap((m) => m.characteristics ?? []).filter((m) => m.type === "ac")
    expect(ac).toHaveLength(2)
    expect(ac.reduce((sum, m) => sum + (m.flatBonus ?? 0), 0)).toBe(2)
    for (const modifier of ac) {
      expect(modifierLimitationsMet(modifier, {})).toBe(false)
      const context = { activeSheetToggles: new Set(["battle_trance_active"]) }
      expect(modifierLimitationsMet(modifier, context)).toBe(true)
      expect(modifierLimitationsMet(modifier, { ...context, activeConditions: ["Incapacitated"] })).toBe(false)
      expect(modifierLimitationsMet(modifier, { ...context, equippedShield: { name: "Shield" } as Equipment })).toBe(false)
      expect(modifierLimitationsMet(modifier, { ...context, equippedArmor: { subcategory: "Heavy armor" } as Equipment })).toBe(false)
    }
    // Presets replace generated instances; compare mechanics independently of fresh instance IDs.
    const mechanics = (rows: Feature[]) => rows.map((f) => ({ ...f, linkedModifiers: f.linkedModifiers?.map(({ instanceId: _instanceId, ...m }) => m) }))
    expect(mechanics(enrich("Swordsage", wired))).toEqual(mechanics(wired))
  })

  it("keeps post-Second-Wind movement conditional rather than increasing permanent speed", () => {
    const features = enrich("Marksman", [{ ...row("Tactical Reposition"), linkedModifiers: [{ instanceId: "old", catalogRefId: "cat_char_speed", characteristics: [{ id: "speed", type: "speed", mode: "add", value: 10 }] }] } as Feature])
    const modifiers = features.flatMap((f) => f.linkedModifiers ?? []).flatMap((m) => m.characteristics ?? [])
    expect(modifiers.some((m) => m.type === "speed")).toBe(false)
    expect(modifiers).toContainEqual(expect.objectContaining({ type: "power_rider", parentPowerNames: ["Second Wind"] }))
  })

  it.each([
    ["Sylvan Archer", "Sylvan Shot", 7, "bonus"],
    ["Pugilist", "Counter Punch", 7, "reaction"],
    ["Shadowdancer", "Dark Sacrifice", 10, "reaction"],
    ["Arcane Knight", "Enchanted Armaments", 3, "bonus"],
  ])("exposes %s's %s only after its unlock", (subclass, name, level, kind) => {
    const features = enrich(subclass as string, [row(name as string, level as number)])
    const actions = (currentLevel: number) => collectSheetActions({ species: null, classDetails: [{
      row: { class_id: "fighter", subclass_id: "sub", level: currentLevel, order: 0 },
      class: { id: "fighter", name: "Alternate Fighter", features: [] } as unknown as DndClass,
      subclass: { id: "sub", name: subclass, features } as Subclass,
    }] })
    expect(actions((level as number) - 1).some((a) => a.name === name)).toBe(false)
    expect(actions(level as number).find((a) => a.name === name)?.kinds).toContain(kind)
  })

  it("does not apply Alternate Fighter overrides to the original Fighter", () => {
    const features = [row("Battle Trance")]
    expect(enrichSubclassFeaturesWithPresets(features, "Fighter", "Swordsage")).toEqual(features)
  })

  it("does not multiply Runic Might saves or damage riders on repeated imports", () => {
    let features = [row("Runic Might")]
    for (let i = 0; i < 4; i++) features = enrich("Runecarver", features)
    const modifiers = features.flatMap((f) => f.linkedModifiers ?? [])
    const effects = modifiers.flatMap((m) => m.activation?.effects ?? [])
    expect(effects.filter((e) => e.kind === "check_roll_modifier")).toHaveLength(2)
    expect(modifiers.flatMap((m) => m.characteristics ?? []).filter((m) => m.type === "power_rider")).toHaveLength(1)
    for (const effect of effects) {
      expect(modifierLimitationsMet(effect, {})).toBe(false)
      expect(modifierLimitationsMet(effect, { activeSheetToggles: new Set(["runic_might_active"]) })).toBe(true)
    }
  })
})
