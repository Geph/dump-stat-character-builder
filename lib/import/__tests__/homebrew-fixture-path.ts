import { existsSync } from "node:fs"
import { join } from "node:path"

/**
 * Optional local homebrew / third-party JSON imports for development tests.
 * Not shipped in CI or committed — copyrighted source extracts stay outside the repo.
 */
const EXTERNAL_FIXTURE_DIRS = [
  join(
    process.env.HOME ?? "",
    "Library/CloudStorage/GoogleDrive-thejeffginger@gmail.com/My Drive/Code Projects/dump stat working files/import-json",
  ),
  join(
    process.env.HOME ?? "",
    "Library/CloudStorage/GoogleDrive-thejeffginger@gmail.com/My Drive/Code Projects/dump stat working files/JSON imports",
  ),
  join("d:", "Google Drive", "Code Projects", "dump stat working files", "JSON imports"),
  join("d:", "Google Drive", "Code Projects", "dump stat working files", "import-json"),
]

export function resolveHomebrewFixtureDir(): string | null {
  const fromEnv = process.env.HOMEBREW_IMPORT_FIXTURE_DIR?.trim()
  if (fromEnv && existsSync(fromEnv)) return fromEnv
  for (const dir of EXTERNAL_FIXTURE_DIRS) {
    if (dir && existsSync(dir)) return dir
  }
  return null
}

export function homebrewFixturePath(name: string): string | null {
  const dir = resolveHomebrewFixtureDir()
  if (!dir) return null
  const path = join(dir, name)
  return existsSync(path) ? path : null
}

export const hasHomebrewImportFixtures = resolveHomebrewFixtureDir() !== null
