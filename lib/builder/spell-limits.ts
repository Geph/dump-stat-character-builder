import type { DndClass } from "@/lib/types"

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

export function getSpellLimits(
  spellcasting: DndClass["spellcasting"],
  classLevel: number,
): SpellLimits {
  const progression = getSpellProgression(spellcasting)
  if (!progression.length) {
    return {
      cantrips: 99,
      prepared: 99,
      maxSpellLevel: Math.min(9, Math.ceil(classLevel / 2)),
    }
  }

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

type SpellRow = { id: string; level: number; classes?: string[] | null }

export function countSelectedSpells(
  spellIds: string[],
  spells: SpellRow[],
  className?: string,
): { cantrips: number; prepared: number } {
  const selected = spells.filter(
    (s) =>
      spellIds.includes(s.id) &&
      (className == null || s.classes?.includes(className)),
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
  if (className && !spell.classes?.includes(className)) return false
  const counts = countSelectedSpells(spellIds, spells, className)
  if (spell.level === 0) return counts.cantrips < limits.cantrips
  if (spell.level > limits.maxSpellLevel) return false
  return counts.prepared < limits.prepared
}

export function mergeSpellPicks(spellPicksByClassId: Record<string, string[]>): string[] {
  return [...new Set(Object.values(spellPicksByClassId).flat())]
}
