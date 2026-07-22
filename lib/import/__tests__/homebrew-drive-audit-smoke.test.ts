import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  auditImportWiring,
  DRIVE_SMOKE_IMPORT_FILES,
  homebrewImportJsonDir,
  summarizeFindings,
} from "@/lib/import/homebrew-import-ops"

/** CLI-equivalent Drive audit smoke (no tsx required). */
describe("homebrew Drive audit smoke", () => {
  const dir = homebrewImportJsonDir()

  for (const file of DRIVE_SMOKE_IMPORT_FILES) {
    const path = join(dir, file)
    it.skipIf(!existsSync(path))(`${file}: raw Drive JSON has no structural audit errors`, () => {
      const summary = summarizeFindings(auditImportWiring(JSON.parse(readFileSync(path, "utf8"))))
      expect(summary.errors, JSON.stringify(auditImportWiring(JSON.parse(readFileSync(path, "utf8"))), null, 2)).toBe(0)
    })
  }
})
