import { NextRequest, NextResponse } from "next/server"
import { readdir } from "fs/promises"
import { join } from "path"
import { categorizeIcons, ICON_CATEGORIES } from "@/lib/icons/categories"

type IconCache = {
  icons: string[]
  byCategory: Map<string, string[]>
}

let cache: IconCache | null = null

async function loadIcons(): Promise<IconCache> {
  if (cache) return cache

  const dir = join(process.cwd(), "public", "icons")
  const files = await readdir(dir)
  const icons = files
    .filter((f) => f.endsWith(".svg"))
    .map((f) => f.replace(/\.svg$/, ""))
    .sort()

  cache = { icons, byCategory: categorizeIcons(icons) }
  return cache
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const category = searchParams.get("category")
    const search = searchParams.get("search")?.trim().toLowerCase()

    const data = await loadIcons()

    if (search) {
      const icons = data.icons
        .filter((name) => name.toLowerCase().includes(search))
        .slice(0, 240)
      return NextResponse.json({ icons, search })
    }

    if (category) {
      const icons = data.byCategory.get(category) ?? []
      return NextResponse.json({ icons, category })
    }

    const categories = [
      ...ICON_CATEGORIES.map((c) => ({
        id: c.id,
        label: c.label,
        count: data.byCategory.get(c.id)?.length ?? 0,
      })),
      {
        id: "other",
        label: "Other",
        count: data.byCategory.get("other")?.length ?? 0,
      },
    ]

    return NextResponse.json({
      categories,
      total: data.icons.length,
    })
  } catch {
    return NextResponse.json({
      categories: [],
      icons: [],
      total: 0,
    })
  }
}
