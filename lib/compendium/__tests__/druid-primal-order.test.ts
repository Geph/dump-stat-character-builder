import { describe, expect, it } from "vitest"
import { computeDerivedCharacter } from "@/lib/character/compute-derived"
import { enrichSrdClassRow } from "@/lib/compendium/enrich-srd-classes"
import { featureChoiceKey } from "@/lib/builder/choices"
import type { DndClass } from "@/lib/types"
import bundledClasses from "@/lib/srd/seed-data/classes.json"

const druidSeed = bundledClasses.find((c) => c.name === "Druid")!

function enrichedDruid(): DndClass {
  const row = enrichSrdClassRow({ ...druidSeed, source: "SRD", id: "druid-test" })
  return row as unknown as DndClass
}

describe("Druid Primal Order weapon proficiencies", () => {
  it("seed Druid class row has only simple weapons", () => {
    expect(druidSeed.weapon_proficiencies).toEqual(["Simple weapons"])
  })

  it("enriched Primal Order wires Warden martial weapons on the option only", () => {
    const druid = enrichedDruid()
    const primalOrder = druid.features?.find((f) => f.name === "Primal Order")
    expect(primalOrder?.isChoice).toBe(true)

    const warden = primalOrder?.choices?.options.find((o) => o.name === "Warden")
    const magician = primalOrder?.choices?.options.find((o) => o.name === "Magician")
    expect(warden?.linkedModifiers?.length).toBeGreaterThan(0)
    expect(magician?.linkedModifiers?.length).toBeGreaterThan(0)

    const featureLevelMods =
      primalOrder?.linkedModifiers?.flatMap((m) => m.characteristics ?? []) ?? []
    const wardenMods = warden?.linkedModifiers?.flatMap((m) => m.characteristics ?? []) ?? []
    expect(
      featureLevelMods.some(
        (c) => c.type === "weapon_proficiencies" && c.mode === "martial_weapons",
      ),
    ).toBe(false)
    expect(
      wardenMods.some((c) => c.type === "weapon_proficiencies" && c.mode === "martial_weapons"),
    ).toBe(true)
  })

  it("does not grant martial weapons before Primal Order is chosen", () => {
    const druid = enrichedDruid()
    const derived = computeDerivedCharacter({
      baseAbilityScores: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      },
      asiAllocations: {},
      classLevels: [{ classId: druid.id, level: 1 }],
      classes: [druid],
      subclasses: [],
      subclassByClassId: {},
      classSkillPicks: {},
      classToolPicks: {},
      featureChoicePicks: {},
      speciesTraitPicks: {},
      featChoicePicks: {},
      modifierPlayerPicks: {},
      selectedFeatIds: [],
      grantedFeatIds: [],
      featSelectionEntries: [],
      extraSkillProficiencies: [],
      extraToolProficiencies: [],
      extraWeaponProficiencies: [],
      extraArmorProficiencies: [],
      languages: ["Common"],
      equipment: [],
      modifierCatalog: [],
      feats: [],
      customAbilities: [],
      primaryClassId: druid.id,
      classAddOrder: [druid.id],
    })

    expect(derived.weaponProficiencies).toEqual(["Simple weapons"])
    expect(derived.weaponProficiencies).not.toContain("Martial weapons")
    expect(derived.armorProficiencies).toEqual(["Light armor", "Shields"])
    expect(derived.armorProficiencies).not.toContain("Medium armor")
  })

  it("grants martial weapons when Warden is chosen", () => {
    const druid = enrichedDruid()
    const key = featureChoiceKey(druid.id, "Primal Order", 1)
    const derived = computeDerivedCharacter({
      baseAbilityScores: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      },
      asiAllocations: {},
      classLevels: [{ classId: druid.id, level: 1 }],
      classes: [druid],
      subclasses: [],
      subclassByClassId: {},
      classSkillPicks: {},
      classToolPicks: {},
      featureChoicePicks: { [key]: ["Warden"] },
      speciesTraitPicks: {},
      featChoicePicks: {},
      modifierPlayerPicks: {},
      selectedFeatIds: [],
      grantedFeatIds: [],
      featSelectionEntries: [],
      extraSkillProficiencies: [],
      extraToolProficiencies: [],
      extraWeaponProficiencies: [],
      extraArmorProficiencies: [],
      languages: ["Common"],
      equipment: [],
      modifierCatalog: [],
      feats: [],
      customAbilities: [],
      primaryClassId: druid.id,
      classAddOrder: [druid.id],
    })

    expect(derived.weaponProficiencies).toContain("Simple weapons")
    expect(derived.weaponProficiencies).toContain("Martial weapons")
    expect(derived.armorProficiencies).toContain("Medium armor")
  })
})
