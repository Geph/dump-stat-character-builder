import { describe, expect, it } from "vitest"
import { enrichSrdClassRow } from "@/lib/compendium/enrich-srd-classes"
import { isWeaponProficient } from "@/lib/compendium/combat-stats"
import type { Equipment, Feature } from "@/lib/types"

function monkRow() {
  return enrichSrdClassRow({
    name: "Monk",
    source: "srd",
    weapon_proficiencies: ["Simple weapons", "Martial weapons"],
    armor_proficiencies: [],
    features: [
      { level: 1, name: "Martial Arts", description: "Unarmed prowess." },
      { level: 1, name: "Unarmored Defense", description: "AC = 10 + DEX + WIS." },
      { level: 2, name: "Monk's Focus", description: "Flurry of Blows, Patient Defense, Step of the Wind." },
    ],
  })
}

function makeWeapon(partial: Partial<Equipment>): Equipment {
  return {
    id: "w",
    name: "Weapon",
    category: "Weapon",
    subcategory: "Martial Melee Weapons",
    properties: null,
    ...partial,
  } as Equipment
}

describe("Monk SRD proficiency wiring", () => {
  it("overrides weapon proficiencies to the Light-qualified martial wording", () => {
    const monk = monkRow()
    expect(monk.weapon_proficiencies).toEqual([
      "Simple weapons",
      "Martial weapons that have the Light property",
    ])
  })

  it("attaches a tool-proficiency choice (Artisan's Tools or Musical Instrument) to Martial Arts", () => {
    const monk = monkRow()
    const features = monk.features as Feature[]
    const martialArts = features.find((f) => f.name === "Martial Arts")
    const toolMods = (martialArts?.linkedModifiers ?? []).flatMap((instance) =>
      (instance.characteristics ?? []).filter((mod) => mod.type === "tool_proficiencies"),
    )
    expect(toolMods.length).toBe(1)
    const mod = toolMods[0] as { choiceCount?: number; choiceOptions?: string[] }
    expect(mod.choiceCount).toBe(1)
    expect(mod.choiceOptions).toContain("Smith's Tools")
    expect(mod.choiceOptions).toContain("Lute")
  })
})

describe("isWeaponProficient with Light-qualified martial proficiency", () => {
  const profs = ["Simple weapons", "Martial weapons that have the Light property"]

  it("is proficient with a Light martial weapon (Shortsword)", () => {
    const shortsword = makeWeapon({
      name: "Shortsword",
      subcategory: "Martial Melee Weapons",
      properties: ["Finesse", "Light"],
    })
    expect(isWeaponProficient(shortsword, profs)).toBe(true)
  })

  it("is NOT proficient with a non-Light martial weapon (Greatsword)", () => {
    const greatsword = makeWeapon({
      name: "Greatsword",
      subcategory: "Martial Melee Weapons",
      properties: ["Heavy", "Two-Handed"],
    })
    expect(isWeaponProficient(greatsword, profs)).toBe(false)
  })

  it("is proficient with simple weapons regardless of properties", () => {
    const club = makeWeapon({
      name: "Club",
      subcategory: "Simple Melee Weapons",
      properties: ["Light"],
    })
    expect(isWeaponProficient(club, profs)).toBe(true)
  })

  it("still grants all martial weapons for an unqualified proficiency", () => {
    const greatsword = makeWeapon({
      name: "Greatsword",
      subcategory: "Martial Melee Weapons",
      properties: ["Heavy", "Two-Handed"],
    })
    expect(isWeaponProficient(greatsword, ["Martial weapons"])).toBe(true)
  })
})
