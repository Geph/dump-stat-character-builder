import { getClassSkillPickRequirement, isPrimaryClassEntry } from "@/lib/builder/multiclass-proficiencies"
import { resolvePrimaryClassId } from "@/lib/builder/primary-class"
import { rowsToClassAddOrder, rowsToClassLevels, normalizeCharacterClassRows } from "@/lib/character/character-classes"
import type { Background, Character, DndClass, Spell } from "@/lib/types"

/** Partition merged skill proficiencies back into per-class picks for legacy saves. */
export function inferClassSkillPicks(
  character: Character,
  classes: DndClass[],
  background: Background | null | undefined,
): Record<string, string[]> {
  const classRows = normalizeCharacterClassRows(character)
  if (!classRows.length) return {}

  const classLevels = rowsToClassLevels(classRows)
  const primaryClassId = resolvePrimaryClassId(
    character.class_id,
    character.class_add_order ?? rowsToClassAddOrder(classRows),
    classLevels,
  )
  const addOrder =
    character.class_add_order?.length
      ? character.class_add_order
      : rowsToClassAddOrder(classRows)

  const bgSkills = new Set(background?.skill_proficiencies ?? [])
  const remaining = new Set(
    (character.skill_proficiencies ?? []).filter((skill) => !bgSkills.has(skill)),
  )
  const picks: Record<string, string[]> = {}

  for (const classId of addOrder) {
    const entry = classLevels.find((row) => row.classId === classId)
    const cls = classes.find((candidate) => candidate.id === classId)
    if (!entry || !cls) continue

    const req = getClassSkillPickRequirement(
      cls,
      isPrimaryClassEntry(classId, primaryClassId),
    )
    if (!req || req.count <= 0) continue

    const options = new Set(req.options)
    const classPicks: string[] = []
    for (const skill of [...remaining]) {
      if (classPicks.length >= req.count) break
      if (!options.has(skill)) continue
      classPicks.push(skill)
      remaining.delete(skill)
    }
    if (classPicks.length) picks[classId] = classPicks
  }

  return picks
}

/** Assign saved spell ids to caster classes when per-class buckets were not persisted. */
export function inferSpellPicksByClassId(
  character: Character,
  classes: DndClass[],
  spells: Spell[],
): Record<string, string[]> {
  const spellIds = character.spell_ids ?? []
  if (!spellIds.length) return {}

  const classRows = normalizeCharacterClassRows(character)
  const classLevels = classRows.length
    ? rowsToClassLevels(classRows)
    : character.class_id
      ? [{ classId: character.class_id, level: character.level }]
      : []

  const spellById = new Map(spells.map((spell) => [spell.id, spell]))
  const buckets: Record<string, string[]> = {}
  const unassigned: string[] = []

  for (const spellId of spellIds) {
    const spell = spellById.get(spellId)
    const spellClasses = (spell?.classes ?? []).map((name) => name.toLowerCase())
    const matchingClassIds = classLevels
      .map((entry) => classes.find((cls) => cls.id === entry.classId))
      .filter((cls): cls is DndClass => Boolean(cls))
      .filter((cls) => spellClasses.includes(cls.name.toLowerCase()))
      .map((cls) => cls.id)

    if (matchingClassIds.length === 1) {
      const classId = matchingClassIds[0]
      if (!buckets[classId]) buckets[classId] = []
      buckets[classId].push(spellId)
    } else if (matchingClassIds.length > 1) {
      const primary = character.class_id
      const target = matchingClassIds.includes(primary ?? "")
        ? primary!
        : matchingClassIds[0]
      if (!buckets[target]) buckets[target] = []
      buckets[target].push(spellId)
    } else if (character.class_id) {
      if (!buckets[character.class_id]) buckets[character.class_id] = []
      buckets[character.class_id].push(spellId)
    } else {
      unassigned.push(spellId)
    }
  }

  if (unassigned.length && character.class_id) {
    buckets[character.class_id] = [...(buckets[character.class_id] ?? []), ...unassigned]
  }

  return buckets
}
