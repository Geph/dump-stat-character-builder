import type { Pool } from "mysql2/promise"
import { SCHEMA_MIGRATIONS } from "./schema-migrations.mjs"

type Queryable = {
  query: (sql: string, values?: unknown[]) => Promise<unknown>
}

/** Apply any pending schema migrations. Returns names of migrations that ran. */
export async function runPendingMigrations(conn: Queryable): Promise<string[]> {
  const applied: string[] = []

  for (const migration of SCHEMA_MIGRATIONS) {
    const [rows] = (await conn.query(migration.check)) as [Record<string, unknown>[], unknown]
    const row = rows[0] ?? {}
    const done = migration.alreadyApplied
      ? migration.alreadyApplied(row)
      : Number(row.n ?? 0) > 0
    if (done) continue

    await conn.query(migration.apply)
    applied.push(migration.name)
  }

  return applied
}

export async function runPendingMigrationsOnPool(pool: Pool): Promise<string[]> {
  return runPendingMigrations({
    query: (sql, values) => pool.query(sql, values),
  })
}
