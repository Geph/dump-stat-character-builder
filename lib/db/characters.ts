import { randomUUID } from "crypto"
import { desc, eq } from "drizzle-orm"
import { getDb, schema } from "./index"
import { serializeRow } from "./serialize"

export async function listCharactersWithRelations() {
  const db = getDb()
  const rows = await db
    .select()
    .from(schema.characters)
    .orderBy(desc(schema.characters.updated_at))

  const result = []
  for (const row of rows) {
    result.push(await attachRelations(serializeRow(row as Record<string, unknown>)))
  }
  return result
}

export async function getCharacterWithRelations(id: string) {
  const db = getDb()
  const [row] = await db
    .select()
    .from(schema.characters)
    .where(eq(schema.characters.id, id))
    .limit(1)
  if (!row) return null
  return attachRelations(serializeRow(row as Record<string, unknown>))
}

async function attachRelations(character: Record<string, unknown>) {
  const db = getDb()
  const out = { ...character } as Record<string, unknown>

  if (character.class_id) {
    const [cls] = await db
      .select()
      .from(schema.classes)
      .where(eq(schema.classes.id, character.class_id as string))
      .limit(1)
    if (cls) out.classes = serializeRow(cls as Record<string, unknown>)
  }

  if (character.species_id) {
    const [sp] = await db
      .select()
      .from(schema.species)
      .where(eq(schema.species.id, character.species_id as string))
      .limit(1)
    if (sp) out.species = serializeRow(sp as Record<string, unknown>)
  }

  if (character.background_id) {
    const [bg] = await db
      .select()
      .from(schema.backgrounds)
      .where(eq(schema.backgrounds.id, character.background_id as string))
      .limit(1)
    if (bg) out.backgrounds = serializeRow(bg as Record<string, unknown>)
  }

  return out
}

export async function insertCharacter(data: Record<string, unknown>) {
  const id = randomUUID()
  const db = getDb()
  const now = new Date()
  const payload = {
    ...data,
    id,
    created_at: now,
    updated_at: now,
  }
  await db.insert(schema.characters).values(payload as never)
  return getCharacterWithRelations(id)
}
