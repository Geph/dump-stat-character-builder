import { NextRequest, NextResponse } from "next/server"
import { requireMutationAuth } from "@/lib/api/require-mutation-auth"
import { getDatabaseConfigError, formatDatabaseError } from "@/lib/db/config"
import { getPool } from "@/lib/db/index"
import { ensureMigrationsApplied } from "@/lib/db/migrate"
import { insertCharacter, listCharactersWithRelations } from "@/lib/db/characters"

export async function GET() {
  try {
    const configError = getDatabaseConfigError()
    if (configError) return NextResponse.json({ error: configError }, { status: 503 })

    await ensureMigrationsApplied(getPool())

    const data = await listCharactersWithRelations()
    return NextResponse.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Query failed"
    return NextResponse.json(
      { error: formatDatabaseError("Characters", message) },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = requireMutationAuth(request)
    if (authError) return authError

    const configError = getDatabaseConfigError()
    if (configError) return NextResponse.json({ error: configError }, { status: 503 })

    await ensureMigrationsApplied(getPool())

    const body = await request.json()
    const row = Array.isArray(body) ? body[0] : body.rows?.[0] ?? body
    const data = await insertCharacter(row as unknown as Record<string, unknown>)
    if (!data?.id) {
      return NextResponse.json({ error: "Character was not saved." }, { status: 500 })
    }
    return NextResponse.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Insert failed"
    return NextResponse.json(
      { error: formatDatabaseError("Characters", message) },
      { status: 500 },
    )
  }
}
