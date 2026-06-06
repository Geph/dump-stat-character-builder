#!/usr/bin/env node
/**
 * Export SRD class rows (icons, descriptions, features) from local MySQL into seed JSON.
 * Usage: node scripts/export-srd-classes-from-db.mjs
 */
import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
import mysql from "mysql2/promise"

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim()
  if (url) return url
  const host = process.env.MYSQL_HOST ?? "localhost"
  const user = process.env.MYSQL_USER
  const password = process.env.MYSQL_PASSWORD ?? ""
  const database = process.env.MYSQL_DATABASE
  const port = process.env.MYSQL_PORT ?? "3306"
  if (!user || !database) {
    throw new Error("Set DATABASE_URL or MYSQL_* env vars")
  }
  return `mysql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`
}

async function main() {
  const conn = await mysql.createConnection(getDatabaseUrl())
  const [rows] = await conn.query(
    `SELECT name, description, icon, features, class_resources, spellcasting, source
     FROM classes WHERE source IN ('SRD', 'D&D 5.5e SRD') ORDER BY name`,
  )
  await conn.end()

  const outPath = resolve("lib/srd/seed-data/classes-export.json")
  writeFileSync(outPath, JSON.stringify(rows, null, 2))
  console.log(`Wrote ${rows.length} classes to ${outPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
