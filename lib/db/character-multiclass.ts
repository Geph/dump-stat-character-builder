import {
  attachClassDetails,
  normalizeCharacterClassRows,
  type CharacterClassDetail,
  type CharacterClassRow,
} from "@/lib/character/character-classes"
import { attachClassResourcesToClass } from "@/lib/compendium/resolve-class-resources"
import { loadCharacterClassRows, replaceCharacterClassRows } from "@/lib/db/character-class-rows"
import { getDb, schema } from "./index"
import { serializeRow } from "./serialize"
import { eq, inArray } from "drizzle-orm"

export type { CharacterClassRow, CharacterClassDetail }

export async function syncCharacterClassRows(
  characterId: string,
  rows: CharacterClassRow[] | null | undefined,
): Promise<CharacterClassRow[]> {
  const normalized = (rows ?? []).map((row, index) => ({
    class_id: row.class_id,
    level: row.level,
    subclass_id: row.subclass_id ?? null,
    order: row.order ?? index,
  }))

  const db = getDb()
  const sanitized: typeof normalized = []
  for (const row of normalized) {
    const [cls] = await db
      .select({ id: schema.classes.id })
      .from(schema.classes)
      .where(eq(schema.classes.id, row.class_id))
      .limit(1)
    if (!cls) continue

    let subclassId = row.subclass_id
    if (subclassId) {
      const [sub] = await db
        .select({ id: schema.subclasses.id })
        .from(schema.subclasses)
        .where(eq(schema.subclasses.id, subclassId))
        .limit(1)
      if (!sub) subclassId = null
    }

    sanitized.push({ ...row, subclass_id: subclassId })
  }

  await replaceCharacterClassRows(characterId, sanitized)
  return sanitized
}

export async function attachMulticlassRelations(
  character: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const db = getDb()
  const out = { ...character }

  let classRows = character.character_classes as CharacterClassRow[] | null | undefined
  if (!Array.isArray(classRows) || !classRows.length) {
    classRows = await loadCharacterClassRows(character.id as string)
    if (classRows.length) out.character_classes = classRows
  }
  if (!classRows?.length) {
    classRows = normalizeCharacterClassRows(character as never)
    if (classRows.length) out.character_classes = classRows
  }

  if (!classRows.length) return out

  const classIds = [...new Set(classRows.map((row) => row.class_id))]
  const subclassIds = [
    ...new Set(classRows.map((row) => row.subclass_id).filter(Boolean) as string[]),
  ]

  const allClasses = []
  for (const classId of classIds) {
    const [cls] = await db
      .select()
      .from(schema.classes)
      .where(eq(schema.classes.id, classId))
      .limit(1)
    if (cls) allClasses.push(serializeRow(cls as unknown as Record<string, unknown>))
  }

  const allSubclasses = []
  for (const subclassId of subclassIds) {
    const [sub] = await db
      .select()
      .from(schema.subclasses)
      .where(eq(schema.subclasses.id, subclassId))
      .limit(1)
    if (sub) allSubclasses.push(serializeRow(sub as unknown as Record<string, unknown>))
  }

  const resourceRows =
    classIds.length > 0
      ? (
          await db
            .select()
            .from(schema.classResources)
            .where(inArray(schema.classResources.class_id, classIds))
        ).map((row) => serializeRow(row as unknown as Record<string, unknown>))
      : []

  const classesWithResources = allClasses.map((cls) =>
    attachClassResourcesToClass(cls as never, resourceRows as never),
  )

  const classList = attachClassDetails(
    classRows,
    classesWithResources as never,
    allSubclasses as never,
  )
  out.class_list = classList

  const primaryId = (character.class_id as string | null) ?? classRows[0]?.class_id
  if (primaryId) {
    out.classes = classesWithResources.find((cls) => cls.id === primaryId) ?? out.classes
    const primaryRow = classRows.find((row) => row.class_id === primaryId)
    if (primaryRow?.subclass_id) {
      out.subclasses =
        allSubclasses.find((sub) => sub.id === primaryRow.subclass_id) ?? out.subclasses
    }
  }

  return out
}
