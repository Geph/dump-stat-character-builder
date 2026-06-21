import type { ImportContent } from "@/lib/import/content-schema"

export type ImportSourceHint = "pdf" | "text" | "clipboard"

export type MultipleClassImportBlock = {
  classNames: string[]
  message: string
}

export function importedClassNames(content: ImportContent): string[] {
  return (content.classes ?? [])
    .map((row) => String(row.name ?? "").trim())
    .filter(Boolean)
}

/** Block imports that contain more than one class (e.g. a whole class book). */
export function getMultipleClassImportBlock(
  content: ImportContent,
  source: ImportSourceHint = "text",
): MultipleClassImportBlock | null {
  const classNames = importedClassNames(content)
  if (classNames.length <= 1) return null

  return {
    classNames,
    message: multipleClassImportMessage(classNames, source),
  }
}

export function multipleClassImportMessage(
  classNames: string[],
  source: ImportSourceHint = "text",
): string {
  const list = classNames.join(", ")
  const count = classNames.length

  if (source === "pdf") {
    return (
      `This import contains ${count} classes (${list}). Import one class at a time — ` +
      `use the page range option to limit each pass to a single class section (e.g. pages 12–24 for one class).`
    )
  }

  return (
    `This import contains ${count} classes (${list}). Import one class at a time — ` +
    `split the document and paste or upload a single class per pass. For PDFs, use page ranges on the PDF tab.`
  )
}
