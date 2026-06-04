import type { Pool } from "mysql2/promise"
import { isDuplicateColumnError, isMigrationApplied } from "./migrate-utils.mjs"
import { SCHEMA_MIGRATIONS } from "./schema-migrations.mjs"

type Queryable = {
  query: (sql: string, values?: unknown[]) => Promise<unknown>
}

/** Apply any pending schema migrations. Returns names of migrations that ran. */
export async function runPendingMigrations(conn: Queryable): Promise<string[]> {
  const applied: string[] = []

  for (const migration of SCHEMA_MIGRATIONS) {
    const [rows] = (await conn.query(migration.check)) as [Record<string, unknown>[], unknown]
    const rowsArray = rows ?? []
    if (isMigrationApplied(rowsArray, migration)) continue

    try {
      await conn.query(migration.apply)
      applied.push(migration.name)
    } catch (err) {
      if (isDuplicateColumnError(err)) continue
      throw err
    }
  }

  return applied
}

export async function runPendingMigrationsOnPool(pool: Pool): Promise<string[]> {
  return runPendingMigrations({
    query: (sql, values) => pool.query(sql, values),
  })
}
