import { describe, expect, it } from "vitest"
import { longbowEquipment, shieldEquipment } from "@/lib/character/__tests__/fixtures"
import {
  constrainEquipmentLoadout,
  exclusiveTwoHandedEquipWarning,
  isExclusiveTwoHandedWeapon,
  occupiedHandsBlockReason,
} from "@/lib/character/wield-constraints"
import type { Equipment } from "@/lib/types"

const versatileTwoHanded = {
  id: "versatile-glaive",
  name: "Versatile Glaive",
  category: "Weapon",
  properties: ["Two-handed", "Versatile"],
} as unknown as Equipment

const shortsword = {
  id: "shortsword",
  name: "Shortsword",
  category: "Weapon",
  properties: ["Light", "Finesse"],
} as unknown as Equipment

const twoHandedLoadout = {
  armorId: null,
  shieldId: shieldEquipment.id,
  weaponId: longbowEquipment.id,
  offHandWeaponId: shortsword.id,
}

describe("wield-constraints", () => {
  it("treats two-handed weapons as exclusive unless they are also versatile", () => {
    expect(isExclusiveTwoHandedWeapon(longbowEquipment)).toBe(true)
    expect(isExclusiveTwoHandedWeapon(versatileTwoHanded)).toBe(false)
    expect(isExclusiveTwoHandedWeapon(shortsword)).toBe(false)
  })

  it("clears shield and off-hand when an exclusive two-handed weapon is wielded", () => {
    expect(
      constrainEquipmentLoadout(twoHandedLoadout, [longbowEquipment, shieldEquipment, shortsword], 0),
    ).toEqual({
      armorId: null,
      shieldId: null,
      weaponId: longbowEquipment.id,
      offHandWeaponId: null,
    })
  })

  it("keeps shield and off-hand when extra wield slots apply", () => {
    expect(
      constrainEquipmentLoadout(twoHandedLoadout, [longbowEquipment, shieldEquipment, shortsword], 1),
    ).toEqual(twoHandedLoadout)
  })

  it("does not clear other hands for a versatile two-handed weapon", () => {
    expect(
      constrainEquipmentLoadout(
        {
          armorId: null,
          shieldId: shieldEquipment.id,
          weaponId: versatileTwoHanded.id,
          offHandWeaponId: null,
        },
        [versatileTwoHanded, shieldEquipment],
        0,
      ),
    ).toEqual({
      armorId: null,
      shieldId: shieldEquipment.id,
      weaponId: versatileTwoHanded.id,
      offHandWeaponId: null,
    })
  })

  it("explains exclusive two-handed occupancy", () => {
    expect(occupiedHandsBlockReason(0, longbowEquipment)).toMatch(/two-handed weapon/i)
    expect(occupiedHandsBlockReason(1, longbowEquipment)).toBeNull()
    expect(exclusiveTwoHandedEquipWarning(0, longbowEquipment, true)).toMatch(/unequips/i)
    expect(exclusiveTwoHandedEquipWarning(1, longbowEquipment, true)).toBeNull()
  })
})
