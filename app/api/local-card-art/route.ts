import { NextResponse } from "next/server"
import { listLocalOnlyCardArtRelativePaths } from "@/lib/compendium/list-local-card-art"

/** Live listing of local-only card art on this machine (dev / hosted). Gitignored PNGs included. */
export async function GET() {
  try {
    const paths = listLocalOnlyCardArtRelativePaths()
    return NextResponse.json({ paths })
  } catch {
    return NextResponse.json({ paths: [] })
  }
}
