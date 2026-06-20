import type { Equipment } from "@/lib/types"
import {
  calculateArmorClass,
  isArmorItem,
  isShieldItem,
  isWeaponItem,
} from "@/lib/compendium/combat-stats"

export type EquipmentLoadout = {
  armorId: string | null
  shieldId: string | null
  weaponId: string | null
}

export function ownedEquipmentItems(
  equipmentIds: string[],
  catalog: Equipment[],
): Equipment[] {
  const byId = new Map(catalog.map((item) => [item.id, item]))
  return equipmentIds
    .map((id) => byId.get(id))
    .filter((item): item is Equipment => !!item)
}

export function suggestEquipmentLoadout(
  equipmentIds: string[],
  catalog: Equipment[],
): EquipmentLoadout {
  const owned = ownedEquipmentItems(equipmentIds, catalog)
  return {
    armorId: owned.find(isArmorItem)?.id ?? null,
    shieldId: owned.find(isShieldItem)?.id ?? null,
    weaponId: owned.find(isWeaponItem)?.id ?? null,
  }
}

export function sanitizeEquipmentLoadout(
  loadout: EquipmentLoadout,
  equipmentIds: string[],
  catalog: Equipment[],
): EquipmentLoadout {
  const owned = new Set(equipmentIds)
  const byId = new Map(catalog.map((item) => [item.id, item]))

  const keep = (id: string | null, predicate: (item: Equipment) => boolean) => {
    if (!id || !owned.has(id)) return null
    const item = byId.get(id)
    return item && predicate(item) ? id : null
  }

  return {
    armorId: keep(loadout.armorId, isArmorItem),
    shieldId: keep(loadout.shieldId, isShieldItem),
    weaponId: keep(loadout.weaponId, isWeaponItem),
  }
}

export function computeLoadoutArmorClass(
  dexMod: number,
  loadout: EquipmentLoadout,
  catalog: Equipment[],
): number {
  const byId = new Map(catalog.map((item) => [item.id, item]))
  const armor = loadout.armorId ? byId.get(loadout.armorId) ?? null : null
  const shield = loadout.shieldId ? byId.get(loadout.shieldId) ?? null : null
  if (armor && !isArmorItem(armor)) return 10 + dexMod
  if (shield && !isShieldItem(shield)) {
    return calculateArmorClass(dexMod, armor, null)
  }
  return calculateArmorClass(dexMod, armor, shield)
}
