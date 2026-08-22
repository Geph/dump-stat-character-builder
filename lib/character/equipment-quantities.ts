/** Per-owned-item counts. Missing keys default to 1 when the id is owned. */

export type EquipmentQuantities = Record<string, number>

export const EQUIPMENT_QUANTITY_MAX = 99

export function sanitizeEquipmentQuantity(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0
  return Math.max(0, Math.min(EQUIPMENT_QUANTITY_MAX, Math.floor(value)))
}

export function ownedEquipmentQuantity(
  equipmentIds: string[],
  quantities: EquipmentQuantities | null | undefined,
  id: string,
): number {
  if (!equipmentIds.includes(id)) return 0
  const raw = quantities?.[id]
  const qty = sanitizeEquipmentQuantity(raw)
  if (raw == null) return 1
  return qty > 0 ? qty : 1
}

/** Persist only counts other than the default of 1. */
export function normalizeEquipmentQuantities(
  equipmentIds: string[],
  quantities: EquipmentQuantities | null | undefined,
): EquipmentQuantities {
  const next: EquipmentQuantities = {}
  for (const id of equipmentIds) {
    const qty = ownedEquipmentQuantity(equipmentIds, quantities, id)
    if (qty !== 1) next[id] = qty
  }
  return next
}

export function setOwnedEquipmentQuantity(
  equipmentIds: string[],
  quantities: EquipmentQuantities | null | undefined,
  id: string,
  quantity: number,
): { equipmentIds: string[]; quantities: EquipmentQuantities } {
  const qty = sanitizeEquipmentQuantity(quantity)
  const ids = equipmentIds.filter((existing) => existing !== id)
  if (qty > 0) {
    const insertAt = equipmentIds.indexOf(id)
    if (insertAt >= 0) ids.splice(insertAt, 0, id)
    else ids.push(id)
  }
  return {
    equipmentIds: ids,
    quantities: normalizeEquipmentQuantities(ids, { ...quantities, [id]: qty }),
  }
}

export function addOwnedEquipmentQuantity(
  equipmentIds: string[],
  quantities: EquipmentQuantities | null | undefined,
  id: string,
  delta: number,
): { equipmentIds: string[]; quantities: EquipmentQuantities } {
  const current = ownedEquipmentQuantity(equipmentIds, quantities, id)
  return setOwnedEquipmentQuantity(equipmentIds, quantities, id, current + delta)
}

export function holdingsFromRepeatedIds(ids: string[]): {
  ids: string[]
  quantities: EquipmentQuantities
} {
  const unique: string[] = []
  const quantities: EquipmentQuantities = {}
  for (const id of ids) {
    if (!id) continue
    if (!unique.includes(id)) unique.push(id)
    quantities[id] = (quantities[id] ?? 0) + 1
  }
  return { ids: unique, quantities: normalizeEquipmentQuantities(unique, quantities) }
}

export function mergeEquipmentHoldings(
  ...groups: { ids: string[]; quantities?: EquipmentQuantities | null }[]
): { ids: string[]; quantities: EquipmentQuantities } {
  const ids: string[] = []
  const quantities: EquipmentQuantities = {}
  for (const group of groups) {
    for (const id of group.ids) {
      if (!id) continue
      const add = ownedEquipmentQuantity(group.ids, group.quantities, id)
      if (!ids.includes(id)) ids.push(id)
      quantities[id] = (quantities[id] ?? 0) + add
    }
  }
  return { ids, quantities: normalizeEquipmentQuantities(ids, quantities) }
}

export function canDualWieldSameWeapon(quantity: number): boolean {
  return quantity >= 2
}
