import { findEquipmentByName } from "@/lib/builder/equipment-utils"
import {
  normalizeEquipmentQuantities,
  ownedEquipmentQuantity,
  setOwnedEquipmentQuantity,
  type EquipmentQuantities,
} from "@/lib/character/equipment-quantities"
import type { GrantedEquipmentEntry } from "@/lib/compendium/characteristic-modifiers"
import type { Equipment } from "@/lib/types"

/**
 * Grants are remembered by item name rather than by the granting modifier, so re-importing a
 * class (which regenerates modifier ids) does not hand the items out a second time.
 */
function normalizeGrantedName(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * Compact, comparable form of a grant list. The builder rebuilds its aggregated characteristics
 * on every render, so callers key lookups off this string instead of the array identity.
 */
export function grantedEquipmentSignature(
  grants: readonly GrantedEquipmentEntry[],
): string {
  return grants.map((entry) => `${entry.name}::${entry.quantity}`).join("|")
}

function parseGrantedEquipmentSignature(signature: string): GrantedEquipmentEntry[] {
  if (!signature) return []
  return signature.split("|").flatMap((chunk) => {
    const [name, quantity] = chunk.split("::")
    if (!name) return []
    return [{ name, quantity: Math.max(1, Number(quantity) || 1) }]
  })
}

/** Resolve a grant signature to owned-item holdings for the builder's starting inventory merge. */
export function resolveGrantedEquipmentHoldings(
  signature: string,
  catalog: readonly Equipment[],
): { ids: string[]; quantities: EquipmentQuantities; names: string[] } {
  const ids: string[] = []
  const names: string[] = []
  const quantities: EquipmentQuantities = {}
  for (const grant of parseGrantedEquipmentSignature(signature)) {
    const item = findEquipmentByName(grant.name, catalog as Equipment[])
    if (!item || ids.includes(item.id)) continue
    ids.push(item.id)
    names.push(item.name)
    quantities[item.id] = grant.quantity
  }
  return { ids, quantities: normalizeEquipmentQuantities(ids, quantities), names }
}

export type EquipmentGrantPlan = {
  equipmentIds: string[]
  quantities: EquipmentQuantities
  /** Next value for `characters.granted_equipment_names`. */
  grantedNames: string[]
  /** Catalog rows to hydrate into local sheet state. */
  addedItems: Equipment[]
  /** Named items missing from the compendium, so callers can surface or log the gap. */
  unresolvedNames: string[]
}

/**
 * Work out the inventory changes for feature-granted equipment. Returns null when every grant
 * has already been honored, letting callers skip the write entirely.
 */
export function planEquipmentGrants(params: {
  grants: readonly GrantedEquipmentEntry[]
  catalog: readonly Equipment[]
  equipmentIds: readonly string[]
  quantities: EquipmentQuantities | null | undefined
  alreadyGrantedNames: readonly string[] | null | undefined
}): EquipmentGrantPlan | null {
  if (!params.grants.length) return null

  const grantedNames = [...(params.alreadyGrantedNames ?? [])]
  const honored = new Set(grantedNames.map(normalizeGrantedName))
  const addedItems: Equipment[] = []
  const unresolvedNames: string[] = []
  let equipmentIds = [...params.equipmentIds]
  let quantities: EquipmentQuantities = { ...(params.quantities ?? {}) }
  let changed = false

  for (const grant of params.grants) {
    if (honored.has(normalizeGrantedName(grant.name))) continue

    const item = findEquipmentByName(grant.name, params.catalog as Equipment[])
    if (!item) {
      unresolvedNames.push(grant.name)
      continue
    }

    // Honored even when the player already owns a copy, so a stack is never topped up twice.
    honored.add(normalizeGrantedName(grant.name))
    grantedNames.push(item.name)
    changed = true

    const owned = ownedEquipmentQuantity(equipmentIds, quantities, item.id)
    const target = Math.max(owned, Math.max(1, grant.quantity))
    if (target === owned) continue

    const next = setOwnedEquipmentQuantity(equipmentIds, quantities, item.id, target)
    equipmentIds = next.equipmentIds
    quantities = next.quantities
    if (!addedItems.some((entry) => entry.id === item.id)) addedItems.push(item)
  }

  if (!changed) return null
  return { equipmentIds, quantities, grantedNames, addedItems, unresolvedNames }
}
