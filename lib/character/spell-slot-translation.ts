import type { DndClass } from "@/lib/types"
import { getPointPoolSpellcasting } from "@/lib/character/point-pool-spellcasting"

/**
 * Hook for translating rules that reference "spell slots" to point-pool equivalents.
 * Full cross-content translation (magic items, multiclass, subclass text) is deferred;
 * callers should consult this before applying slot-based logic for point-pool casters.
 */
export function shouldTranslateSpellSlotsToPointPool(
  spellcasting: DndClass["spellcasting"] | null | undefined,
): boolean {
  return getPointPoolSpellcasting(spellcasting) != null
}

export function pointPoolTranslationHint(
  spellcasting: DndClass["spellcasting"] | null | undefined,
): string | null {
  const pool = getPointPoolSpellcasting(spellcasting)
  if (!pool) return null
  return `This class uses ${pool.resource_key.replace(/_/g, " ")} and Spell Limit instead of spell slots.`
}
