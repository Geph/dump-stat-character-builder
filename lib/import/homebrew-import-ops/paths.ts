/**
 * Shared paths for Mage Hand Press / homebrew import review tooling.
 * Override with HOMEBREW_IMPORT_JSON_DIR / HOMEBREW_SOURCE_TEXTS_DIR.
 */

import { homedir } from "node:os"
import { join } from "node:path"

const DRIVE_ROOT = join(
  homedir(),
  "Library/CloudStorage/GoogleDrive-thejeffginger@gmail.com/My Drive/Code Projects/dump stat working files",
)

export function homebrewImportJsonDir(): string {
  return process.env.HOMEBREW_IMPORT_JSON_DIR?.trim() || join(DRIVE_ROOT, "import-json")
}

export function homebrewSourceTextsDir(): string {
  return (
    process.env.HOMEBREW_SOURCE_TEXTS_DIR?.trim() || join(DRIVE_ROOT, "source-texts", "Classes")
  )
}

/** Drive import-json basename → optional source-texts basename (when they differ). */
export const IMPORT_TO_SOURCE_BASENAME: Record<string, string> = {
  "magehandpress-investigator-class": "magehandpress-investigator-class",
  "magehandpress-martyr-class": "magehandpress-martyr-class",
  "magehandpress-necromancer-class": "magehandpress-necromancer-class",
  "magehandpress-craftsman-class": "magehandpress-craftsman-class",
  "magehandpress-dancer-class": "magehandpress-dancer-class",
  "magehandpress-gunslinger-class": "magehandpress-gunslinger-class",
  "magehandpress-alchemist-class": "magehandpress-alchemist-class",
  "magehandpress-captain-class": "magehandpress-captain-class",
  "magehandpress-warden-class": "magehandpress-warden-class",
  "magehandpress-warmage-class": "magehandpress-warmage-class",
  "magehandpress-witch-class": "magehandpress-witch-class",
  "magehandpress-vagabond-class": "magehandpress-vagabond-class",
  "kibbles-occultist-class": "kibbles-occultist-class",
  "kibbles-warden-class": "kibbles-warden-class",
  "kibbles-inventor-class": "kibbles-inventor-class",
  "MCDM-beastheart-class": "MCDM-beastheart-class",
  "eberron-artificer-class": "eberron-artificer-class",
  "eberron-artificer-class.json": "eberron-artificer-class",
}

export const DRIVE_SMOKE_IMPORT_FILES = [
  "magehandpress-investigator-class",
  "magehandpress-martyr-class",
  "magehandpress-necromancer-class",
  "magehandpress-vagabond-class",
  "magehandpress-witch-class",
  "magehandpress-warmage-class",
  "kibbles-occultist-class",
  "kibbles-warden-class",
  "kibbles-inventor-class",
  "MCDM-beastheart-class",
] as const
