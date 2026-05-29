/**
 * Apply incremental schema updates to an existing dump_stat database.
 *
 *   $env:MYSQL_ROOT_PASSWORD = '...'
 *   node scripts/db-migrate.mjs
 *
 * Uses root credentials. The app also runs these migrations automatically before seeding
 * when using MYSQL_* / DATABASE_URL from .env.local.
 */

import mysql from "mysql2/promise"
import { SCHEMA_MIGRATIONS } from "../lib/db/schema-migrations.mjs"

const host = process.env.MYSQL_HOST?.trim() || "localhost"
const port = Number(process.env.MYSQL_PORT?.trim() || "3306")
const database = process.env.MYSQL_DATABASE?.trim() || "dump_stat"
const rootPassword = process.env.MYSQL_ROOT_PASSWORD ?? ""

if (!rootPassword) {
  console.error(
    "Set MYSQL_ROOT_PASSWORD, then run again.\n" +
      "  PowerShell: $env:MYSQL_ROOT_PASSWORD = 'your-password'; pnpm db:migrate",
  )
  process.exit(1)
}

async function runPendingMigrations(conn) {
  const applied = []
  for (const migration of SCHEMA_MIGRATIONS) {
    const [rows] = await conn.query(migration.check)
    const row = rows[0] ?? {}
    const done = migration.alreadyApplied
      ? migration.alreadyApplied(row)
      : Number(row.n ?? 0) > 0
    if (done) {
      console.log(`skip ${migration.name} (already applied)`)
      continue
    }
    await conn.query(migration.apply)
    console.log(`applied ${migration.name}`)
    applied.push(migration.name)
  }
  return applied
}

let connection
try {
  connection = await mysql.createConnection({
    host,
    port,
    user: "root",
    password: rootPassword,
    database,
  })

  await runPendingMigrations(connection)
  console.log("Migrations complete.")
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
} finally {
  await connection?.end()
}
