import type { DndClass } from "@/lib/types"
import { spellMatchesClassName } from "@/lib/compendium/investigator-spell-list"
import { getSpellSlotTable } from "@/lib/compendium/spell-slots"

export type SpellProgressionEntry = {
  level: number
  cantrips: number
  prepared: number
  max_spell_level: number
}

export type SpellLimits = {
  cantrips: number
  prepared: number
  maxSpellLevel: number
}

export function getSpellProgression(spellcasting: DndClass["spellcasting"]): SpellProgressionEntry[] {
  if (!spellcasting?.progression?.length) return []
  return spellcasting.progression
}

/** Default cantrips known for a full caster lacking an authored progression table. */
function defaultCantripsKnown(classLevel: number): number {
  if (classLevel >= 10) return 5
  if (classLevel >= 4) return 4
  return 3
}

export function getSpellLimits(
  spellcasting: DndClass["spellcasting"],
  classLevel: number,
  className?: string,
): SpellLimits {
  const progression = getSpellProgression(spellcasting)
  if (progression.length) {
    const entry =
      progression.find((p) => p.level === classLevel) ??
      [...progression].filter((p) => p.level <= classLevel).sort((a, b) => b.level - a.level)[0]

    if (!entry) {
      return { cantrips: 0, prepared: 0, maxSpellLevel: 0 }
    }

    return {
      cantrips: entry.cantrips,
      prepared: entry.prepared,
      maxSpellLevel: entry.max_spell_level,
    }
  }

  // No authored progression table: derive bounded limits from the canonical SRD
  // spell-slot tables rather than allowing unlimited (99) picks. An authored
  // progression on the class is always preferred and overrides this fallback.
  const slotTable = className ? getSpellSlotTable(className, classLevel, spellcasting) : null
  const maxSpellLevel = slotTable
    ? slotTable.slotsByLevel.reduce((max, count, idx) => (count > 0 ? idx + 1 : max), 0)
    : Math.min(9, Math.ceil(classLevel / 2))
  const totalSlots = slotTable ? slotTable.slotsByLevel.reduce((sum, count) => sum + count, 0) : 0
  const authoredCantrips =
    spellcasting?.cantrips ??
    progression.find((entry) => entry.level <= classLevel && entry.cantrips > 0)?.cantrips
  const mayAssumeCantrips = Boolean(spellcasting?.caster_progression) || Boolean(spellcasting?.point_pool)

  return {
    // Ability-only ritualists (Investigator) have no cantrips. Do not treat an inferred
    // full-caster slot table as permission to invent the default 3.
    cantrips: authoredCantrips ?? (mayAssumeCantrips ? defaultCantripsKnown(classLevel) : 0),
    // Do not invent a fake "1 prepared" budget when there are no slots and no authored known count
    // (Warmage / Investigator ability tags without a spell-slot model).
    prepared: spellcasting?.spells_known ?? totalSlots,
    maxSpellLevel: totalSlots > 0 || spellcasting?.spells_known != null ? maxSpellLevel : 0,
  }
}

type SpellRow = { id: string; name?: string; level: number; classes?: string[] | null }

export function countSelectedSpells(
  spellIds: string[],
  spells: SpellRow[],
  className?: string,
): { cantrips: number; prepared: number } {
  const selected = spells.filter(
    (s) =>
      spellIds.includes(s.id) &&
      (className == null || spellMatchesClassName({ name: s.name ?? "", classes: s.classes }, className)),
  )
  return {
    cantrips: selected.filter((s) => s.level === 0).length,
    prepared: selected.filter((s) => s.level >= 1).length,
  }
}

export function canSelectSpell(
  spell: SpellRow,
  spellIds: string[],
  spells: SpellRow[],
  limits: SpellLimits,
  className?: string,
): boolean {
  if (spellIds.includes(spell.id)) return true
  if (
    className &&
    !spellMatchesClassName({ name: spell.name ?? "", classes: spell.classes }, className)
  ) {
    return false
  }
  const counts = countSelectedSpells(spellIds, spells, className)
  if (spell.level === 0) return counts.cantrips < limits.cantrips
  if (spell.level > limits.maxSpellLevel) return false
  return counts.prepared < limits.prepared
}

export function mergeSpellPicks(spellPicksByClassId: Record<string, string[]>): string[] {
  return [...new Set(Object.values(spellPicksByClassId).flat())]
}
