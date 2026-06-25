import type { Equipment } from "@/lib/types"
import {
  isArmorItem,
  isShieldItem,
  isWeaponItem,
} from "@/lib/compendium/combat-stats"
import { isMagicItem } from "@/lib/compendium/equipment-attunement"

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
  const firstMundane = (predicate: (item: Equipment) => boolean) =>
    owned.find((item) => predicate(item) && !isMagicItem(item))?.id ?? null
  return {
    armorId: firstMundane(isArmorItem),
    shieldId: firstMundane(isShieldItem),
    weaponId: firstMundane(isWeaponItem),
  }
}
