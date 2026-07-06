import { NextRequest, NextResponse } from "next/server"
import { getDatabaseConfigError, formatDatabaseError } from "@/lib/db/config"
import { requireMutationAuth } from "@/lib/api/require-mutation-auth"
import { getPool } from "@/lib/db/index"
import { ensureMigrationsApplied } from "@/lib/db/migrate"
import {
  clearTable,
  countRows,
  deleteWhere,
  insertRows,
  listRows,
  upsertByName,
  type Filter,
  type OrderBy,
} from "@/lib/db/repository"
import { resolveTable } from "@/lib/db/tables"

function parseFilters(request: NextRequest): Filter[] {
  const filters: Filter[] = []
  for (const [key, value] of request.nextUrl.searchParams.entries()) {
    if (key.startsWith("eq_")) {
      filters.push({ op: "eq", column: key.slice(3), value })
    }
    if (key.startsWith("in_")) {
      filters.push({
        op: "in",
        column: key.slice(3),
        values: value.split(",").filter(Boolean),
      })
    }
  }
  return filters
}

function parseOrders(request: NextRequest): OrderBy[] {
  const orders: OrderBy[] = []
  const params = request.nextUrl.searchParams
  const first = params.get("order")
  if (first) {
    orders.push({ column: first, ascending: params.get("orderDir") !== "desc" })
  }
  let i = 2
  while (params.get(`order${i}`)) {
    orders.push({
      column: params.get(`order${i}`)!,
      ascending: params.get(`orderDir${i}`) !== "desc",
    })
    i++
  }
  return orders
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> },
) {
  try {
    const configError = getDatabaseConfigError()
    if (configError) return NextResponse.json({ error: configError }, { status: 503 })

    await ensureMigrationsApplied(getPool())

    const { table: raw } = await params
    const table = resolveTable(raw)
    if (!table || table === "characters") {
      return NextResponse.json({ error: "Invalid table" }, { status: 400 })
    }

    const filters = parseFilters(request)
    const orders = parseOrders(request)
    const limit = request.nextUrl.searchParams.get("limit")
      ? Number(request.nextUrl.searchParams.get("limit"))
      : undefined

    if (request.nextUrl.searchParams.get("countOnly") === "1") {
      const count = await countRows(table, filters)
      return NextResponse.json({ count })
    }

    const data = await listRows(table, {
      filters,
      orders: orders.length ? orders : [{ column: "name", ascending: true }],
      limit,
    })

    if (request.nextUrl.searchParams.get("single") === "1") {
      return NextResponse.json({ data: data[0] ?? null })
    }

    return NextResponse.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Query failed"
    return NextResponse.json(
      { error: formatDatabaseError("Query", message) },
      { status: 500 },
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> },
) {
  try {
    const authError = requireMutationAuth(request)
    if (authError) return authError

    const configError = getDatabaseConfigError()
    if (configError) return NextResponse.json({ error: configError }, { status: 503 })

    await ensureMigrationsApplied(getPool())

    const { table: raw } = await params
    const table = resolveTable(raw)
    if (!table || table === "characters") {
      return NextResponse.json({ error: "Invalid table" }, { status: 400 })
    }

    const body = await request.json()
    const rows = (body.rows ?? []) as unknown as Record<string, unknown>[]

    if (body.upsert) {
      await upsertByName(table, rows)
      return NextResponse.json({ success: true })
    }

    const data = await insertRows(table, rows)
    return NextResponse.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Write failed"
    return NextResponse.json(
      { error: formatDatabaseError("Write", message) },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> },
) {
  try {
    const authError = requireMutationAuth(request)
    if (authError) return authError

    const configError = getDatabaseConfigError()
    if (configError) return NextResponse.json({ error: configError }, { status: 503 })

    await ensureMigrationsApplied(getPool())

    const { table: raw } = await params
    const table = resolveTable(raw)
    if (!table || table === "characters") {
      return NextResponse.json({ error: "Invalid table" }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    if (body.clearAll) {
      await clearTable(table)
      return NextResponse.json({ success: true })
    }

    const filters = (body.filters ?? []) as Filter[]
    if (filters.length) {
      await deleteWhere(table, filters)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed"
    return NextResponse.json(
      { error: formatDatabaseError("Delete", message) },
      { status: 500 },
    )
  }
}
