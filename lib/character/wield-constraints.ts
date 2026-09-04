import { hasWeaponProperty } from "@/lib/compendium/combat-stats"
import type { Equipment } from "@/lib/types"

export type EquipmentHandLoadout = {
  armorId: string | null
  shieldId: string | null
  weaponId: string | null
  offHandWeaponId: string | null
}

/** Two-handed (not Versatile) occupies both hands unless extra wield slots apply. */
export function isExclusiveTwoHandedWeapon(weapon: Equipment | null | undefined): boolean {
  if (!weapon) return false
  return hasWeaponProperty(weapon, "two-handed") && !hasWeaponProperty(weapon, "versatile")
}

export function twoHandedBlocksOtherHands(
  extraWieldSlots: number,
  mainWeapon: Equipment | null | undefined,
): boolean {
  return extraWieldSlots <= 0 && isExclusiveTwoHandedWeapon(mainWeapon)
}

export function constrainEquipmentLoadout(
  loadout: EquipmentHandLoadout,
  equipment: readonly Equipment[],
  extraWieldSlots: number,
): EquipmentHandLoadout {
  if (extraWieldSlots > 0) return loadout
  const byId = new Map(equipment.map((item) => [item.id, item]))
  const main = loadout.weaponId ? byId.get(loadout.weaponId) ?? null : null
  if (!isExclusiveTwoHandedWeapon(main)) return loadout
  return {
    ...loadout,
    shieldId: null,
    offHandWeaponId: null,
  }
}

export function exclusiveTwoHandedEquipWarning(
  extraWieldSlots: number,
  weapon: Equipment | null | undefined,
  hasShieldOrOffHand: boolean,
): string | null {
  if (!hasShieldOrOffHand || extraWieldSlots > 0 || !isExclusiveTwoHandedWeapon(weapon)) {
    return null
  }
  return "A two-handed weapon occupies both hands — this unequips your shield and off-hand weapon."
}

export function occupiedHandsBlockReason(
  extraWieldSlots: number,
  mainWeapon: Equipment | null | undefined,
): string | null {
  if (!twoHandedBlocksOtherHands(extraWieldSlots, mainWeapon)) return null
  return "You can't wield a shield or another weapon while using a two-handed weapon."
}
