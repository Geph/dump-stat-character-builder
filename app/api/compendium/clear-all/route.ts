import { NextRequest, NextResponse } from "next/server"
import { requireMutationAuth } from "@/lib/api/require-mutation-auth"
import { getDatabaseConfigError } from "@/lib/db/config"
import { clearTable } from "@/lib/db/repository"
import { COMPENDIUM_TABLES } from "@/lib/db/tables"
import { createClient } from "@/lib/db/client"
import { ensureModifierCatalog } from "@/lib/compendium/ensure-modifier-catalog"

export async function POST(request: NextRequest) {
  try {
    const authError = requireMutationAuth(request)
    if (authError) return authError

    const configError = getDatabaseConfigError()
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 503 })
    }

    for (const table of COMPENDIUM_TABLES) {
      await clearTable(table)
    }

    await ensureModifierCatalog(createClient())

    return NextResponse.json({ success: true, cleared: COMPENDIUM_TABLES })
  } catch (err) {
    console.error("[v0] Clear compendium error:", err)
    return NextResponse.json({ error: "Failed to clear the compendium" }, { status: 500 })
  }
}
