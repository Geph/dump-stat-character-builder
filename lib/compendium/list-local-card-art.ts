import { existsSync, readdirSync } from "node:fs"
import { join, relative } from "node:path"
import { isBundledPublicCardArtPath } from "@/lib/compendium/bundled-card-art"

const COMPENDIUM_PUBLIC_DIR = "public/images/compendium"

/**
 * Local-only card art under `public/images/compendium/`, relative to that folder.
 * Bundled SRD / Kibbles paths are omitted (those are always treated as available).
 * Server-only — do not import from client components.
 */
export function listLocalOnlyCardArtRelativePaths(root = process.cwd()): string[] {
  const compendiumRoot = join(root, COMPENDIUM_PUBLIC_DIR)
  const paths: string[] = []
  if (!existsSync(compendiumRoot)) return paths

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
        continue
      }
      if (!/\.png$/i.test(entry.name)) continue
      const repoRel = relative(root, full).replace(/\\/g, "/")
      if (isBundledPublicCardArtPath(repoRel)) continue
      paths.push(relative(compendiumRoot, full).replace(/\\/g, "/"))
    }
  }
  walk(compendiumRoot)
  paths.sort((a, b) => a.localeCompare(b))
  return paths
}
