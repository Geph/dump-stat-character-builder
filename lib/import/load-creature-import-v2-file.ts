import { readFileSync } from "node:fs"
import {
  CreatureImportValidationException,
  parseCreatureImportDocument,
} from "@/lib/import/load-creature-import-v2"
import type { CreatureImportDocument } from "@/lib/import/creature-import-v2-schema"

/**
 * Load and validate a dump-stat creatures v2 JSON file from disk.
 * Node-only: browser code should import the parsers from load-creature-import-v2.
 */
export function loadCreatureImportDocumentFromFile(filePath: string): CreatureImportDocument {
  let text: string
  try {
    text = readFileSync(filePath, "utf8")
  } catch (error) {
    throw new CreatureImportValidationException(
      `Could not read creature import file at ${filePath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      [{ path: filePath, message: "file unreadable" }],
    )
  }

  let json: unknown
  try {
    json = JSON.parse(text)
  } catch (error) {
    throw new CreatureImportValidationException(
      `Creature import file is not valid JSON (${filePath}): ${
        error instanceof Error ? error.message : String(error)
      }`,
      [{ path: filePath, message: "invalid JSON" }],
    )
  }

  return parseCreatureImportDocument(json)
}
