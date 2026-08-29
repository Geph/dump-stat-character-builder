import { withMartyrHitPointSpellcasting } from "@/lib/character/hit-point-spend"
import { applyFeatureSheetDisplay } from "@/lib/compendium/feature-sheet-display"
import {
  enrichClassFeaturesWithPresets,
  enrichSubclassFeaturesWithPresets,
} from "@/lib/import/enrichment-presets/apply"
import type { Character, Feature } from "@/lib/types"

/** One class level row persisted on a character (builder + sheet). */
export type CharacterClassRow = {
  class_id: string
  level: number
  subclass_id?: string | null
  order: number
}

export type ClassLevelEntry = { classId: string; level: number }

export function classLevelsToRows(
  classLevels: ClassLevelEntry[],
  subclassByClassId: Record<string, string>,
  classAddOrder: string[],
): CharacterClassRow[] {
  const orderIndex = new Map(classAddOrder.map((id, index) => [id, index]))
  return classLevels
    .map((entry, fallbackOrder) => ({
      class_id: entry.classId,
      level: entry.level,
      subclass_id: subclassByClassId[entry.classId] ?? null,
      order: orderIndex.get(entry.classId) ?? fallbackOrder,
    }))
    .sort((a, row) => a.order - row.order)
}

export function rowsToClassLevels(rows: CharacterClassRow[]): ClassLevelEntry[] {
  return [...rows]
    .sort((a, b) => a.order - b.order)
    .map((row) => ({ classId: row.class_id, level: row.level }))
}

export function rowsToSubclassMap(rows: CharacterClassRow[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const row of rows) {
    if (row.subclass_id) map[row.class_id] = row.subclass_id
  }
  return map
}

export function rowsToClassAddOrder(rows: CharacterClassRow[]): string[] {
  return [...rows].sort((a, b) => a.order - b.order).map((row) => row.class_id)
}

export function resolvePrimaryClassIdFromRows(
  rows: CharacterClassRow[],
  fallback: string | null | undefined,
): string | null {
  if (fallback) return fallback
  const sorted = [...rows].sort((a, b) => a.order - b.order)
  return sorted[0]?.class_id ?? null
}

/** Build rows from legacy single-class columns when `character_classes` is absent. */
export function legacyCharacterToClassRows(character: Character): CharacterClassRow[] {
  if (!character.class_id) return []
  return [
    {
      class_id: character.class_id,
      level: character.level,
      subclass_id: character.subclass_id,
      order: 0,
    },
  ]
}

export function normalizeCharacterClassRows(
  character: Character & { character_classes?: CharacterClassRow[] | null },
): CharacterClassRow[] {
  const rows = character.character_classes
  if (Array.isArray(rows) && rows.length > 0) {
    return rows.map((row, index) => ({
      class_id: row.class_id,
      level: row.level,
      subclass_id: row.subclass_id ?? null,
      order: row.order ?? index,
    }))
  }
  return legacyCharacterToClassRows(character)
}

export type CharacterClassDetail = {
  row: CharacterClassRow
  class?: import("@/lib/types").DndClass
  subclass?: import("@/lib/types").Subclass | null
}

/** Re-apply class-feature presets so sheet cards pick up wiring added after import. */
export function enrichAttachedClassFeatures(
  cls: import("@/lib/types").DndClass,
): import("@/lib/types").DndClass {
  const withHpCasting = withMartyrHitPointSpellcasting(cls)
  return {
    ...withHpCasting,
    features: enrichClassFeaturesWithPresets(
      (withHpCasting.features ?? []) as Feature[],
      withHpCasting.name,
      withHpCasting.spellcasting,
    ).map(applyFeatureSheetDisplay),
  }
}

export function refreshClassDetailWiring(
  details: CharacterClassDetail[],
): CharacterClassDetail[] {
  return details.map((entry) => {
    const cls = entry.class ? enrichAttachedClassFeatures(entry.class) : undefined
    const subclass =
      entry.subclass && cls
        ? {
            ...entry.subclass,
            features: enrichSubclassFeaturesWithPresets(
              (entry.subclass.features ?? []) as Feature[],
              cls.name,
              entry.subclass.name,
            ).map(applyFeatureSheetDisplay),
          }
        : entry.subclass
    return { ...entry, class: cls, subclass }
  })
}

export function attachClassDetails(
  rows: CharacterClassRow[],
  classes: import("@/lib/types").DndClass[],
  subclasses: import("@/lib/types").Subclass[],
): CharacterClassDetail[] {
  return [...rows]
    .sort((a, b) => a.order - b.order)
    .map((row) => {
      const rawClass = classes.find((entry) => entry.id === row.class_id)
      const cls = rawClass ? enrichAttachedClassFeatures(rawClass) : undefined
      const rawSubclass = row.subclass_id
        ? subclasses.find((sub) => sub.id === row.subclass_id) ?? null
        : null
      const subclass =
        rawSubclass && cls
          ? {
              ...rawSubclass,
              features: enrichSubclassFeaturesWithPresets(
                (rawSubclass.features ?? []) as Feature[],
                cls.name,
                rawSubclass.name,
              ).map(applyFeatureSheetDisplay),
            }
          : rawSubclass
      return { row, class: cls, subclass }
    })
}
