import { describe, expect, it } from "vitest"
import { enrichClassFeatureWithModifierPresets } from "@/lib/compendium/enrich-srd-class-features"

function chars(feature: ReturnType<typeof enrichClassFeatureWithModifierPresets>) {
  return (feature.linkedModifiers ?? []).flatMap((entry) => entry.characteristics ?? [])
}

function fxKinds(feature: ReturnType<typeof enrichClassFeatureWithModifierPresets>) {
  return (feature.linkedModifiers ?? []).flatMap((entry) => (entry.activation?.effects ?? []).map((fx) => fx.kind))
}

function wire(className: string, subclassName: string, featureName: string, description = featureName) {
  return enrichClassFeatureWithModifierPresets(
    className,
    { level: 3, name: featureName, description },
    subclassName,
    { skipMechanicalDetection: true },
  )
}

describe("Ravenloft mixed subclass set wiring", () => {
  it("wires Reanimator's Skill Set (matches the real two-word source name, not 'Skillset')", () => {
    const feature = wire("Artificer", "Reanimator", "Reanimator’s Skill Set")
    const types = chars(feature).map((c) => c.type)
    expect(types).toContain("uses")
    expect(types).toContain("tool_proficiencies")
  })

  it("wires Reanimated Companion, Strange Modifications, and later Reanimator upgrades", () => {
    for (const name of [
      "Reanimated Companion",
      "Strange Modifications",
      "Improved Reanimation",
      "Macabre Modifications",
      "Refined Reanimation",
    ]) {
      const feature = wire("Artificer", "Reanimator", name)
      // Feature-option-picker presets (e.g. Strange Modifications) get migrated into
      // feature.isChoice/choices rather than staying as a "feature_option_picker" characteristic.
      expect(chars(feature).length > 0 || feature.isChoice === true, name).toBe(true)
    }

    const strange = wire("Artificer", "Reanimator", "Strange Modifications")
    expect(strange.isChoice).toBe(true)
    expect(strange.choices?.choiceCountByLevel).toEqual([
      { level: 5, count: 1 },
      { level: 9, count: 2 },
      { level: 15, count: 3 },
    ])
    expect((strange.choices?.options ?? []).map((o) => o.name)).toEqual(
      expect.arrayContaining(["Arcane Conduit", "Ferocity", "Bloated", "Gaunt", "Moist"]),
    )
    expect((strange.choices?.options ?? []).every((o) => (o.linkedModifiers?.length ?? 0) > 0)).toBe(true)

    // Macabre/Superior are unlock blurbs — not a second polluting picker.
    const macabre = wire("Artificer", "Reanimator", "Macabre Modifications")
    expect(macabre.isChoice ?? false).toBe(false)
    expect(chars(macabre).some((c) => c.type === "uses")).toBe(true)
  })

  it("wires Bard College of Spirits: Channeler, Spirits from Beyond, Empowered Channeling, Mystical Connection", () => {
    const channeler = wire("Bard", "College of Spirits", "Channeler")
    const channelerTypes = chars(channeler).map((c) => c.type)
    expect(channelerTypes).toContain("spells_known")
    expect(channelerTypes).toContain("tool_proficiencies")

    const spirits = wire("Bard", "College of Spirits", "Spirits from Beyond")
    expect(chars(spirits).some((c) => c.type === "resource_ability_menu")).toBe(true)

    const empowered = wire("Bard", "College of Spirits", "Empowered Channeling")
    const empoweredTypes = chars(empowered).map((c) => c.type)
    expect(empoweredTypes).toContain("spells_known")
    expect(empoweredTypes).toContain("uses")

    const mystical = wire("Bard", "College of Spirits", "Mystical Connection")
    expect(chars(mystical).some((c) => c.type === "uses")).toBe(true)
  })

  it("wires Cleric Grave Domain: Circle of Mortality, Path to the Grave, Sentinel, Divine Reaper", () => {
    const circle = wire("Cleric", "Grave Domain", "Circle of Mortality")
    const circleTypes = chars(circle).map((c) => c.type)
    expect(circleTypes).toContain("on_hit_trigger")
    expect(circleTypes).toContain("spell_healing_modifier")

    const path = wire("Cleric", "Grave Domain", "Path to the Grave")
    expect(path.activation?.bonusAction).toBe(true)
    expect(chars(path).some((c) => c.type === "uses")).toBe(true)
    expect(fxKinds(path)).toContain("modify_creature")

    const sentinel = wire("Cleric", "Grave Domain", "Sentinel at Death's Door")
    expect(chars(sentinel).some((c) => c.type === "damage_halving_reaction")).toBe(true)

    const divineReaper = wire("Cleric", "Grave Domain", "Divine Reaper")
    const reaperTypes = chars(divineReaper).map((c) => c.type)
    expect(reaperTypes).toContain("uses")
    expect(reaperTypes).toContain("on_creature_death_trigger")
  })

  it("wires Ranger Hollow Warden signature features", () => {
    for (const name of ["Wrath of the Wild", "Hungering Might", "Rot and Violence", "Ancient Might"]) {
      const feature = wire("Ranger", "Hollow Warden", name)
      expect(chars(feature).length + fxKinds(feature).length, name).toBeGreaterThan(0)
    }
    const wrath = wire("Ranger", "Hollow Warden", "Wrath of the Wild")
    const wrathBlob = JSON.stringify(wrath.linkedModifiers ?? [])
    expect(wrathBlob).toContain("wrath_of_the_wild_form")
  })

  it("wires Rogue Phantom: Wails from the Grave, Tokens, Ghost Walk, Voice of Death", () => {
    const wails = wire("Rogue", "Phantom", "Wails from the Grave")
    expect(chars(wails).some((c) => c.type === "uses")).toBe(true)
    expect(chars(wails).some((c) => c.type === "on_hit_trigger")).toBe(true)

    const ghostWalk = wire("Rogue", "Phantom", "Ghost Walk")
    expect(ghostWalk.activation?.bonusAction).toBe(true)
    expect(chars(ghostWalk).some((c) => c.type === "speed")).toBe(true)
    expect(JSON.stringify(ghostWalk.linkedModifiers ?? [])).toContain("ghost_walk_form")

    const voiceOfDeath = wire("Rogue", "Phantom", "Voice of Death")
    expect(chars(voiceOfDeath).some((c) => c.type === "uses")).toBe(true)
  })

  it("wires Sorcerer Shadow Sorcery: Power of Shadow, Shadow Walk, Umbral Form", () => {
    const power = wire("Sorcerer", "Shadow Sorcery", "Power of Shadow")
    const powerTypes = chars(power).map((c) => c.type)
    expect(powerTypes.filter((t) => t === "vision").length).toBe(2)

    const shadowWalk = wire("Sorcerer", "Shadow Sorcery", "Shadow Walk")
    expect(shadowWalk.activation?.bonusAction).toBe(true)
    expect(fxKinds(shadowWalk)).toContain("movement_option")

    const umbral = wire("Sorcerer", "Shadow Sorcery", "Umbral Form")
    expect(chars(umbral).some((c) => c.type === "damage_resistance")).toBe(true)
    expect(JSON.stringify(umbral.linkedModifiers ?? [])).toContain("umbral_form")
    const res = chars(umbral).find((c) => c.type === "damage_resistance") as {
      damageTypes?: string[]
    }
    expect(res?.damageTypes?.length).toBeGreaterThanOrEqual(10)
    expect(res?.damageTypes ?? []).not.toContain("Force")
    expect(res?.damageTypes ?? []).not.toContain("Radiant")
  })

  it("wires Warlock Undead Patron: Form of Dread, Necrotic Husk, Superior Dread", () => {
    const formOfDread = wire("Warlock", "Undead Patron", "Form of Dread")
    expect(formOfDread.activation?.bonusAction).toBe(true)
    const formTypes = chars(formOfDread).map((c) => c.type)
    expect(formTypes).toContain("uses")
    expect(formTypes).toContain("condition_immunity")
    expect(fxKinds(formOfDread)).toContain("grant_temp_hp")

    const necroticHusk = wire("Warlock", "Undead Patron", "Necrotic Husk")
    const huskTypes = necroticHusk ? chars(necroticHusk).map((c) => c.type) : []
    expect(huskTypes).toContain("damage_resistance")
    expect(huskTypes).toContain("damage_immunity")
    expect(huskTypes).toContain("uses")

    const superiorDread = wire("Warlock", "Undead Patron", "Superior Dread")
    const superiorTypes = chars(superiorDread).map((c) => c.type)
    expect(superiorTypes).toContain("damage_resistance")
    expect(superiorTypes).toContain("speed")
  })
})
