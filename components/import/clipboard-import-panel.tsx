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
} from "@/lib/import/byo-import-kit"
import {
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  Download,
  Info,
  Loader2,
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

  const extractionPrompt = useMemo(
    () => buildByoExtractionPrompt(contentType),
    [contentType],
  )

  const handleCopy = async (kind: "prompt" | "full") => {
    const text =
      kind === "prompt" ? extractionPrompt : buildByoFullPrompt(sourceText, contentType)
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
    <div className="space-y-6">
      <div className="rounded-xl border border-lime/25 bg-lime/5 p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Extract with your own LLM</p>
        <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
          <li>Paste or type the raw source text below (from a PDF, wiki, or document).</li>
          <li>Copy the extraction prompt and JSON template into ChatGPT, Claude, Gemini, or any LLM.</li>
          <li>Give the model your source text and ask it to return JSON only.</li>
          <li>Paste the model&apos;s JSON output into the box at the bottom and import.</li>
        </ol>
      </div>

      <ImportContentTypeHintSelect
        value={contentType}
        onChange={onContentTypeChange}
        focusRingClassName="focus:ring-lime"
      />

      <div className="space-y-2">
        <label htmlFor="import-material-source" className="text-sm font-medium text-foreground">
          Compendium source label
        </label>
        <input
          id="import-material-source"
          type="text"
          value={materialSource}
          onChange={(event) => onMaterialSourceChange(event.target.value)}
          placeholder="e.g. Gunslinger (Third Party), MCDM, Homebrew"
          className="w-full px-4 py-2.5 bg-muted rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-lime text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Stored on imported classes, spells, feats, and class resources so you can filter by book or homebrew name.
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

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">1. Source text</label>
        <textarea
          placeholder="Paste class features, spell text, species traits, or PDF-extracted text here..."
          value={sourceText}
          onChange={(event) => onSourceTextChange(event.target.value)}
          rows={7}
          className="w-full px-4 py-3 bg-muted rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-lime resize-y font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">{sourceText.length} characters</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleCopy("prompt")}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted/60"
        >
          {copied === "prompt" ? (
            <Check className="h-4 w-4 text-success" />
          ) : (
            <ClipboardCopy className="h-4 w-4" />
          )}
          Copy extraction prompt
        </button>
        <button
          type="button"
          onClick={() => handleCopy("full")}
          disabled={!sourceText.trim()}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted/60 disabled:opacity-50"
        >
          {copied === "full" ? (
            <Check className="h-4 w-4 text-success" />
          ) : (
            <ClipboardCopy className="h-4 w-4" />
          )}
          Copy prompt + source text
        </button>
        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted/60"
        >
          <Download className="h-4 w-4" />
          Download JSON template
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">2. LLM JSON output</label>
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
      </div>

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
                above — not the JSON output box.
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
