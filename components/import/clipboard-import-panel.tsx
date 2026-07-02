"use client"

import { useMemo, useState } from "react"
import { ImportContentTypeHintSelect } from "@/components/import-content-type-hint-select"
import { ImportAiSettings, type ImportAiSettingsValue } from "@/components/import/import-ai-settings"
import {
  buildByoExtractionPrompt,
  buildByoFullPrompt,
  CLEAN_SOURCE_TEXT_GUIDELINES,
  downloadTemplateFilename,
  templateJsonString,
  type ByoPdfPageScope,
} from "@/lib/import/byo-import-kit"
import {
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  Download,
  FileText,
  Info,
  Loader2,
  Type,
} from "lucide-react"

type ClipboardImportPanelProps = {
  contentType: string
  onContentTypeChange: (value: string) => void
  materialSource: string
  onMaterialSourceChange: (value: string) => void
  sourceText: string
  onSourceTextChange: (value: string) => void
  jsonText: string
  onJsonTextChange: (value: string) => void
  status: "idle" | "processing" | "review" | "success" | "error"
  serverAiEnabled: boolean
  importAiSettings: ImportAiSettingsValue
  onImportAiSettingsChange: (value: ImportAiSettingsValue) => void
  onImportJson: () => void
  onServerAiImport?: () => void
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function ClipboardImportPanel({
  contentType,
  onContentTypeChange,
  materialSource,
  onMaterialSourceChange,
  sourceText,
  onSourceTextChange,
  jsonText,
  onJsonTextChange,
  status,
  serverAiEnabled,
  importAiSettings,
  onImportAiSettingsChange,
  onImportJson,
  onServerAiImport,
}: ClipboardImportPanelProps) {
  const [showGuidelines, setShowGuidelines] = useState(false)
  const [showServerAi, setShowServerAi] = useState(false)
  const [copied, setCopied] = useState<"prompt" | "full" | null>(null)
  const [pdfPageScope, setPdfPageScope] = useState<"all" | "range">("all")
  const [pdfPageStart, setPdfPageStart] = useState("")
  const [pdfPageEnd, setPdfPageEnd] = useState("")

  const pdfPageScopeForPrompt = useMemo((): ByoPdfPageScope => {
    if (pdfPageScope !== "range") return { mode: "all" }
    const start = parseInt(pdfPageStart, 10)
    const end = parseInt(pdfPageEnd, 10)
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 1 || end < start) {
      return { mode: "all" }
    }
    return { mode: "range", start, end }
  }, [pdfPageScope, pdfPageStart, pdfPageEnd])

  const pdfExtractionPrompt = useMemo(
    () =>
      buildByoExtractionPrompt(contentType, {
        pdfUpload: true,
        pageScope: pdfPageScopeForPrompt,
      }),
    [contentType, pdfPageScopeForPrompt],
  )

  const handleCopy = async (kind: "prompt" | "full") => {
    const text =
      kind === "prompt" ? pdfExtractionPrompt : buildByoFullPrompt(sourceText, contentType)
    const ok = await copyText(text)
    if (ok) {
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 2000)
    }
  }

  const handleDownloadTemplate = () => {
    const blob = new Blob([templateJsonString(contentType)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = downloadTemplateFilename(contentType)
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const isProcessing = status === "processing"

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <ImportContentTypeHintSelect
            value={contentType}
            onChange={onContentTypeChange}
            focusRingClassName="focus:ring-lime"
          />
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
            <label
              htmlFor="import-material-source"
              className="text-sm font-medium text-muted-foreground shrink-0"
            >
              Compendium source label:
            </label>
            <input
              id="import-material-source"
              type="text"
              value={materialSource}
              onChange={(event) => onMaterialSourceChange(event.target.value)}
              placeholder="e.g. Gunslinger (Third Party), MCDM, Homebrew"
              className="flex-1 min-w-[160px] px-3 py-1.5 bg-muted rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-lime text-sm"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Source label is stored on imported entries so you can filter by book or homebrew name.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-muted/30">
        <button
          type="button"
          onClick={() => setShowGuidelines((open) => !open)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-foreground"
        >
          <span className="flex items-center gap-2">
            <Info className="h-4 w-4 text-lime" />
            Clean source text guidelines (PDF &amp; paste)
          </span>
          {showGuidelines ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </button>
        {showGuidelines ? (
          <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {CLEAN_SOURCE_TEXT_GUIDELINES}
          </div>
        ) : null}
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Step 1 — Extract with your LLM</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose one path below. Both produce the same JSON format for Step 2.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border-2 border-border bg-card p-4 space-y-4 flex flex-col">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-lime/10 p-2 shrink-0">
                <FileText className="h-5 w-5 text-lime" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Option A
                </p>
                <h3 className="text-sm font-semibold text-foreground">PDF upload</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Copy the extraction prompt, attach your PDF in ChatGPT, Claude, Gemini, or any LLM,
                  and ask for JSON only.
                </p>
              </div>
            </div>

            <div className="space-y-2 flex-1">
              <p className="text-xs font-medium text-foreground">Pages to extract</p>
              <div className="flex flex-wrap gap-4 items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="byoPdfPageScope"
                    checked={pdfPageScope === "all"}
                    onChange={() => setPdfPageScope("all")}
                    className="w-4 h-4 accent-lime"
                  />
                  <span className="text-sm text-foreground">All pages</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="byoPdfPageScope"
                    checked={pdfPageScope === "range"}
                    onChange={() => setPdfPageScope("range")}
                    className="w-4 h-4 accent-lime"
                  />
                  <span className="text-sm text-foreground">Page range</span>
                </label>
              </div>
              {pdfPageScope === "range" ? (
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    From
                    <input
                      type="number"
                      min={1}
                      placeholder="1"
                      value={pdfPageStart}
                      onChange={(event) => setPdfPageStart(event.target.value)}
                      className="w-20 px-2 py-1.5 bg-muted rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-lime text-sm"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    To
                    <input
                      type="number"
                      min={1}
                      placeholder="10"
                      value={pdfPageEnd}
                      onChange={(event) => setPdfPageEnd(event.target.value)}
                      className="w-20 px-2 py-1.5 bg-muted rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-lime text-sm"
                    />
                  </label>
                  <span className="text-xs text-muted-foreground">1-based</span>
                </div>
              ) : null}
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Page scope and <span className="font-mono">source_page</span> tagging instructions
                are included in the copied prompt.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleCopy("prompt")}
              disabled={pdfPageScope === "range" && (!pdfPageStart.trim() || !pdfPageEnd.trim())}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-lime/30 bg-lime/10 px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-lime/15 disabled:opacity-50"
            >
              {copied === "prompt" ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <ClipboardCopy className="h-4 w-4" />
              )}
              Copy extraction prompt for PDF upload
            </button>
          </div>

          <div className="rounded-xl border-2 border-border bg-card p-4 space-y-4 flex flex-col">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-lime/10 p-2 shrink-0">
                <Type className="h-5 w-5 text-lime" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Option B
                </p>
                <h3 className="text-sm font-semibold text-foreground">Pasted source text</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Paste raw text from a PDF copy, website, wiki, or other document — then copy the
                  combined prompt and text into your LLM.
                </p>
              </div>
            </div>

            <div className="space-y-2 flex-1">
              <label htmlFor="byo-source-text" className="text-xs font-medium text-foreground">
                Source text
              </label>
              <textarea
                id="byo-source-text"
                placeholder="Paste class features, spell text, species traits, or PDF-extracted text here..."
                value={sourceText}
                onChange={(event) => onSourceTextChange(event.target.value)}
                rows={6}
                className="w-full px-3 py-2.5 bg-muted rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-lime resize-y font-mono text-sm min-h-[140px]"
              />
              <p className="text-[11px] text-muted-foreground">{sourceText.length} characters</p>
            </div>

            <button
              type="button"
              onClick={() => handleCopy("full")}
              disabled={!sourceText.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-lime/30 bg-lime/10 px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-lime/15 disabled:opacity-50"
            >
              {copied === "full" ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <ClipboardCopy className="h-4 w-4" />
              )}
              Copy prompt + source text
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Option C
            </p>
            <p className="text-sm text-foreground mt-0.5">
              Skip the LLM — download the JSON template and fill it in by hand.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted/60 shrink-0"
          >
            <Download className="h-4 w-4" />
            Download JSON template
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border-2 border-lime/20 bg-lime/[0.03] p-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Step 2 — Import JSON</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Paste the JSON your LLM returned (or your hand-filled template) and import. For
            multi-file homebrew, paste a JSON array in dependency order — see the import order
            guide at the top of this page.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Also accepts{" "}
            <a
              href="https://github.com/foundryvtt/dnd5e"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-lime underline underline-offset-2 hover:text-lime/80"
            >
              Foundry VTT dnd5e
            </a>{" "}
            item exports — paste a single item, an array, or a compendium dump (spells, feats,
            equipment, classes, subclasses, species, backgrounds) and it&apos;s detected
            automatically.
          </p>
        </div>
        <textarea
          placeholder='Paste the model JSON here, e.g. { "classes": [ ... ] }'
          value={jsonText}
          onChange={(event) => onJsonTextChange(event.target.value)}
          rows={8}
          className="w-full px-4 py-3 bg-muted rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-lime resize-y font-mono text-sm"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onImportJson}
            disabled={!jsonText.trim() || isProcessing}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-lime text-lime-foreground rounded-xl font-bold hover:bg-lime/90 transition-colors disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {isProcessing ? "Importing..." : "Import JSON"}
          </button>
        </div>
      </section>

      {serverAiEnabled && onServerAiImport ? (
        <div className="rounded-xl border border-border/80 bg-muted/20">
          <button
            type="button"
            onClick={() => setShowServerAi((open) => !open)}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-muted-foreground"
          >
            <span>Optional: server AI extraction</span>
            {showServerAi ? (
              <ChevronUp className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0" />
            )}
          </button>
          {showServerAi ? (
            <div className="space-y-3 border-t border-border px-4 py-4">
              <p className="text-xs text-muted-foreground">
                Runs extraction on the server using the host&apos;s API key. Uses the source text
                from Option B above — not the JSON output box.
              </p>
              <ImportAiSettings value={importAiSettings} onChange={onImportAiSettingsChange} />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onServerAiImport}
                  disabled={!sourceText.trim() || isProcessing}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-orange/30 bg-orange/10 text-orange font-semibold text-sm hover:bg-orange/15 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isProcessing ? "Processing..." : "Import with server AI"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
