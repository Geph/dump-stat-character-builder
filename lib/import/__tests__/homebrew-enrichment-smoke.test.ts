import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { applyImportEnrichmentPresets } from "@/lib/import/enrichment-presets/apply"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import { applyClassSpellListsToImport } from "@/lib/import/class-spell-lists"
import { parseImportContentJson } from "@/lib/import/parse-import-content-json"
import {
  auditImportWiring,
  DRIVE_SMOKE_IMPORT_FILES,
  homebrewImportJsonDir,
  summarizeFindings,
} from "@/lib/import/homebrew-import-ops"
import type { Feature } from "@/lib/types"

/**
 * Enrichment pack smoke (#5): when Drive import-json fixtures exist, ensure
 * audit is clean (or only warnings) after enrichment sanitizers run.
 */
describe("homebrew enrichment Drive smoke", () => {
  const dir = homebrewImportJsonDir()

  for (const file of DRIVE_SMOKE_IMPORT_FILES) {
    const path = join(dir, file)
    const present = existsSync(path)

    it.skipIf(!present)(`${file}: structural audit passes after sanitize/enrich path`, () => {
      const raw = parseImportContentJson(readFileSync(path, "utf8"))!
      const enriched = enrichImportContentModifiers(
        applyClassSpellListsToImport(applyImportEnrichmentPresets(raw)),
      )
      const summary = summarizeFindings(auditImportWiring(enriched))
      expect(summary.errors, JSON.stringify(auditImportWiring(enriched), null, 2)).toBe(0)
    })
  }

  it.skipIf(!existsSync(join(dir, "magehandpress-investigator-class")))(
    "investigator enrichment still remaps finisher and grants Antiquarian trinkets",
    () => {
      const path = join(dir, "magehandpress-investigator-class")
      const content = enrichImportContentModifiers(
        applyClassSpellListsToImport(
          applyImportEnrichmentPresets(parseImportContentJson(readFileSync(path, "utf8"))!),
        ),
      )
      expect(content.class_resources?.some((r) => r.resource_key === "finisher")).toBe(true)
      const antiquarian = content.subclasses?.find((s) => s.name === "Antiquarian")
      const trinkets = antiquarian?.features?.find((f) => f.name === "Trinkets") as Feature | undefined
      const grant = trinkets?.linkedModifiers
        ?.flatMap((m) => m.characteristics ?? [])
        .find((c) => c.type === "grant_custom_ability") as { abilityNames?: string[] } | undefined
      expect(grant?.abilityNames?.length).toBeGreaterThan(0)
    },
  )
})
