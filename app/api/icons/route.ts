import { NextResponse } from "next/server"
import { readdir } from "fs/promises"
import { join } from "path"

// Returns the list of icon names available in public/icons/
// Icon names are the filenames without the .svg extension.
export async function GET() {
  try {
    const dir = join(process.cwd(), "public", "icons")
    const files = await readdir(dir)
    const icons = files
      .filter((f) => f.endsWith(".svg"))
      .map((f) => f.replace(/\.svg$/, ""))
      .sort()
    return NextResponse.json({ icons })
  } catch {
    // Directory doesn't exist or is empty — return empty list gracefully
    return NextResponse.json({ icons: [] })
  }
}
