/**
 * Stamp curated default icons onto feats that have no icon stored.
 * Safe to re-run; never overwrites a non-empty icon.
 *
 * Usage: node scripts/run-vite-node.mjs scripts/stamp-feat-default-icons.ts
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import mysql from "mysql2/promise"
import type { RowDataPacket } from "mysql2"
import { SRD_FEAT_ICONS_BY_NAME } from "@/lib/compendium/srd-item-icons-defaults"

interface FeatIconRow extends RowDataPacket {
  id: string
  name: string
  source: string
  icon: string | null
}

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(process.cwd(), ".env.local"), "utf8")
    for (const line of raw.split(/\r?\n/)) {
      if (!line || line.startsWith("#")) continue
      const i = line.indexOf("=")
      if (i <= 0) continue
      const key = line.slice(0, i).trim()
      const value = line.slice(i + 1).trim()
      if (!(key in process.env)) process.env[key] = value
    }
  } catch {
    // optional
  }
}

async function main() {
  loadEnvLocal()
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || "dumpstat",
    port: Number(process.env.MYSQL_PORT || 3306),
  })

  const [rows] = await conn.query<FeatIconRow[]>(
    "SELECT id, name, source, icon FROM feats ORDER BY name",
  )
  let updated = 0
  let skippedHasIcon = 0
  let skippedNoDefault = 0
  for (const row of rows) {
    if (typeof row.icon === "string" && row.icon.trim()) {
      skippedHasIcon++
      continue
    }
    const icon = SRD_FEAT_ICONS_BY_NAME[String(row.name ?? "").trim()]
    if (!icon) {
      skippedNoDefault++
      continue
    }
    await conn.query("UPDATE feats SET icon = ? WHERE id = ?", [icon, row.id])
    updated++
    console.log(`  ${row.name} → ${icon}`)
  }
  console.log(
    `\nUpdated ${updated}; kept existing ${skippedHasIcon}; no curated default ${skippedNoDefault}`,
  )
  await conn.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
