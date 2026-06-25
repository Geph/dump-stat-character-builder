import { existsSync } from "node:fs"
import { join } from "node:path"

/** Optional local homebrew JSON imports (not shipped in CI). */
const EXTERNAL_FIXTURE_DIR = join(
  "d:",
  "Google Drive",
  "Code Projects",
  "dump stat working files",
  "JSON imports",
)

export function resolveHomebrewFixtureDir(): string | null {
  const fromEnv = process.env.HOMEBREW_IMPORT_FIXTURE_DIR?.trim()
  if (fromEnv && existsSync(fromEnv)) return fromEnv
  if (existsSync(EXTERNAL_FIXTURE_DIR)) return EXTERNAL_FIXTURE_DIR
  return null
}

export function homebrewFixturePath(name: string): string | null {
  const dir = resolveHomebrewFixtureDir()
  if (!dir) return null
  const path = join(dir, name)
  return existsSync(path) ? path : null
}

export const hasHomebrewImportFixtures = resolveHomebrewFixtureDir() !== null
