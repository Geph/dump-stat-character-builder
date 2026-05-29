import { NextRequest, NextResponse } from "next/server"
import { getDatabaseConfigError, formatDatabaseError } from "@/lib/db/config"
import { clearTable } from "@/lib/db/repository"
import { resolveTable } from "@/lib/db/tables"

const VALID_TABLES = ["classes", "subclasses", "species", "backgrounds", "spells", "feats", "equipment", "custom_abilities"]

export async function POST(request: NextRequest) {
  try {
    const configError = getDatabaseConfigError()
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 503 })
    }

    const { table } = await request.json()
    
    if (!table || !VALID_TABLES.includes(table)) {
      return NextResponse.json({ error: "Invalid table name" }, { status: 400 })
    }

    const resolved = resolveTable(table)
    if (!resolved || resolved === "characters") {
      return NextResponse.json({ error: "Invalid table name" }, { status: 400 })
    }

    await clearTable(resolved)
    
    return NextResponse.json({ success: true, table })
  } catch (err) {
    console.error("[v0] Clear section error:", err)
    return NextResponse.json({ error: "Failed to clear section" }, { status: 500 })
  }
}
