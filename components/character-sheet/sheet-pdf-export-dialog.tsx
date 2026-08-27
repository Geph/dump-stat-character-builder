"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Download, ExternalLink, FileText, Loader2, Trash2, Upload } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { SheetPdfCharacterInput } from "@/lib/character/pdf-sheet/sheet-field-values"
import {
  selectSheetTemplate,
  type SheetTemplateTarget,
} from "@/lib/character/pdf-sheet/template-matching"
import {
  deleteSheetTemplate,
  importSheetTemplate,
  listSheetTemplates,
  SheetTemplateError,
  type SheetTemplateSummary,
} from "@/lib/character/pdf-sheet/template-store"

const KIND_LABEL: Record<SheetTemplateSummary["kind"], string> = {
  class: "Class sheet",
  martial: "Martial sheet",
  caster: "Caster sheet",
  "half-caster": "Half-caster sheet",
  back: "Back page",
  addon: "Add-on page",
  general: "General sheet",
}

export type SheetPdfExportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Built lazily by the sheet so we do not recompute spell/feature lists on every render. */
  buildInput: () => SheetPdfCharacterInput | null
  target: SheetTemplateTarget
  /** Compendium class names, used to tag imported templates by class. */
  knownClassNames: readonly string[]
  /** Offer the publisher's downloadable sheets for Mage Hand Press classes. */
  showMageHandPressSheetsLink?: boolean
  /** Plain-text PDF used when the user has not imported any templates. */
  onExportPlainPdf: () => void
}

export function SheetPdfExportDialog({
  open,
  onOpenChange,
  buildInput,
  target,
  knownClassNames,
  showMageHandPressSheetsLink = false,
  onExportPlainPdf,
}: SheetPdfExportDialogProps) {
  const [templates, setTemplates] = useState<SheetTemplateSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [flatten, setFlatten] = useState(false)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await listSheetTemplates()
      setTemplates(rows)
      setError(null)
      return rows
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read saved sheet templates.")
      return [] as SheetTemplateSummary[]
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setStatus(null)
    void refresh().then((rows) => {
      setSelectedId((current) => {
        if (current && rows.some((row) => row.id === current)) return current
        return selectSheetTemplate(rows, target)?.id ?? null
      })
    })
  }, [open, refresh, target])

  const suggestedId = useMemo(
    () => selectSheetTemplate(templates, target)?.id ?? null,
    [templates, target],
  )

  const handleImport = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    setError(null)
    const failures: string[] = []
    for (const file of Array.from(files)) {
      try {
        await importSheetTemplate(file, knownClassNames)
      } catch (err) {
        failures.push(
          err instanceof SheetTemplateError
            ? err.message
            : `${file.name} could not be imported.`,
        )
      }
    }
    const rows = await refresh()
    setSelectedId((current) =>
      current && rows.some((row) => row.id === current)
        ? current
        : (selectSheetTemplate(rows, target)?.id ?? null),
    )
    setError(failures.join(" ") || null)
    setBusy(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleDelete = async (id: string) => {
    setBusy(true)
    await deleteSheetTemplate(id)
    const rows = await refresh()
    setSelectedId((current) =>
      current === id ? (selectSheetTemplate(rows, target)?.id ?? null) : current,
    )
    setBusy(false)
  }

  const handleExport = async () => {
    if (!selectedId) return
    const input = buildInput()
    if (!input) return
    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      const { exportCharacterSheetPdf } = await import("@/lib/character/pdf-sheet/export-sheet-pdf")
      const result = await exportCharacterSheetPdf({
        templateId: selectedId,
        input,
        flatten,
      })
      setStatus(`Filled ${result.filledKeys.length} fields.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Filling that sheet failed.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Export to a character sheet PDF</DialogTitle>
          <DialogDescription>
            Import the fillable sheets you already own — class-specific, generic, or the
            2024 PHB sheet — and they stay on this device. Fields are matched by name, so
            most fillable sheets work.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />
              Add sheet PDFs
            </button>
            {showMageHandPressSheetsLink ? (
              <a
                href="https://magehandpress.com/category/other/character-sheets/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
              >
                <ExternalLink className="h-4 w-4" />
                Download Mage Hand Press sheets
              </a>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              className="hidden"
              onChange={(event) => void handleImport(event.target.files)}
            />
            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={flatten}
                onChange={(event) => setFlatten(event.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Flatten (not editable after export)
            </label>
          </div>

          <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-lg border border-border p-2">
            {loading ? (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">Loading…</p>
            ) : templates.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                No sheet templates yet. Add one or more fillable PDFs to get started.
              </p>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  className={`flex items-center gap-2 rounded-lg border-2 p-2 text-left transition-colors ${
                    selectedId === template.id
                      ? "border-secondary bg-secondary/10"
                      : "border-transparent hover:bg-muted"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(template.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-medium">{template.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {KIND_LABEL[template.kind]}
                      {template.classNames.length ? ` · ${template.classNames.join(", ")}` : ""}
                      {` · ${template.mappableFieldCount} mappable fields`}
                      {template.id === suggestedId ? " · best match" : ""}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(template.id)}
                    disabled={busy}
                    title={`Remove ${template.fileName}`}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => {
              onExportPlainPdf()
              onOpenChange(false)
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            <FileText className="h-4 w-4" />
            Plain summary PDF
          </button>
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={!selectedId || busy}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Fill &amp; download
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
