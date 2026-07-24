import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  auditImportWiring,
  DRIVE_SMOKE_IMPORT_FILES,
  resolveHomebrewImportJsonPath,
  summarizeFindings,
} from "@/lib/import/homebrew-import-ops"

/** CLI-equivalent Drive audit smoke (no tsx required). */
describe("homebrew Drive audit smoke", () => {
  for (const file of DRIVE_SMOKE_IMPORT_FILES) {
    const path = resolveHomebrewImportJsonPath(file)
    it.skipIf(!path)(`${file}: raw Drive JSON has no structural audit errors`, () => {
      const summary = summarizeFindings(auditImportWiring(JSON.parse(readFileSync(path!, "utf8"))))
      expect(summary.errors, JSON.stringify(auditImportWiring(JSON.parse(readFileSync(path!, "utf8"))), null, 2)).toBe(0)
    })
  }
})
