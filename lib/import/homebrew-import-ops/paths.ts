/**
 * Shared paths for Mage Hand Press / homebrew import review tooling.
 * Override with HOMEBREW_IMPORT_JSON_DIR / HOMEBREW_SOURCE_TEXTS_DIR.
 */

import { existsSync, readdirSync, statSync } from "node:fs"
import { basename, join } from "node:path"
import { homedir } from "node:os"

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

const IMPORT_JSON_SEARCH_DEPTH = 2

/**
 * Resolve an import-json basename whether it sits at the Drive root or in a
 * publisher subfolder (laserllama/, mage hand press/, kibbles tasty/, …).
 */
export function resolveHomebrewImportJsonPath(name: string): string | null {
  const root = homebrewImportJsonDir()
  const target = basename(name.trim())
  if (!target || !existsSync(root)) return null

  const rootHit = join(root, target)
  if (existsSync(rootHit)) {
    try {
      if (statSync(rootHit).isFile()) return rootHit
    } catch {
      /* ignore */
    }
  }

  const queue: { dir: string; depth: number }[] = [{ dir: root, depth: 0 }]
  while (queue.length) {
    const { dir, depth } = queue.shift()!
    if (depth >= IMPORT_JSON_SEARCH_DEPTH) continue
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      continue
    }
    for (const entry of entries) {
      if (entry.startsWith(".")) continue
      const full = join(dir, entry)
      let st
      try {
        st = statSync(full)
      } catch {
        continue
      }
      if (st.isFile() && entry === target) return full
      if (st.isDirectory()) queue.push({ dir: full, depth: depth + 1 })
    }
  }
  return null
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
  "laserllama-exploits-custom": "laserllama-custom-feature-exploits",
  "laserllama-altsorcerer-class": "laserllama-altsorcerer-class",
  "laserllama-metamagic-custom": "laserllama-alt-sorcerer-metamagic-custom",
  "laserllama-altbarbarian-class": "laserllama-altbarbarian-class",
  "laserllama-altranger-class": "laserllama-altranger-class",
  "laserllama-knacks-custom": "laserllama-altranger-custom-knacks",
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
  "laserllama-exploits-custom",
  "laserllama-altsorcerer-class",
  "laserllama-altbarbarian-class",
  "laserllama-altranger-class",
] as const
