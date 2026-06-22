import { describe, expect, it } from "vitest"
import { getImportChunkSize, maxOutputTokensForImport } from "@/lib/import/import-ai-limits"

describe("import AI limits", () => {
  it("caps output tokens by content hint", () => {
    expect(maxOutputTokensForImport("classes")).toBe(4096)
    expect(maxOutputTokensForImport("spells")).toBe(8192)
    expect(maxOutputTokensForImport("all")).toBe(12_288)
  })

  it("defaults chunk size to 36000", () => {
    expect(getImportChunkSize()).toBe(36_000)
  })
})
