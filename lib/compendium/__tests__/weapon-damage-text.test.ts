import { describe, expect, it } from "vitest"
import {
  getWeaponDamageDiceNotation,
  getWeaponDamageText,
} from "@/lib/compendium/combat-stats"
import {
  optionalWeaponDamageBonuses,
  optionalWeaponDamageReplacements,
  preferredWeaponDamageDiceId,
  weaponDamageDiceOptions,
} from "@/lib/compendium/weapon-damage-roll"
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

describe("optional Grand Finale crit dice", () => {
  const deadly = {
    id: "char_deadly_d4s",
    type: "power_rider",
    parentPowerNames: ["Attack"],
    alertSummary: "Deadly D4s",
  } as PowerRiderCharacteristic
  const finale = {
    id: "char_grand_finale",
    type: "power_rider",
    parentPowerNames: ["Attack"],
    alertSummary: "Grand Finale: double dice",
  } as PowerRiderCharacteristic

  it("doubles Deadly D4s to 4d4 and prefers Grand Finale by default", () => {
    const options = optionalWeaponDamageReplacements(whip, [deadly, finale])
    expect(options).toEqual([
      { id: "deadly-d4s", label: "Deadly D4s", dice: "2d4" },
      { id: "grand-finale", label: "Grand Finale", dice: "4d4" },
    ])
    expect(preferredWeaponDamageDiceId(options)).toBe("grand-finale")
  })

  it("doubles printed dice when Deadly D4s do not apply", () => {
    const longsword = {
      ...whip,
      name: "Longsword",
      properties: { damage: "1d8 Slashing" },
    } as unknown as Equipment
    expect(optionalWeaponDamageReplacements(longsword, [finale])).toEqual([
      { id: "grand-finale", label: "Grand Finale", dice: "2d8" },
    ])
  })
})

describe("versatile two-handed damage options", () => {
  const longsword = {
    ...whip,
    name: "Longsword",
    properties: { damage: "1d8 Slashing (1d10)", properties: ["Versatile"] },
  } as unknown as Equipment

  it("lists two-handed but prefers one-handed when a shield occupies the other hand", () => {
    const options = weaponDamageDiceOptions(longsword, {
      twoHandedBlocked: true,
      twoHandedBlockedReason: "A shield occupies your other hand.",
    })
    expect(options).toEqual([
      { id: "one-handed", label: "One-handed", dice: "1d8" },
      {
        id: "two-handed",
        label: "Two-handed",
        dice: "1d10",
        disabled: true,
        disabledReason: "A shield occupies your other hand.",
      },
    ])
    expect(preferredWeaponDamageDiceId(options)).toBe("one-handed")
  })

  it("prefers two-handed when both hands are free", () => {
    const options = weaponDamageDiceOptions(longsword)
    const twoHanded = options.find((row) => row.id === "two-handed")
    expect(twoHanded).toMatchObject({ dice: "1d10" })
    expect(twoHanded?.disabled).toBeFalsy()
    expect(preferredWeaponDamageDiceId(options)).toBe("two-handed")
  })
})

describe("optional Fierce Start damage bonuses", () => {
  const rider = {
    id: "char_fierce_start",
    type: "power_rider",
    parentPowerNames: ["Attack", "Unarmed Strike"],
    alertSummary: "Fierce Start: +CHA on first round.",
  } as PowerRiderCharacteristic

  const abilityMods = {
    strength: 1,
    dexterity: 3,
    constitution: 2,
    intelligence: 0,
    wisdom: 1,
    charisma: 4,
  }

  it("offers Fierce Start +CHA on a weapon when the rider is present", () => {
    expect(optionalWeaponDamageBonuses(whip, [rider], abilityMods)).toEqual([
      {
        id: "fierce-start",
        label: "Fierce Start (+4 CHA)",
        bonus: 4,
        title:
          "First round of combat: add your Charisma modifier to this weapon or Unarmed Strike damage roll.",
      },
    ])
  })

  it("omits Fierce Start without the rider", () => {
    expect(optionalWeaponDamageBonuses(whip, [], abilityMods)).toEqual([])
  })
})

