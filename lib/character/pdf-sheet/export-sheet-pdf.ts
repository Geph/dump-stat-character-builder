import { fillSheetPdf, type FillSheetPdfResult } from "./fill-sheet-pdf"
import { buildSheetFieldValues, type SheetPdfCharacterInput } from "./sheet-field-values"
import { getSheetTemplateBytes } from "./template-store"

export function sheetPdfFileName(characterName: string): string {
  const slug = characterName.trim().replace(/\s+/g, "-").toLowerCase() || "character"
  return `${slug}-sheet.pdf`
}

export function downloadPdfBytes(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export type ExportSheetPdfOptions = {
  templateId: string
  input: SheetPdfCharacterInput
  flatten?: boolean
  /** Skip the browser download and just return the bytes (used by tests). */
  download?: boolean
}

/** Fill one of the user's imported sheet templates with a character and download it. */
export async function exportCharacterSheetPdf({
  templateId,
  input,
  flatten,
  download = true,
}: ExportSheetPdfOptions): Promise<FillSheetPdfResult> {
  const templateBytes = await getSheetTemplateBytes(templateId)
  if (!templateBytes) {
    throw new Error("That sheet template is no longer stored on this device.")
  }

  const values = buildSheetFieldValues(input)
  const result = await fillSheetPdf(templateBytes, values, { flatten })
  if (download) downloadPdfBytes(result.bytes, sheetPdfFileName(input.name))
  return result
}
