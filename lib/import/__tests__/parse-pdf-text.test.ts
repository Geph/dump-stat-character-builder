import { describe, expect, it } from "vitest"
import { extractTextFromPdfBuffer } from "@/lib/import/parse-pdf-text"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

describe("extractTextFromPdfBuffer", () => {
  it("rejects non-PDF buffers", async () => {
    await expect(extractTextFromPdfBuffer(Buffer.from("not a pdf"))).rejects.toThrow(/%PDF header/)
  })

  it("extracts text from the Alternate Fighter PDF when present", async () => {
    const pdfPath = resolve(
      process.cwd(),
      "../dump stat working files/Alternate Fighter 3.5.2.pdf",
    )
    let buffer: Buffer
    try {
      buffer = readFileSync(pdfPath)
    } catch {
      return
    }

    const parsed = await extractTextFromPdfBuffer(buffer)
    expect(parsed.totalPages).toBeGreaterThan(0)
    expect(parsed.text.toLowerCase()).toContain("fighter")
  })
})
