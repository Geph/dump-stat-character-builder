import type { BonusByLevelEntry } from "@/lib/compendium/bonus-by-level"
import { normalizeBonusByLevel } from "@/lib/compendium/bonus-by-level"
import { resolveTierCountAtLevel } from "@/lib/compendium/resolve-uses-config"
import type {
  BonusDamageRiderEntry,
  BonusDamageRidersCharacteristic,
} from "@/lib/compendium/characteristic-modifiers"

export type RiderCountByLevel = { level: number; count: number }

function normalizeRiderCountByLevel(
  rows: RiderCountByLevel[] | null | undefined,
): RiderCountByLevel[] {
  if (!Array.isArray(rows)) return []
  return rows
    .map((row) => ({
      level: typeof row.level === "number" ? row.level : 1,
      count: typeof row.count === "number" ? row.count : 1,
    }))
    .sort((a, b) => a.level - b.level)
}

export function resolveMaxRidersPerUseAtLevel(
  mod: Pick<BonusDamageRidersCharacteristic, "maxRidersPerUse" | "maxRidersPerUseByLevel">,
  characterLevel: number,
): number {
  const tierCount = resolveTierCountAtLevel(mod.maxRidersPerUseByLevel, characterLevel)
  if (tierCount > 0) return tierCount
  return mod.maxRidersPerUse ?? 1
}

export function resolveUnlockedRidersAtLevel(
  riders: BonusDamageRiderEntry[] | null | undefined,
  characterLevel: number,
): BonusDamageRiderEntry[] {
  const byName = new Map<string, BonusDamageRiderEntry>()
  for (const rider of riders ?? []) {
    const unlockLevel = rider.unlocksAtLevel ?? 1
    if (characterLevel < unlockLevel) continue
    const key = rider.name.trim().toLowerCase()
    if (!key) continue
    byName.set(key, rider)
  }
  return [...byName.values()]
}

export function resolveAutomaticBonusByLevelAtLevel(
  rows: BonusByLevelEntry[] | null | undefined,
  characterLevel: number,
): BonusByLevelEntry | null {
  const normalized = normalizeBonusByLevel(rows)
  if (!normalized.length) return null
  const sorted = [...normalized].sort((a, b) => a.level - b.level)
  let current: BonusByLevelEntry | null = null
  for (const row of sorted) {
    if (row.level > characterLevel) break
    current = row
  }
  return current
}

export function resolveBonusDamageRidersAtLevel(
  mod: BonusDamageRidersCharacteristic,
  characterLevel: number,
): BonusDamageRidersCharacteristic {
  return {
    ...mod,
    riders: resolveUnlockedRidersAtLevel(mod.riders, characterLevel),
    maxRidersPerUse: resolveMaxRidersPerUseAtLevel(mod, characterLevel),
    maxRidersPerUseByLevel: normalizeRiderCountByLevel(mod.maxRidersPerUseByLevel),
    automaticBonusByLevel: mod.automaticBonusByLevel ?? [],
  }
}

export function mergeBonusDamageRiders(
  left: BonusDamageRidersCharacteristic,
  right: BonusDamageRidersCharacteristic,
): BonusDamageRidersCharacteristic {
  const ridersByName = new Map<string, BonusDamageRiderEntry>()
  for (const rider of [...(left.riders ?? []), ...(right.riders ?? [])]) {
    const key = rider.name.trim().toLowerCase()
    if (!key) continue
    const existing = ridersByName.get(key)
    if (!existing || (rider.unlocksAtLevel ?? 1) >= (existing.unlocksAtLevel ?? 1)) {
      ridersByName.set(key, rider)
    }
  }

  return {
    ...left,
    ...right,
    riders: [...ridersByName.values()],
    maxRidersPerUse: Math.max(left.maxRidersPerUse ?? 1, right.maxRidersPerUse ?? 1),
    maxRidersPerUseByLevel: normalizeRiderCountByLevel([
      ...(left.maxRidersPerUseByLevel ?? []),
      ...(right.maxRidersPerUseByLevel ?? []),
    ]),
    automaticBonusByLevel: normalizeBonusByLevel([
      ...(left.automaticBonusByLevel ?? []),
      ...(right.automaticBonusByLevel ?? []),
    ]).sort((a, b) => a.level - b.level),
    automaticBonus: right.automaticBonus ?? left.automaticBonus ?? null,
    appliesTo: right.appliesTo ?? left.appliesTo ?? null,
  }
}
