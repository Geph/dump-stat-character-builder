import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Use service role client to bypass RLS for admin operations
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const VALID_TABLES = ["classes", "subclasses", "species", "backgrounds", "spells", "feats", "equipment", "custom_abilities"]

export async function POST(request: NextRequest) {
  try {
    const { table } = await request.json()
    
    if (!table || !VALID_TABLES.includes(table)) {
      return NextResponse.json({ error: "Invalid table name" }, { status: 400 })
    }
    
    const supabase = createAdminClient()
    
    // Delete all records from the specified table
    const { error } = await supabase
      .from(table)
      .delete()
      .gt("id", "00000000-0000-0000-0000-000000000000")
    
    if (error) {
      console.error(`[v0] Error clearing ${table}:`, error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, table })
  } catch (err) {
    console.error("[v0] Clear section error:", err)
    return NextResponse.json({ error: "Failed to clear section" }, { status: 500 })
  }
}
