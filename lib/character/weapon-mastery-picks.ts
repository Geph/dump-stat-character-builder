import type { Feature } from "@/lib/types"

export const WEAPON_MASTERY_EXTRA_PREFIX = "weapon_mastery_extra:"
export const WEAPON_MASTERY_EXTRA_RESOURCE_KEY = "weapon_mastery_extra"

export function extraWeaponMasteryPickKey(equipmentId: string): string {
  return `${WEAPON_MASTERY_EXTRA_PREFIX}${equipmentId}`
}

export function isExtraWeaponMasteryPickKey(key: string): boolean {
  return key.startsWith(WEAPON_MASTERY_EXTRA_PREFIX)
}

export function extraMasteriesForWeapon(
  picks: Record<string, string[]> | null | undefined,
  equipmentId: string,
): string[] {
  const values = picks?.[extraWeaponMasteryPickKey(equipmentId)]
  return Array.isArray(values) ? values.filter((name) => typeof name === "string" && name.trim()) : []
}

export function setExtraMasteriesForWeapon(
  picks: Record<string, string[]>,
  equipmentId: string,
  names: string[],
): Record<string, string[]> {
  const next = { ...picks }
  const cleaned = names.filter((name) => name.trim())
  const key = extraWeaponMasteryPickKey(equipmentId)
  if (cleaned.length) next[key] = cleaned
  else delete next[key]
  return next
}

export function normalizeWeaponMasteryPicks(
  picks: Record<string, string[]> | null | undefined,
): Record<string, string[]> {
  if (!picks) return {}
  const next: Record<string, string[]> = {}
  for (const [key, values] of Object.entries(picks)) {
    if (!isExtraWeaponMasteryPickKey(key) || !Array.isArray(values)) continue
    const cleaned = values.filter((name): name is string => typeof name === "string" && Boolean(name.trim()))
    if (cleaned.length) next[key] = cleaned
  }
  return next
}

function featureExtraSlots(feature: {
  name?: string
  description?: string | null
  choices?: { resourceKey?: string | null; count?: number | null } | null
}): number {
  const resourceCount =
    feature.choices?.resourceKey === WEAPON_MASTERY_EXTRA_RESOURCE_KEY
      ? Math.max(0, feature.choices.count ?? 0)
      : 0
  const name = feature.name ?? ""
  const description = feature.description ?? ""
  let fromText = 0
  if (/improved masterwork|improved enchantment|third mastery property/i.test(`${name} ${description}`)) {
    fromText = 2
  } else if (/masterwork weapons|second mastery property|two masterwork properties/i.test(`${name} ${description}`)) {
    fromText = 1
  }
  return Math.max(resourceCount, fromText)
}

/** Extra mastery-property slots granted per Masterwork weapon (native mastery is separate). */
export function extraWeaponMasterySlotCount(
  features: Array<{
    name?: string
    description?: string | null
    choices?: { resourceKey?: string | null; count?: number | null } | null
  }>,
): number {
  return features.reduce((max, feature) => Math.max(max, featureExtraSlots(feature)), 0)
}

export function extraWeaponMasterySlotCountFromClassFeatures(
  classDetails: Array<{
    row: { level: number }
    class?: { features?: Feature[] | null } | null
    subclass?: { features?: Feature[] | null } | null
  }>,
): number {
  const features: Feature[] = []
  for (const entry of classDetails) {
    for (const feature of entry.class?.features ?? []) {
      if ((feature.level ?? 1) <= entry.row.level) features.push(feature)
    }
    for (const feature of entry.subclass?.features ?? []) {
      if ((feature.level ?? 1) <= entry.row.level) features.push(feature)
    }
  }
  return extraWeaponMasterySlotCount(features)
}
