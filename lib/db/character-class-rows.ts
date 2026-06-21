import { randomUUID } from "crypto"
import { eq } from "drizzle-orm"
import type { CharacterClassRow } from "@/lib/character/character-classes"
import { getDb, schema } from "./index"

export async function loadCharacterClassRows(characterId: string): Promise<CharacterClassRow[]> {
  const db = getDb()
  const rows = await db
    .select()
    .from(schema.characterClasses)
    .where(eq(schema.characterClasses.character_id, characterId))

  if (!rows.length) return []

  return rows
    .map((row) => ({
      class_id: row.class_id,
      level: row.level,
      subclass_id: row.subclass_id,
      order: row.sort_order,
    }))
    .sort((a, b) => a.order - b.order)
}

export async function replaceCharacterClassRows(
  characterId: string,
  classRows: CharacterClassRow[],
): Promise<void> {
  const db = getDb()
  await db.delete(schema.characterClasses).where(eq(schema.characterClasses.character_id, characterId))

  if (!classRows.length) return

  await db.insert(schema.characterClasses).values(
    classRows.map((row) => ({
      id: randomUUID(),
      character_id: characterId,
      class_id: row.class_id,
      level: row.level,
      subclass_id: row.subclass_id ?? null,
      sort_order: row.order,
    })),
  )
}
