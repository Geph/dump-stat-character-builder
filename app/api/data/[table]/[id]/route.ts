import { NextRequest, NextResponse } from "next/server"
import { getDatabaseConfigError, formatDatabaseError } from "@/lib/db/config"
import { deleteRowById, getRowById, updateRowById } from "@/lib/db/repository"
import { resolveTable } from "@/lib/db/tables"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ table: string; id: string }> },
) {
  try {
    const configError = getDatabaseConfigError()
    if (configError) return NextResponse.json({ error: configError }, { status: 503 })

    const { table: raw, id } = await params
    const table = resolveTable(raw)
    if (!table || table === "characters") {
      return NextResponse.json({ error: "Invalid table" }, { status: 400 })
    }

    const data = await getRowById(table, id)
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Query failed"
    return NextResponse.json(
      { error: formatDatabaseError("Query", message) },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ table: string; id: string }> },
) {
  try {
    const configError = getDatabaseConfigError()
    if (configError) return NextResponse.json({ error: configError }, { status: 503 })

    const { table: raw, id } = await params
    const table = resolveTable(raw)
    if (!table || table === "characters") {
      return NextResponse.json({ error: "Invalid table" }, { status: 400 })
    }

    const body = await request.json()
    await updateRowById(table, id, body)
    const data = await getRowById(table, id)
    return NextResponse.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed"
    return NextResponse.json(
      { error: formatDatabaseError("Update", message) },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ table: string; id: string }> },
) {
  try {
    const configError = getDatabaseConfigError()
    if (configError) return NextResponse.json({ error: configError }, { status: 503 })

    const { table: raw, id } = await params
    const table = resolveTable(raw)
    if (!table || table === "characters") {
      return NextResponse.json({ error: "Invalid table" }, { status: 400 })
    }

    await deleteRowById(table, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed"
    return NextResponse.json(
      { error: formatDatabaseError("Delete", message) },
      { status: 500 },
    )
  }
}
