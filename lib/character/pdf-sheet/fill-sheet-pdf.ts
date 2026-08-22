import {
  buildPdfFieldIndex,
  DIRECT_FIELD_PREFIX,
  normalizePdfFieldName,
  resolveSheetField,
  type SheetFieldValues,
} from "./field-aliases"
import { matchSheetProfile, profileTargets } from "./sheet-profiles"

/**
 * Field appearances are regenerated with the standard Helvetica font, which can only
 * encode WinAnsi. Compendium text is full of typographic punctuation, so fold the
 * common offenders down to ASCII rather than letting pdf-lib throw mid-export.
 */
const CHARACTER_REPLACEMENTS: ReadonlyArray<[RegExp, string]> = [
  [/[\u2018\u2019\u201A\u2039\u203A]/g, "'"],
  [/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"'],
  [/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, "-"],
  [/[\u2022\u25CF\u00B7\u2027]/g, "*"],
  [/\u2026/g, "..."],
  [/[\u00A0\u2007\u202F]/g, " "],
  [/\u00D7/g, "x"],
  [/[\u2190-\u21FF\u2600-\u27BF\uFE0F]/g, ""],
]

export function sanitizePdfText(value: string): string {
  let out = value
  for (const [pattern, replacement] of CHARACTER_REPLACEMENTS) {
    out = out.replace(pattern, replacement)
  }
  // Drop anything still outside WinAnsi's printable range.
  return out.replace(/[^\x20-\x7E\xA1-\xFF\n\r\t]/g, "").trim()
}

export type FillSheetPdfOptions = {
  /** Bake the values into page content so readers cannot edit them. */
  flatten?: boolean
}

export type FillSheetPdfResult = {
  bytes: Uint8Array
  /** Canonical keys that landed on a field in this template. */
  filledKeys: string[]
  /** Canonical keys with a value that this template has no field for. */
  unmatchedKeys: string[]
  /** Layout profile used for sheets with meaningless field names, if any. */
  profileId: string | null
}

function coerceToBooleanValue(value: string | boolean): boolean {
  if (typeof value === "boolean") return value
  const text = value.trim().toLowerCase()
  return text !== "" && text !== "0" && text !== "false" && text !== "no"
}

function coerceToTextValue(value: string | boolean): string {
  if (typeof value === "boolean") return value ? "X" : ""
  return value
}

/**
 * Write canonical sheet values into a fillable PDF's AcroForm.
 *
 * pdf-lib is imported dynamically so the ~400kB library stays out of the sheet bundle
 * until someone actually exports.
 */
export async function fillSheetPdf(
  templateBytes: ArrayBuffer | Uint8Array,
  values: SheetFieldValues,
  options: FillSheetPdfOptions = {},
): Promise<FillSheetPdfResult> {
  const { PDFDocument, PDFCheckBox, PDFTextField, PDFDropdown } = await import("pdf-lib")

  const doc = await PDFDocument.load(templateBytes, { ignoreEncryption: true })
  const form = doc.getForm()
  const fields = form.getFields()
  type SheetField = (typeof fields)[number]

  const pages = doc.getPages()
  const pageIndexOf = (field: SheetField): number => {
    const widget = field.acroField.getWidgets()[0]
    if (!widget) return -1
    const pageRef = widget.P()
    return pages.findIndex((page) => page.ref === pageRef)
  }

  const fieldsByName = new Map<string, SheetField[]>()
  for (const field of fields) {
    const name = field.getName()
    const bucket = fieldsByName.get(name)
    if (bucket) bucket.push(field)
    else fieldsByName.set(name, [field])
  }

  const index = buildPdfFieldIndex([...fieldsByName.keys()])
  const profile = matchSheetProfile([...fieldsByName.keys()])
  const filledKeys: string[] = []
  const unmatchedKeys: string[] = []

  const targetsFor = (canonicalKey: string): SheetField[] => {
    if (profile) {
      const scoped = profileTargets(profile, canonicalKey).flatMap((target) =>
        (fieldsByName.get(target.name) ?? []).filter(
          (field) => target.page === undefined || pageIndexOf(field) === target.page,
        ),
      )
      if (scoped.length > 0) return scoped
    }
    return resolveSheetField(canonicalKey, index).flatMap(
      (name) => fieldsByName.get(name) ?? [],
    )
  }

  const written = new Set<SheetField>()

  for (const [canonicalKey, rawValue] of Object.entries(values)) {
    const isDirect = canonicalKey.startsWith(DIRECT_FIELD_PREFIX)
    const targets = targetsFor(canonicalKey).filter(
      (field) => !isDirect || !written.has(field),
    )
    if (targets.length === 0) {
      unmatchedKeys.push(canonicalKey)
      continue
    }

    let wrote = false
    for (const field of targets) {
      try {
        if (field instanceof PDFCheckBox) {
          if (coerceToBooleanValue(rawValue)) field.check()
          else field.uncheck()
          wrote = true
        } else if (field instanceof PDFTextField) {
          const text = sanitizePdfText(coerceToTextValue(rawValue))
          if (text.includes("\n") && !field.isMultiline()) field.enableMultiline()
          field.setText(text)
          wrote = true
        } else if (field instanceof PDFDropdown) {
          const text = sanitizePdfText(coerceToTextValue(rawValue))
          if (field.getOptions().includes(text)) {
            field.select(text)
            wrote = true
          }
        }
      } catch {
        // Read-only, comb-limited, or otherwise unwritable field: skip it rather
        // than failing the whole export.
      }
      written.add(field)
    }

    if (wrote) filledKeys.push(canonicalKey)
    else unmatchedKeys.push(canonicalKey)
  }

  if (options.flatten) {
    try {
      form.flatten()
    } catch {
      // Some sheets contain widgets pdf-lib cannot flatten; leave the form live.
    }
  }

  const bytes = await doc.save()
  return { bytes, filledKeys, unmatchedKeys, profileId: profile?.id ?? null }
}

/** Read a template's field names without filling it (used to score template quality). */
export async function readSheetPdfFieldNames(
  templateBytes: ArrayBuffer | Uint8Array,
): Promise<string[]> {
  const { PDFDocument } = await import("pdf-lib")
  const doc = await PDFDocument.load(templateBytes, { ignoreEncryption: true })
  return doc.getForm().getFields().map((field) => field.getName())
}

export { normalizePdfFieldName }
