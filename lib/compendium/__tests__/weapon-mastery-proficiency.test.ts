import { describe, expect, it } from "vitest"
import { isWeaponProficient } from "@/lib/compendium/combat-stats"
import { enrichSrdClassRow } from "@/lib/compendium/enrich-srd-classes"
import { enrichClassesList } from "@/lib/compendium/normalize-class-data"
import {
  applyWeaponMasteryProficiencies,
  weaponMasteryOptionsForClass,
} from "@/lib/compendium/weapon-mastery-choice"
import equipmentSeed from "@/lib/srd/seed-data/equipment.json"
import srdClasses from "@/lib/srd/seed-data/classes.json"
import type { DndClass, Equipment, Feature } from "@/lib/types"

const DANCER_PROFICIENCIES = [
  "Simple Weapons",
  "Martial weapons that have the Finesse or Light property",
]

function weapon(name: string): Equipment {
  const row = (equipmentSeed as unknown as Equipment[]).find((item) => item.name === name)
  if (!row) throw new Error(`missing seed weapon ${name}`)
  return row
}

function allMasteryWeaponOptions() {
  return weaponMasteryOptionsForClass("Dancer").map((option) => option.name)
}

describe("weapon proficiency qualifiers", () => {
  it("honors Finesse or Light martial qualifiers", () => {
    expect(isWeaponProficient(weapon("Rapier"), DANCER_PROFICIENCIES)).toBe(true)
    expect(isWeaponProficient(weapon("Shortsword"), DANCER_PROFICIENCIES)).toBe(true)
    expect(isWeaponProficient(weapon("Hand Crossbow"), DANCER_PROFICIENCIES)).toBe(true)
    expect(isWeaponProficient(weapon("Dagger"), DANCER_PROFICIENCIES)).toBe(true)
    expect(isWeaponProficient(weapon("Greataxe"), DANCER_PROFICIENCIES)).toBe(false)
    expect(isWeaponProficient(weapon("Longsword"), DANCER_PROFICIENCIES)).toBe(false)
    expect(isWeaponProficient(weapon("Longbow"), DANCER_PROFICIENCIES)).toBe(false)
  })

  it("honors melee / ranged category qualifiers (Gunslinger)", () => {
    const gunslinger = ["Simple weapons", "Martial Ranged weapons"]
    expect(isWeaponProficient(weapon("Longbow"), gunslinger)).toBe(true)
    expect(isWeaponProficient(weapon("Greataxe"), gunslinger)).toBe(false)
    expect(isWeaponProficient(weapon("Club"), gunslinger)).toBe(true)
  })
})

describe("weapon mastery options scoped to class proficiencies", () => {
  it("limits Dancer masteries to Simple plus Finesse/Light Martial weapons", () => {
    const options = weaponMasteryOptionsForClass("Dancer", [], null, DANCER_PROFICIENCIES).map(
      (option) => option.name,
    )
    expect(options).toContain("Rapier")
    expect(options).toContain("Shortsword")
    expect(options).toContain("Dagger")
    expect(options).not.toContain("Greataxe")
    expect(options).not.toContain("Longbow")
    expect(options.length).toBeLessThan(allMasteryWeaponOptions().length)
  })

  it("filters stored options on a class row without touching unknown homebrew weapons", () => {
    const row = applyWeaponMasteryProficiencies({
      name: "Dancer",
      weapon_proficiencies: DANCER_PROFICIENCIES,
      features: [
        {
          level: 1,
          name: "Weapon Mastery",
          description: "two kinds of weapons of your choice with which you have proficiency",
          isChoice: true,
          choices: {
            category: "Weapon Mastery",
            count: 2,
            options: [
              { name: "Rapier", description: "Vex" },
              { name: "Greataxe", description: "Cleave" },
              { name: "Longbow", description: "Slow" },
              { name: "Ribbon Blade", description: "Homebrew" },
            ],
          },
        } as Feature,
      ],
    })

    const options = (row.features as Feature[])[0].choices?.options.map((o) => o.name)
    expect(options).toEqual(["Rapier", "Ribbon Blade"])
  })

  it("keeps Barbarian melee-only and Fighter full pools intact", () => {
    const barbarian = weaponMasteryOptionsForClass("Barbarian", [], null, [
      "Simple weapons",
      "Martial weapons",
    ]).map((option) => option.name)
    expect(barbarian).toContain("Greataxe")
    expect(barbarian).not.toContain("Longbow")

    const fighter = weaponMasteryOptionsForClass("Fighter", [], null, [
      "Simple weapons",
      "Martial weapons",
    ]).map((option) => option.name)
    expect(fighter).toContain("Longbow")
    expect(fighter).toContain("Greataxe")
  })

  it("includes imported proficient weapons in a class mastery picker", () => {
    const revolver = {
      id: "revolver",
      name: "Revolver",
      category: "Weapon",
      subcategory: "Martial Ranged",
      properties: {
        damage: "2d6 Piercing",
        properties: ["Ammunition (Range 30/120; Bullet)", "Reload (6)"],
        mastery: "Vex",
      },
    } as unknown as Equipment

    const gunslinger = weaponMasteryOptionsForClass(
      "Gunslinger",
      [revolver],
      null,
      ["Simple weapons", "Martial Ranged weapons"],
    ).map((option) => option.name)

    expect(gunslinger).toContain("Revolver")
  })
})

describe("SRD Rogue weapon proficiency qualifier", () => {
  it("restores the Finesse-or-Light qualifier the parser flattens", () => {
    const seed = (srdClasses as unknown as Record<string, unknown>[]).find(
      (row) => row.name === "Rogue",
    )!
    const rogue = enrichSrdClassRow({ ...seed, source: "SRD" })
    expect(rogue.weapon_proficiencies).toEqual([
      "Simple weapons",
      "Martial weapons that have the Finesse or Light property",
    ])

    const [enriched] = enrichClassesList([rogue as unknown as DndClass])
    const mastery = (enriched.features as Feature[]).find((feature) =>
      /^weapon mastery$/i.test(feature.name),
    )
    const options = mastery?.choices?.options.map((option) => option.name) ?? []
    expect(options).toContain("Rapier")
    expect(options).not.toContain("Greataxe")
  })
})
