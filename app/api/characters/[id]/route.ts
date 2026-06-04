import { NextRequest, NextResponse } from "next/server"
import { getDatabaseConfigError, formatDatabaseError } from "@/lib/db/config"
import { getCharacterWithRelations, updateCharacter } from "@/lib/db/characters"
import { deleteRowById } from "@/lib/db/repository"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const configError = getDatabaseConfigError()
    if (configError) return NextResponse.json({ error: configError }, { status: 503 })

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
    const configError = getDatabaseConfigError()
    if (configError) return NextResponse.json({ error: configError }, { status: 503 })

    const { id } = await params
    const body = await request.json()
    const row = (body?.rows?.[0] ?? body) as Record<string, unknown>
    const data = await updateCharacter(id, row)
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
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const configError = getDatabaseConfigError()
    if (configError) return NextResponse.json({ error: configError }, { status: 503 })

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
