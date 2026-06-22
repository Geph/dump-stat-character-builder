export type PageRange = { first: number; last: number }

export type ParsedPdfText = {
  text: string
  totalPages: number
}

function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "%PDF"
}

/** Extract plain text from a PDF buffer (Node.js server only). */
export async function extractTextFromPdfBuffer(
  buffer: Buffer,
  pageRange?: PageRange | null,
): Promise<ParsedPdfText> {
  if (!buffer.length) {
    throw new Error("The uploaded file is empty.")
  }
  if (!isPdfBuffer(buffer)) {
    throw new Error("The file does not look like a PDF (missing %PDF header).")
  }

  const { PDFParse } = await import("pdf-parse")
  const parser = new PDFParse({ data: buffer })
  try {
    const parseParams = pageRange ? { first: pageRange.first, last: pageRange.last } : undefined
    const result = await parser.getText(parseParams)
    return { text: result.text, totalPages: result.total }
  } finally {
    await parser.destroy()
  }
}

export function parseImportPageRange(
  pageStart: string | null,
  pageEnd: string | null,
): PageRange | null {
  if (!pageStart?.trim() && !pageEnd?.trim()) return null
  const first = parseInt(pageStart?.trim() || "", 10)
  const last = parseInt(pageEnd?.trim() || "", 10)
  if (!Number.isFinite(first) || !Number.isFinite(last)) {
    throw new Error("Page range requires valid start and end page numbers.")
  }
  if (first < 1 || last < 1) {
    throw new Error("Page numbers must be 1 or greater.")
  }
  if (first > last) {
    throw new Error("Start page must be less than or equal to end page.")
  }
  return { first, last }
}
