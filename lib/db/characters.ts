import { randomUUID } from "crypto"
import { desc, eq } from "drizzle-orm"
import { normalizePortraitUrl, normalizeBannerUrl } from "@/lib/portrait"
import type { CharacterClassRow } from "@/lib/character/character-classes"
import { attachMulticlassRelations, syncCharacterClassRows } from "@/lib/db/character-multiclass"
import { getDb, schema } from "./index"
import { serializeRow } from "./serialize"

export async function listCharactersWithRelations() {
  const db = getDb()
  const rows = await db
    .select()
    .from(schema.characters)
    .orderBy(desc(schema.characters.created_at))

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

  if (character.subclass_id) {
    const [sub] = await db
      .select()
      .from(schema.subclasses)
      .where(eq(schema.subclasses.id, character.subclass_id as string))
      .limit(1)
    if (sub) out.subclasses = serializeRow(sub as Record<string, unknown>)
  }

  return attachMulticlassRelations(out)
}

function normalizeCharacterSpeed(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (value && typeof value === "object") {
    const walking = (value as { walking?: unknown }).walking
    if (typeof walking === "number" && Number.isFinite(walking)) return walking
  }
  return 30
}

export async function updateCharacter(id: string, data: Record<string, unknown>) {
  const db = getDb()
  const now = new Date()
  const classRows = data.character_classes as CharacterClassRow[] | undefined
  const payload = {
    ...data,
    speed: normalizeCharacterSpeed(data.speed),
    portrait_url: normalizePortraitUrl(data.portrait_url),
    banner_url: normalizeBannerUrl(data.banner_url),
    updated_at: now,
  }
  delete payload.id
  delete payload.created_at

  await db.update(schema.characters).set(payload as never).where(eq(schema.characters.id, id))
  if (classRows !== undefined) {
    await syncCharacterClassRows(id, classRows)
  }
  return getCharacterWithRelations(id)
}

export async function insertCharacter(data: Record<string, unknown>) {
  const id = randomUUID()
  const db = getDb()
  const now = new Date()
  const classRows = data.character_classes as CharacterClassRow[] | undefined
  const payload = {
    ...data,
    id,
    speed: normalizeCharacterSpeed(data.speed),
    portrait_url: normalizePortraitUrl(data.portrait_url),
    banner_url: normalizeBannerUrl(data.banner_url),
    created_at: now,
    updated_at: now,
  }
  await db.insert(schema.characters).values(payload as never)
  if (classRows?.length) {
    await syncCharacterClassRows(id, classRows)
  }
  return getCharacterWithRelations(id)
}
