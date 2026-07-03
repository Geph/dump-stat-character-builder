import type { DndClass } from "@/lib/types"

export type PointPoolSpellcasting = NonNullable<
  NonNullable<DndClass["spellcasting"]>["point_pool"]
>

export function getPointPoolSpellcasting(
  spellcasting: DndClass["spellcasting"] | null | undefined,
): PointPoolSpellcasting | null {
  const pool = spellcasting?.point_pool
  if (!pool?.resource_key || !pool.replaces_spell_slots) return null
  return pool
}

export function usesPointPoolSpellcasting(
  spellcasting: DndClass["spellcasting"] | null | undefined,
): boolean {
  return getPointPoolSpellcasting(spellcasting) != null
}

/** Base Sorcery Points cost for casting a spell of this level from the point pool table. */
export function pointCostForSpellLevel(
  pool: PointPoolSpellcasting,
  spellLevel: number,
): number {
  if (spellLevel <= 0) return pool.cost_by_level[0] ?? 0
  return pool.cost_by_level[spellLevel] ?? pool.cost_by_level[String(spellLevel) as unknown as number] ?? 0
}

/** Default Alternate Sorcerer level → Sorcery Points cost table. */
export const DEFAULT_ALTERNATE_SORCERER_COST_BY_LEVEL: Record<number, number> = {
  0: 0,
  1: 2,
  2: 3,
  3: 5,
  4: 6,
  5: 7,
}
