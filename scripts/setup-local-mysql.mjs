/**
 * One-time local MySQL setup: create database, apply schema.
 *
 * Usage (PowerShell):
 *   $env:MYSQL_ROOT_PASSWORD = 'your-root-password'
 *   node scripts/setup-local-mysql.mjs
 *
 * Optional env:
 *   MYSQL_HOST (default localhost)
 *   MYSQL_PORT (default 3306)
 *   MYSQL_DATABASE (default dump_stat)
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import mysql from "mysql2/promise"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")

const host = process.env.MYSQL_HOST?.trim() || "localhost"
const port = Number(process.env.MYSQL_PORT?.trim() || "3306")
const database = process.env.MYSQL_DATABASE?.trim() || "dump_stat"
const rootPassword = process.env.MYSQL_ROOT_PASSWORD ?? ""

if (!rootPassword) {
  console.error(
    "Set MYSQL_ROOT_PASSWORD to your local MySQL root password, then run again.\n" +
      "  PowerShell: $env:MYSQL_ROOT_PASSWORD = 'your-password'; node scripts/setup-local-mysql.mjs",
  )
  process.exit(1)
}

const schemaPath = path.join(rootDir, "mysql", "schema.sql")
if (!fs.existsSync(schemaPath)) {
  console.error(`Schema not found: ${schemaPath}`)
  process.exit(1)
}

const schemaSql = fs.readFileSync(schemaPath, "utf8").replace(/^\uFEFF/, "")

let connection
try {
  connection = await mysql.createConnection({
    host,
    port,
    user: "root",
    password: rootPassword,
    multipleStatements: true,
  })

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  )
  await connection.query(`USE \`${database}\``)
  await connection.query(schemaSql)

  const [tables] = await connection.query("SHOW TABLES")
  console.log(`Database "${database}" is ready on ${host}:${port}.`)
  console.log(`Tables: ${tables.length}`)
  console.log(
    "\nNext: set DATABASE_URL or MYSQL_* in .env.local, then run:\n" +
      "  corepack pnpm dev\n" +
      "  curl -X POST http://localhost:3000/api/seed",
  )
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
} finally {
  await connection?.end()
}
