import { describe, expect, it } from "vitest"
import {
  normalizeImporterSourceLabel,
  sanitizeImportRowSource,
} from "@/lib/import/sanitize-import-source"
import { SRD_SOURCE } from "@/lib/srd/source"

describe("sanitizeImportRowSource", () => {
  it("rewrites SRD source labels to the importer fallback", () => {
    expect(sanitizeImportRowSource(SRD_SOURCE, "PDF Import")).toBe("PDF Import")
    expect(sanitizeImportRowSource("SRD", "Homebrew Wiki")).toBe("Homebrew Wiki")
    expect(sanitizeImportRowSource("D&D 5.5e SRD", "Foundry VTT Import")).toBe(
      "Foundry VTT Import",
    )
  })

  it("preserves non-SRD importer labels", () => {
    expect(sanitizeImportRowSource("Kibbles Homebrew", "PDF Import")).toBe("Kibbles Homebrew")
  })

  it("normalizes blank importer labels", () => {
    expect(normalizeImporterSourceLabel("  ")).toBe("Custom")
  })
})
