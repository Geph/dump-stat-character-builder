/** Reserved spend key: deduct current HP (not a class resource pool). */
export const HIT_POINTS_RESOURCE_KEY = "hit_points"

/** Mage Hand Press Martyr — Hit Point Spellcasting table (Radiant; bypasses temp HP). */
export const MARTYR_HIT_POINT_SPELLCASTING_COSTS: Record<number, number> = {
  1: 5,
  2: 10,
  3: 20,
  4: 30,
  5: 45,
}

export function isHitPointsResourceKey(key: string | null | undefined): boolean {
  if (!key) return false
  const normalized = key.trim().toLowerCase().replace(/[\s-]+/g, "_")
  return normalized === HIT_POINTS_RESOURCE_KEY || normalized === "current_hp"
}

/**
 * Apply Martyr-style self-damage: subtract from current HP and ignore Temporary Hit Points.
 * Floor at 0 — the sheet does not model dying from this spend separately.
 */
export function applyHitPointSpend(currentHp: number, amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return currentHp
  return Math.max(0, currentHp - Math.floor(amount))
}

export function applyHitPointRefund(currentHp: number, amount: number, maxHp: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return currentHp
  const cap = Number.isFinite(maxHp) && maxHp > 0 ? maxHp : currentHp + amount
  return Math.min(cap, currentHp + Math.floor(amount))
}

export function hitPointCostForSpellLevel(
  costByLevel: Record<number, number> | Record<string, number> | null | undefined,
  spellLevel: number,
): number {
  if (!costByLevel || spellLevel <= 0) return 0
  const table = costByLevel as Record<string | number, number>
  const raw = table[spellLevel] ?? table[String(spellLevel)]
  return typeof raw === "number" && raw > 0 ? raw : 0
}

export function withMartyrHitPointSpellcasting<
  T extends { name?: string | null; spellcasting?: import("@/lib/types").ClassSpellcastingConfig | null },
>(cls: T): T {
  if (!/martyr/i.test(cls.name ?? "")) return cls
  const existing = cls.spellcasting
  if (existing?.hit_point_cost_by_level && Object.keys(existing.hit_point_cost_by_level).length) {
    return cls
  }
  return {
    ...cls,
    spellcasting: {
      ability: existing?.ability ?? "Wisdom",
      ...existing,
      hit_point_cost_by_level: { ...MARTYR_HIT_POINT_SPELLCASTING_COSTS },
    },
  }
}
