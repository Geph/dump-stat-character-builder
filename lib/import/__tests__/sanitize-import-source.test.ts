import { describe, expect, it } from "vitest"
import {
  normalizeImportMaterialSource,
  isImportMaterialSourceAutoDetect,
} from "@/lib/import/import-material-source"
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

  it("keeps row source when present, else uses importer fallback", () => {
    expect(sanitizeImportRowSource("Planescape", "Custom")).toBe("Planescape")
    expect(sanitizeImportRowSource(null, "Custom")).toBe("Custom")
    expect(sanitizeImportRowSource("", "Custom")).toBe("Custom")
  })
})

describe("normalizeImportMaterialSource", () => {
  it("treats blank and Auto-detect as Custom fallback", () => {
    expect(isImportMaterialSourceAutoDetect("")).toBe(true)
    expect(isImportMaterialSourceAutoDetect("Auto-detect")).toBe(true)
    expect(normalizeImportMaterialSource("")).toBe("Custom")
    expect(normalizeImportMaterialSource("  auto-detect  ")).toBe("Custom")
    expect(normalizeImportMaterialSource(undefined)).toBe("Custom")
  })

  it("keeps an explicit importer label", () => {
    expect(normalizeImportMaterialSource("2024 PHB")).toBe("2024 PHB")
    expect(normalizeImportMaterialSource("MCDM")).toBe("MCDM")
  })
})
