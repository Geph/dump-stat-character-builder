import { findEquipmentByName } from "@/lib/builder/equipment-utils"
import {
  normalizeEquipmentQuantities,
  ownedEquipmentQuantity,
  setOwnedEquipmentQuantity,
  type EquipmentQuantities,
} from "@/lib/character/equipment-quantities"
import type {
  CharacteristicModifier,
  GrantedEquipmentEntry,
  GrantedEquipmentSource,
} from "@/lib/compendium/characteristic-modifiers"
import { aggregateCharacteristics } from "@/lib/compendium/characteristic-modifiers"
import { slugify } from "@/lib/character/companion-stat-block"
import type { Equipment, Feature } from "@/lib/types"

/**
 * Grants are remembered by item name rather than by the granting modifier, so re-importing a
 * class (which regenerates modifier ids) does not hand the items out a second time. `grantedBy`
 * is a derived back-reference on the holding, not part of that honor key.
 */
function normalizeGrantedName(name: string): string {
  return name.trim().toLowerCase()
}

export type GrantedEquipmentHolding = {
  id: string
  name: string
  quantity: number
  grantedBy?: GrantedEquipmentSource
}

type GrantedByTaggedModifier = CharacteristicModifier & {
  _grantedBy?: GrantedEquipmentSource
}

/** Stable feature id for a grant when the Feature row has none. */
export function grantedEquipmentFeatureId(params: {
  ownerId: string
  featureName: string
  level: number
  featureId?: string | null
}): string {
  const existing = params.featureId?.trim()
  if (existing) return existing
  const owner = slugify(params.ownerId) || "source"
  const name = slugify(params.featureName) || "feature"
  return `feature:${owner}:${name}:${Number(params.level) || 0}`
}

export function stampGrantedEquipmentSource(
  mods: CharacteristicModifier[],
  featureId: string,
): CharacteristicModifier[] {
  const owner = featureId.trim()
  if (!owner) return mods
  return mods.map((mod) => {
    if (mod.type !== "grant_equipment") return mod
    const modifierId = mod.id?.trim()
    if (!modifierId) return mod
    return { ...mod, _grantedBy: { featureId: owner, modifierId } } satisfies GrantedByTaggedModifier
  })
}

export function readGrantedEquipmentSource(
  mod: CharacteristicModifier,
): GrantedEquipmentSource | undefined {
  const tagged = (mod as GrantedByTaggedModifier)._grantedBy
  const featureId = tagged?.featureId?.trim()
  const modifierId = tagged?.modifierId?.trim()
  if (!featureId || !modifierId) return undefined
  return { featureId, modifierId }
}

export function collectGrantedEquipmentFromFeatures(
  features: readonly { feature: Feature; ownerId: string }[],
): GrantedEquipmentEntry[] {
  const mods: CharacteristicModifier[] = []
  for (const { feature, ownerId } of features) {
    const featureId = grantedEquipmentFeatureId({
      ownerId,
      featureName: feature.name,
      level: feature.level,
      featureId: feature.id,
    })
    const chars = (feature.linkedModifiers ?? []).flatMap(
      (instance) => instance.characteristics ?? [],
    )
    mods.push(...stampGrantedEquipmentSource(chars, featureId))
  }
  return aggregateCharacteristics(mods).grantedEquipment
}

/**
 * Compact, comparable form of a grant list. The builder rebuilds its aggregated characteristics
 * on every render, so callers key lookups off this string instead of the array identity.
 * Name + quantity only — grantedBy is derived and must not change the honor / memo identity.
 */
export function grantedEquipmentSignature(
  grants: readonly GrantedEquipmentEntry[],
): string {
  return grants.map((entry) => `${entry.name}::${entry.quantity}`).join("|")
}

/** Resolve granted items to owned-item holdings, carrying grantedBy through from the grant list. */
export function resolveGrantedEquipmentHoldings(
  grants: readonly GrantedEquipmentEntry[],
  catalog: readonly Equipment[],
): {
  ids: string[]
  quantities: EquipmentQuantities
  names: string[]
  holdings: GrantedEquipmentHolding[]
} {
  const ids: string[] = []
  const names: string[] = []
  const holdings: GrantedEquipmentHolding[] = []
  const quantities: EquipmentQuantities = {}
  for (const grant of grants) {
    const item = findEquipmentByName(grant.name, catalog as Equipment[])
    if (!item || ids.includes(item.id)) continue
    ids.push(item.id)
    names.push(item.name)
    quantities[item.id] = grant.quantity
    holdings.push({
      id: item.id,
      name: item.name,
      quantity: grant.quantity,
      grantedBy: grant.grantedBy,
    })
  }
  return { ids, quantities: normalizeEquipmentQuantities(ids, quantities), names, holdings }
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
  /** Inventory rows for grants honored this pass, with feature/modifier back-references. */
  holdings: GrantedEquipmentHolding[]
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
  const holdings: GrantedEquipmentHolding[] = []
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
    if (target !== owned) {
      const next = setOwnedEquipmentQuantity(equipmentIds, quantities, item.id, target)
      equipmentIds = next.equipmentIds
      quantities = next.quantities
      if (!addedItems.some((entry) => entry.id === item.id)) addedItems.push(item)
    }

    if (!holdings.some((holding) => holding.id === item.id)) {
      holdings.push({
        id: item.id,
        name: item.name,
        quantity: target,
        grantedBy: grant.grantedBy,
      })
    }
  }

  if (!changed) return null
  return { equipmentIds, quantities, grantedNames, addedItems, unresolvedNames, holdings }
}
