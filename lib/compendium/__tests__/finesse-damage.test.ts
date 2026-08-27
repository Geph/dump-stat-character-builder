import { describe, expect, it } from "vitest"
import { computeDerivedCharacter } from "@/lib/character/compute-derived"
import { baseInputs, fighterClass } from "@/lib/character/__tests__/fixtures"
import {
  calculateWeaponAttack,
  getWeaponAttackAbility,
  hasWeaponProperty,
  weaponOmitsAbilityModifierFromDamage,
} from "@/lib/compendium/combat-stats"
import { cleanProperties } from "@/lib/import/normalize-equipment"
import equipmentSeed from "@/lib/srd/seed-data/equipment.json"
import type { Equipment } from "@/lib/types"

function seedWeapon(name: string): Equipment {
  const row = (equipmentSeed as unknown as Equipment[]).find((item) => item.name === name)
  if (!row) throw new Error(`missing seed weapon ${name}`)
  return { ...row, id: name.toLowerCase().replace(/\s+/g, "-") }
}

const dexMods = {
  strength: 1,
  dexterity: 4,
  constitution: 0,
  intelligence: 0,
  wisdom: 0,
  charisma: 0,
}

const strMods = {
  strength: 3,
  dexterity: 1,
  constitution: 0,
  intelligence: 0,
  wisdom: 0,
  charisma: 0,
}

describe("Finesse weapon damage ability", () => {
  it("detects Finesse on SRD seed weapons", () => {
    expect(hasWeaponProperty(seedWeapon("Rapier"), "finesse")).toBe(true)
    expect(hasWeaponProperty(seedWeapon("Shortsword"), "finesse")).toBe(true)
    expect(hasWeaponProperty(seedWeapon("Longsword"), "finesse")).toBe(false)
  })

  it("uses the higher of Strength or Dexterity for Finesse damage", () => {
    const rapier = seedWeapon("Rapier")
    expect(getWeaponAttackAbility(rapier, dexMods, { forRoll: "damage" })).toMatchObject({
      ability: "dexterity",
      mod: 4,
    })
    expect(getWeaponAttackAbility(rapier, strMods, { forRoll: "damage" })).toMatchObject({
      ability: "strength",
      mod: 3,
    })
  })

  it("detects Finesse from array tags and boolean flags", () => {
    const arrayRapier = {
      id: "rapier-array",
      name: "Rapier",
      category: "Weapon",
      subcategory: "Martial Melee Weapons",
      damage: "1d8",
      damage_type: "Piercing",
      properties: ["Finesse"],
    } as unknown as Equipment
    const flagRapier = {
      ...arrayRapier,
      id: "rapier-flag",
      properties: { finesse: true, damage: "1d8 Piercing" },
    } as unknown as Equipment
    expect(hasWeaponProperty(arrayRapier, "finesse")).toBe(true)
    expect(hasWeaponProperty(flagRapier, "finesse")).toBe(true)
    expect(getWeaponAttackAbility(arrayRapier, dexMods, { forRoll: "damage" }).mod).toBe(4)
    expect(getWeaponAttackAbility(flagRapier, strMods, { forRoll: "damage" }).mod).toBe(3)
    expect(cleanProperties(["Finesse", "Light"])).toEqual({ properties: ["Finesse", "Light"] })
  })
})

describe("Finesse damage on the sheet", () => {
  it("adds the higher modifier on a main-hand Rapier", () => {
    const rapier = seedWeapon("Rapier")
    const derived = computeDerivedCharacter(
      baseInputs({
        baseAbilityScores: {
          strength: 12,
          dexterity: 18,
          constitution: 10,
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
        },
        classLevels: [{ classId: fighterClass.id, level: 1 }],
        classes: [fighterClass],
        primaryClassId: fighterClass.id,
        extraWeaponProficiencies: ["Martial weapons"],
        equipment: [rapier],
        equippedWeaponId: rapier.id,
      }),
    )
    expect(derived.equippedWeaponAttack?.damageDisplay).toMatch(/1d8 \+ 4/)
    expect(derived.equippedWeaponAttack?.damageAbilityMod).toBe(4)
  })

  it("omits the positive ability modifier from an off-hand Finesse weapon", () => {
    const shortsword = seedWeapon("Shortsword")
    const dagger = seedWeapon("Dagger")
    const derived = computeDerivedCharacter(
      baseInputs({
        baseAbilityScores: {
          strength: 12,
          dexterity: 18,
          constitution: 10,
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
        },
        classLevels: [{ classId: fighterClass.id, level: 1 }],
        classes: [fighterClass],
        primaryClassId: fighterClass.id,
        extraWeaponProficiencies: ["Martial weapons", "Simple weapons"],
        equipment: [shortsword, dagger],
        equippedWeaponId: shortsword.id,
        equippedOffHandWeaponId: dagger.id,
      }),
    )
    expect(derived.equippedWeaponAttack?.damageDisplay).toMatch(/\+ 4/)
    expect(derived.equippedOffHandWeaponAttack?.damageDisplay).not.toMatch(/\+ 4/)
    expect(derived.equippedOffHandWeaponAttack?.damageAbilityMod).toBe(4)
  })
})

describe("Firearm weapon damage", () => {
  const revolver = {
    id: "revolver",
    name: "Revolver",
    category: "Weapon",
    subcategory: "Martial Ranged Weapons",
    properties: {
      damage: "2d6 Piercing",
      mastery: "Slow",
      properties: [
        "Ammunition (Range 30/120; Bullet)",
        "Firearm",
        "Recoil",
        "Reload (6)",
      ],
    },
  } as unknown as Equipment

  it("omits the ability modifier from Firearm damage but keeps it on the attack roll", () => {
    expect(weaponOmitsAbilityModifierFromDamage(revolver)).toBe(true)
    const result = calculateWeaponAttack(revolver, dexMods, 2, true)
    expect(result?.damageDisplay).toBe("2d6 Piercing")
    expect(result?.attackBonus).toBe(6)
  })

  it("shows Firearm damage without the Dexterity bonus on the sheet", () => {
    const derived = computeDerivedCharacter(
      baseInputs({
        baseAbilityScores: {
          strength: 12,
          dexterity: 18,
          constitution: 10,
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
        },
        classLevels: [{ classId: fighterClass.id, level: 1 }],
        classes: [fighterClass],
        primaryClassId: fighterClass.id,
        extraWeaponProficiencies: ["Martial weapons"],
        equipment: [revolver],
        equippedWeaponId: revolver.id,
      }),
    )
    expect(derived.equippedWeaponAttack?.damageDisplay).toBe("2d6 Piercing")
    expect(derived.equippedWeaponAttack?.attackBonus).toBe(6)
  })
})
