/**
 * Stamp curated Kibbles presentation into Drive import-json source files.
 * Usage: node scripts/run-vite-node.mjs scripts/stamp-kibbles-species-background-presentation.ts
 */
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import {
  applyKibblesRowPresentation,
  KIBBLES_BACKGROUND_PRESENTATION,
  KIBBLES_SPECIES_PRESENTATION,
  type KibblesRowPresentation,
} from "@/lib/seed-packs/kibbles-tasty/species-background-presentation"

const DIR =
  "d:/Google Drive/Code Projects/dump stat working files/import-json/kibbles tasty"

function stampFile(
  fileName: string,
  key: "species" | "backgrounds",
  presentation: Record<string, KibblesRowPresentation>,
) {
  const path = join(DIR, fileName)
  const content = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown[]>
  const rows = content[key]
  if (!Array.isArray(rows)) throw new Error(`Missing ${key} in ${fileName}`)
  content[key] = rows.map((row) =>
    applyKibblesRowPresentation(row as Record<string, unknown>, presentation, {
      overwrite: true,
    }),
  )
  writeFileSync(path, `${JSON.stringify(content)}\n`, "utf8")
  console.log(
    `stamped ${fileName}`,
    content[key].map((r) => ({
      name: (r as { name?: string }).name,
      icon: (r as { icon?: string | null }).icon ?? null,
      creator_url: (r as { creator_url?: string | null }).creator_url ?? null,
    })),
  )
}

stampFile("kibbles-species.txt", "species", KIBBLES_SPECIES_PRESENTATION)
stampFile("kibbles-backgrounds.txt", "backgrounds", KIBBLES_BACKGROUND_PRESENTATION)
