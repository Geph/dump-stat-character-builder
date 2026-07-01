import { NextRequest, NextResponse } from "next/server"
import { requireMutationAuth } from "@/lib/api/require-mutation-auth"
import { getDatabaseConfigError, formatDatabaseError } from "@/lib/db/config"
import { getPool } from "@/lib/db/index"
import { ensureMigrationsApplied } from "@/lib/db/migrate"
import { getCharacterWithRelations, updateCharacter } from "@/lib/db/characters"
import { deleteRowById } from "@/lib/db/repository"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const configError = getDatabaseConfigError()
    if (configError) return NextResponse.json({ error: configError }, { status: 503 })

    await ensureMigrationsApplied(getPool())

    const { id } = await params
    const data = await getCharacterWithRelations(id)
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Query failed"
    return NextResponse.json(
      { error: formatDatabaseError("Characters", message) },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authError = requireMutationAuth(request)
    if (authError) return authError

    const configError = getDatabaseConfigError()
    if (configError) return NextResponse.json({ error: configError }, { status: 503 })

    await ensureMigrationsApplied(getPool())

    const { id } = await params
    const body = await request.json()
    const row = (body?.rows?.[0] ?? body) as Record<string, unknown>
    const existing = await getCharacterWithRelations(id)
    if (!existing) {
      return NextResponse.json({ error: "Character not found." }, { status: 404 })
    }
    const data = await updateCharacter(id, row)
    if (!data?.id) {
      return NextResponse.json({ error: "Character was not saved." }, { status: 500 })
    }
    return NextResponse.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed"
    return NextResponse.json(
      { error: formatDatabaseError("Characters", message) },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authError = requireMutationAuth(request)
    if (authError) return authError

    const configError = getDatabaseConfigError()
    if (configError) return NextResponse.json({ error: configError }, { status: 503 })

    await ensureMigrationsApplied(getPool())

    const { id } = await params
    await deleteRowById("characters", id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed"
    return NextResponse.json(
      { error: formatDatabaseError("Characters", message) },
      { status: 500 },
    )
  }
}
