/**
 * Import size limits for BYO chatbots ($20/mo ChatGPT / Claude / Gemini)
 * and hosted PDF extraction.
 */

/** Spell PDF passes stay small enough for reliable extraction. */
export const SPELLS_PDF_MAX_PAGES = 15

/**
 * Soft ceiling for pasted source text aimed at Plus-tier chat UIs.
 * Leaves headroom under ~128k–200k context windows once the extraction
 * prompt (~system + schema + guidelines) is attached.
 */
export const PASTED_SOURCE_TEXT_MAX_CHARS = 100_000

export function maxPdfPagesForContentTypeHint(contentTypeHint?: string | null): number | null {
  const hint = contentTypeHint?.trim().toLowerCase()
  if (hint === "spells") return SPELLS_PDF_MAX_PAGES
  return null
}

export function pageCountInRange(first: number, last: number): number {
  return Math.max(0, last - first + 1)
}

export type PdfPageLimitError = {
  ok: false
  message: string
}

export type PdfPageLimitOk = { ok: true }

/** Validate selected / full PDF page span against content-type caps. */
export function validatePdfPageLimit(options: {
  contentTypeHint?: string | null
  /** Inclusive 1-based range when the user scoped pages; omit for full PDF. */
  pageRange?: { first: number; last: number } | null
  totalPages: number
}): PdfPageLimitOk | PdfPageLimitError {
  const maxPages = maxPdfPagesForContentTypeHint(options.contentTypeHint)
  if (maxPages == null) return { ok: true }

  if (options.pageRange) {
    const count = pageCountInRange(options.pageRange.first, options.pageRange.last)
    if (count > maxPages) {
      return {
        ok: false,
        message: `Spell imports are limited to ${maxPages} pages per pass. Your range covers ${count} pages (${options.pageRange.first}–${options.pageRange.last}). Narrow the range and try again.`,
      }
    }
    return { ok: true }
  }

  if (options.totalPages > maxPages) {
    return {
      ok: false,
      message: `Spell imports are limited to ${maxPages} pages per pass. This PDF has ${options.totalPages} pages — choose a page range of at most ${maxPages} pages.`,
    }
  }
  return { ok: true }
}

export function validatePastedSourceTextLength(
  text: string,
  maxChars = PASTED_SOURCE_TEXT_MAX_CHARS,
): { ok: true } | { ok: false; message: string; length: number; maxChars: number } {
  const length = text.length
  if (length <= maxChars) return { ok: true }
  return {
    ok: false,
    message: `Source text is ${length.toLocaleString()} characters (limit ${maxChars.toLocaleString()}). Trim it for Plus-tier ChatGPT, Claude, or Gemini — typically one class chapter or a short spell batch.`,
    length,
    maxChars,
  }
}

export function formatSourceTextCharCount(length: number, maxChars = PASTED_SOURCE_TEXT_MAX_CHARS): string {
  return `${length.toLocaleString()} / ${maxChars.toLocaleString()} characters`
}
