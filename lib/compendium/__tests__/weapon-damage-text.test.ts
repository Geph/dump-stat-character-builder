import { describe, expect, it } from "vitest"
import {
  getWeaponDamageDiceNotation,
  getWeaponDamageText,
} from "@/lib/compendium/combat-stats"
import { optionalWeaponDamageReplacements } from "@/lib/compendium/weapon-damage-roll"
import type { PowerRiderCharacteristic } from "@/lib/compendium/characteristic-modifiers"
import type { Equipment } from "@/lib/types"

const whip = {
  id: "whip",
  name: "Whip",
  category: "Weapon",
  subcategory: "Martial Melee Weapons",
  properties: { damage: "1d4 Slashing", properties: ["Finesse", "Reach"] },
} as unknown as Equipment

describe("weapon damage text", () => {
  it("reads damage from the properties object used by 2024 SRD weapons", () => {
    expect(getWeaponDamageText(whip)).toBe("1d4 Slashing")
    expect(getWeaponDamageDiceNotation(whip)).toBe("1d4")
  })

  it("reads damage when properties was stored as a JSON string", () => {
    const row = {
      ...whip,
      properties: JSON.stringify(whip.properties),
    } as unknown as Equipment
    expect(getWeaponDamageText(row)).toBe("1d4 Slashing")
  })
})

describe("optional Deadly D4s replacements", () => {
  const rider = {
    id: "char_deadly_d4s",
    type: "power_rider",
    parentPowerNames: ["Attack"],
    alertSummary: "Deadly D4s: optional 2d4. Dervish Firearms: 2d4 → 3d4.",
  } as PowerRiderCharacteristic

  it("offers Deadly D4s on a 1d4 weapon without Dervish Firearms", () => {
    expect(optionalWeaponDamageReplacements(whip, [rider])).toEqual([
      { id: "deadly-d4s", label: "Deadly D4s", dice: "2d4" },
    ])
  })

  it("offers Dervish Firearms only on a 2d4 firearm", () => {
    const parlorGun = {
      ...whip,
      name: "Parlor Gun",
      subcategory: "Industrial Age Firearm",
      properties: {
        damage: "2d4 Piercing",
        properties: ["Ammunition (Range 20/60; Bullet)", "Firearm", "Reload (2)"],
      },
    } as unknown as Equipment
    expect(optionalWeaponDamageReplacements(parlorGun, [rider])).toEqual([
      { id: "dervish-firearms", label: "Dervish Firearms", dice: "3d4" },
    ])
  })

  it("does not offer Dervish Firearms on a 2d4 non-firearm", () => {
    const dart = {
      ...whip,
      name: "Dart",
      subcategory: "Simple Ranged Weapons",
      properties: { damage: "2d4 Piercing", properties: ["Finesse", "Thrown"] },
    } as unknown as Equipment
    expect(optionalWeaponDamageReplacements(dart, [rider])).toEqual([])
  })

  it("does not offer Dervish Firearms on a 2d6 firearm", () => {
    const revolver = {
      ...whip,
      name: "Revolver",
      subcategory: "Martial Ranged Weapons",
      properties: {
        damage: "2d6 Piercing",
        properties: ["Firearm", "Reload (6)"],
      },
    } as unknown as Equipment
    expect(optionalWeaponDamageReplacements(revolver, [rider])).toEqual([])
  })

  it("does not rewrite a 1d8 weapon", () => {
    const trident = {
      ...whip,
      name: "Trident",
      properties: { damage: "1d8 Piercing" },
    } as unknown as Equipment
    expect(optionalWeaponDamageReplacements(trident, [rider])).toEqual([])
  })
})
