import { describe, expect, it } from "vitest"
import {
  PASTED_SOURCE_TEXT_MAX_CHARS,
  SPELLS_PDF_MAX_PAGES,
  formatSourceTextCharCount,
  maxPdfPagesForContentTypeHint,
  pageCountInRange,
  validatePdfPageLimit,
  validatePastedSourceTextLength,
} from "@/lib/import/import-source-limits"

describe("import-source-limits", () => {
  it("caps spell PDF imports at 15 pages", () => {
    expect(maxPdfPagesForContentTypeHint("spells")).toBe(SPELLS_PDF_MAX_PAGES)
    expect(maxPdfPagesForContentTypeHint("classes")).toBeNull()
    expect(pageCountInRange(3, 17)).toBe(15)
  })

  it("rejects spell PDFs or ranges larger than the cap", () => {
    expect(
      validatePdfPageLimit({ contentTypeHint: "spells", totalPages: 40 }),
    ).toMatchObject({ ok: false })
    expect(
      validatePdfPageLimit({
        contentTypeHint: "spells",
        totalPages: 40,
        pageRange: { first: 1, last: 16 },
      }),
    ).toMatchObject({ ok: false })
    expect(
      validatePdfPageLimit({
        contentTypeHint: "spells",
        totalPages: 40,
        pageRange: { first: 10, last: 24 },
      }),
    ).toMatchObject({ ok: true })
    expect(
      validatePdfPageLimit({ contentTypeHint: "spells", totalPages: 12 }),
    ).toMatchObject({ ok: true })
  })

  it("caps pasted source text for Plus-tier chatbots", () => {
    expect(validatePastedSourceTextLength("short")).toMatchObject({ ok: true })
    const over = "x".repeat(PASTED_SOURCE_TEXT_MAX_CHARS + 1)
    expect(validatePastedSourceTextLength(over)).toMatchObject({
      ok: false,
      maxChars: PASTED_SOURCE_TEXT_MAX_CHARS,
    })
    expect(formatSourceTextCharCount(12_345)).toContain("12,345")
  })
})
