import { listRows } from "@/lib/db/repository"
import type { CompendiumTable } from "@/lib/db/tables"
import { resolveTable } from "@/lib/db/tables"
import {
  buildImportCollisions,
  type ImportCollision,
  type ImportCollisionKind,
} from "@/lib/import/import-collisions"
import type { ImportContent } from "@/lib/import/content-schema"

const COLLISION_TABLES: ImportCollisionKind[] = [
  "class",
  "feat",
  "species",
  "spell",
  "background",
  "ability",
]

const TABLE_BY_KIND: Record<ImportCollisionKind, CompendiumTable | "characters"> = {
  class: "classes",
  feat: "feats",
  species: "species",
  spell: "spells",
  background: "backgrounds",
  ability: "custom_abilities",
}

/** Load compendium names for import collision detection. */
export async function fetchExistingForImportCollisions(): Promise<
  Partial<Record<ImportCollisionKind, { name: string; source?: string | null }[]>>
> {
  const result: Partial<Record<ImportCollisionKind, { name: string; source?: string | null }[]>> = {}

  await Promise.all(
    COLLISION_TABLES.map(async (kind) => {
      const table = resolveTable(TABLE_BY_KIND[kind]) ?? TABLE_BY_KIND[kind]
      const rows = (await listRows(table)) as { name: string; source?: string | null }[]
      result[kind] = rows.map((row) => ({
        name: row.name,
        source: row.source ?? null,
      }))
    }),
  )

  return result
}

export async function detectImportCollisions(content: ImportContent): Promise<ImportCollision[]> {
  const existingByKind = await fetchExistingForImportCollisions()
  return buildImportCollisions(content, existingByKind)
}

const COLLISION_CHECK_TIMEOUT_MS = 8_000

/** Collision detection with timeout — returns [] when MySQL is slow or unreachable. */
export async function detectImportCollisionsSafe(
  content: ImportContent,
): Promise<{ collisions: ImportCollision[]; warning?: string }> {
  try {
    const collisions = await Promise.race([
      detectImportCollisions(content),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("Compendium collision check timed out")),
          COLLISION_CHECK_TIMEOUT_MS,
        )
      }),
    ])
    return { collisions }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Collision check failed"
    console.warn("Import collision check skipped:", message)
    return {
      collisions: [],
      warning:
        "Could not check compendium name collisions (database unreachable or slow). Review carefully before confirming.",
    }
  }
}
