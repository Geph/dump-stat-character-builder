import { NextRequest, NextResponse } from "next/server"
import { requireMutationAuth } from "@/lib/api/require-mutation-auth"
import { getDatabaseConfigError, formatDatabaseError } from "@/lib/db/config"
import { clearTable } from "@/lib/db/repository"
import { resolveTable } from "@/lib/db/tables"
import { createClient } from "@/lib/db/client"
import { ensureModifierCatalog } from "@/lib/compendium/ensure-modifier-catalog"

const VALID_TABLES = ["classes", "subclasses", "species", "backgrounds", "spells", "feats", "equipment", "class_resources", "custom_abilities"]

export async function POST(request: NextRequest) {
  try {
    const authError = requireMutationAuth(request)
    if (authError) return authError

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

    if (table === "classes") {
      await clearTable("subclasses")
      await clearTable("class_resources")
    }

    if (table === "custom_abilities" || resolved === "custom_abilities") {
      await ensureModifierCatalog(createClient())
    }
    
    return NextResponse.json({
      success: true,
      table,
      alsoCleared: table === "classes" ? ["subclasses", "class_resources"] : [],
      restoredSystemCatalog: table === "abilities" || resolved === "custom_abilities",
    })
  } catch (err) {
    console.error("[v0] Clear section error:", err)
    return NextResponse.json({ error: "Failed to clear section" }, { status: 500 })
  }
}