describe("optional Finisher damage dice", () => {
  const finisherRider = {
    id: "mod_finisher_power_rider",
    type: "power_rider",
    parentPowerNames: ["Attack", "Unarmed Strike"],
    label: "Finisher",
    alertSummary: "Finisher: once per turn vs Bloodied.",
  } as PowerRiderCharacteristic

  it("offers Finisher dice scaled by Investigator level", () => {
    expect(
      optionalWeaponDamageBonuses(whip, [finisherRider], null, { investigatorLevel: 11 }),
    ).toEqual([
      expect.objectContaining({
        id: "finisher",
        label: "Finisher (2d8, Bloodied)",
        bonus: 0,
        bonusDice: "2d8",
        defaultSelected: false,
      }),
    ])
  })

  it("defaults Finisher selected when Bloodied is active", () => {
    const options = optionalWeaponDamageBonuses(whip, [finisherRider], null, {
      investigatorLevel: 5,
      activeSheetToggleIds: ["below_half_hp"],
    })
    expect(options[0]?.defaultSelected).toBe(true)
    expect(options[0]?.bonusDice).toBe("1d8")
  })

  it("offers Finisher and Improved Finisher as separate damage riders", () => {
    const improvedRider = {
      id: "mod_improved_finisher_power_rider",
      type: "power_rider",
      parentPowerNames: ["Attack", "Unarmed Strike"],
      label: "Improved Finisher",
      alertSummary: "Improved Finisher: once per turn on a hit.",
    } as PowerRiderCharacteristic

    const options = optionalWeaponDamageBonuses(whip, [finisherRider, improvedRider], null, {
      investigatorLevel: 11,
    })
    expect(options).toEqual([
      expect.objectContaining({
        id: "finisher",
        label: "Finisher (2d8, Bloodied)",
        bonusDice: "2d8",
        defaultSelected: false,
      }),
      expect.objectContaining({
        id: "improved-finisher",
        label: "Improved Finisher (1d8)",
        bonusDice: "1d8",
        defaultSelected: true,
      }),
    ])
  })

  it("emits a generic weaponDamageMenu rider without a Finisher name", () => {
    const rider = {
      id: "mod_exploit_weakness",
      type: "power_rider",
      parentPowerNames: ["Attack", "Unarmed Strike"],
      label: "Exploit Weakness",
      weaponDamageMenu: true,
      bonusDice: "1d6",
      alertSummary: "Once per turn you can add 1d6.",
    } as PowerRiderCharacteristic

    expect(optionalWeaponDamageBonuses(whip, [rider], null)).toEqual([
      expect.objectContaining({
        id: "exploit-weakness",
        label: "Exploit Weakness (1d6)",
        bonusDice: "1d6",
      }),
    ])
  })

  it("defaults Finisher (not Improved) when Bloodied and both riders exist", () => {
    const improvedRider = {
      id: "mod_improved_finisher_power_rider",
      type: "power_rider",
      parentPowerNames: ["Attack", "Unarmed Strike"],
      label: "Improved Finisher",
      alertSummary: "Improved Finisher: once per turn on a hit.",
    } as PowerRiderCharacteristic

    const options = optionalWeaponDamageBonuses(whip, [finisherRider, improvedRider], null, {
      investigatorLevel: 17,
      activeSheetToggleIds: ["below_half_hp"],
    })
    expect(options.find((row) => row.id === "finisher")).toMatchObject({
      bonusDice: "3d8",
      defaultSelected: true,
    })
    expect(options.find((row) => row.id === "improved-finisher")).toMatchObject({
      bonusDice: "1d8",
      defaultSelected: false,
    })
  })
})
