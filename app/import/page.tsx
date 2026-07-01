"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ImportContentTypeHintSelect } from "@/components/import-content-type-hint-select"
import { ClipboardImportPanel } from "@/components/import/clipboard-import-panel"
import { ImportWorkflowGuidancePanel } from "@/components/import/import-workflow-guidance-panel"
import { ImportModifierReviewPanel } from "@/components/import/import-modifier-review-panel"
import { ImportReportPanel, ImportTokenSavingsSummary } from "@/components/import/import-report-panel"
import { ImportProposalPanel } from "@/components/import/import-proposal-panel"
import { ImportCollisionPanel } from "@/components/import/import-collision-panel"
import { ImportStagingPanel } from "@/components/import/import-staging-panel"
import {
  ImportAiSettings,
  importAiRequestBody,
  useImportAiSettings,
} from "@/components/import/import-ai-settings"
import { MainNav } from "@/components/main-nav"
import { SiteFooter } from "@/components/site-footer"
import {
  canUseServerImport,
  getStorageLabel,
  isStaticDeploy,
} from "@/lib/config/deploy-mode"
import { seedLocalSrd } from "@/lib/data/local-seed"
import {
  importDumpStatExportItemsLocal,
  parseDumpStatExportJson,
} from "@/lib/data/local-import"
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  ClipboardPaste,
  Info,
} from "lucide-react"
import type { ImportReport } from "@/lib/import/build-import-report"
import type { ImportTokenSavingsReport } from "@/lib/import/import-route-utils"
import type { ImportContent } from "@/lib/import/content-schema"
import type {
  ImportProposalSelections,
  ImportProposalSet,
} from "@/lib/import/import-proposals"
import {
  defaultRenameMap,
  type ImportCollision,
  type ImportRenameMap,
} from "@/lib/import/import-collisions"
import { FoundryImportGuidancePanel } from "@/components/import/foundry-import-guidance-panel"
import type { FoundryManifestInfo } from "@/lib/import/foundry-types"
import { readImportApiJson } from "@/lib/import/read-import-api-response"
import {
  collectImportModifierReview,
  removeImportModifierPreview,
} from "@/lib/import/import-modifier-previews"

type ImportStatus = "idle" | "uploading" | "processing" | "review" | "success" | "error"
type ImportTab = "clipboard" | "pdf" | "pack"

const SERVER_IMPORT_TABS: { id: ImportTab; label: string; icon: typeof ClipboardPaste }[] = [
  { id: "clipboard", label: "Clipboard", icon: ClipboardPaste },
  { id: "pdf", label: "PDF / JSON", icon: Upload },
]

const STATIC_IMPORT_TABS: { id: ImportTab; label: string; icon: typeof Upload }[] = [
  { id: "pack", label: "JSON pack", icon: Upload },
]

const IMPORT_TABS = canUseServerImport() ? SERVER_IMPORT_TABS : STATIC_IMPORT_TABS

export default function ImportPage() {
  const staticMode = isStaticDeploy()
  const [activeTab, setActiveTab] = useState<ImportTab>(staticMode ? "pack" : "clipboard")
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfContentType, setPdfContentType] = useState<"all" | "specific">("all")
  const [pdfContentTypeHint, setPdfContentTypeHint] = useState("all")
  const [pdfSpecificContent, setPdfSpecificContent] = useState("")
  const [pdfPageScope, setPdfPageScope] = useState<"all" | "range">("all")
  const [pdfPageStart, setPdfPageStart] = useState("")
  const [pdfPageEnd, setPdfPageEnd] = useState("")
  const [textContent, setTextContent] = useState("")
  const [jsonImportText, setJsonImportText] = useState("")
  const [textContentType, setTextContentType] = useState<string>("all")
  const [importMaterialSource, setImportMaterialSource] = useState("Custom")
  const [pdfStatus, setPdfStatus] = useState<ImportStatus>("idle")
  const [textStatus, setTextStatus] = useState<ImportStatus>("idle")
  const [seedStatus, setSeedStatus] = useState<ImportStatus>("idle")
  const [packStatus, setPackStatus] = useState<ImportStatus>("idle")
  const [packFile, setPackFile] = useState<File | null>(null)
  const [message, setMessage] = useState("")
  const [importReport, setImportReport] = useState<ImportReport | null>(null)
  const [pendingImport, setPendingImport] = useState<{
    content: ImportContent
    proposals: ImportProposalSet
    previewSummary: string
    source: "pdf" | "text"
    collisions: ImportCollision[]
    stages: ImportStage[]
    stagingSummary: string
    tokenSavings?: ImportTokenSavingsReport
    materialSource: string
  } | null>(null)
  const [renameMap, setRenameMap] = useState<ImportRenameMap>({})
  const [confirmingImport, setConfirmingImport] = useState(false)
  const [showAiInfo, setShowAiInfo] = useState(false)
  const [showSeedInfo, setShowSeedInfo] = useState(false)
  const [importAiSettings, setImportAiSettings] = useImportAiSettings()
  const [serverAiEnabled, setServerAiEnabled] = useState(false)
  const [foundryGuidance, setFoundryGuidance] = useState<{
    manifest?: FoundryManifestInfo | null
    skippedPayload?: {
      skipped?: { reason: string; count: number; examples: string[] }[]
      review?: { label: string; detail: string; documentName?: string }[]
    } | null
  } | null>(null)
  const reviewRef = useRef<HTMLDivElement>(null)
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!canUseServerImport()) return
    let cancelled = false
    fetch("/api/import/ai-config")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { configuredProviders?: string[] } | null) => {
        if (!cancelled && data) {
          setServerAiEnabled((data.configuredProviders?.length ?? 0) > 0)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const modifierReviewRows = useMemo(
    () => (pendingImport ? collectImportModifierReview(pendingImport.content) : []),
    [pendingImport],
  )

  useEffect(() => {
    if (!pendingImport) return
    reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [pendingImport])

  useEffect(() => {
    if (!importReport) return
    reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [importReport])

  const handleRemoveModifierPreview = (previewId: string) => {
    setPendingImport((current) =>
      current
        ? { ...current, content: removeImportModifierPreview(current.content, previewId) }
        : null,
    )
  }

  const clearPendingImport = () => {
    setPendingImport(null)
    setRenameMap({})
    setPdfStatus("idle")
    setTextStatus("idle")
  }

  const formatImportError = (data: {
    error?: string
    code?: string
    completedChunks?: number
    totalChunks?: number
    manifest?: FoundryManifestInfo
    foundry?: {
      skipped?: { reason: string; count: number; examples: string[] }[]
      review?: { label: string; detail: string; documentName?: string }[]
    }
  }) => {
    if (data.code === "foundry_manifest" && data.manifest) {
      setFoundryGuidance({ manifest: data.manifest })
    } else if (data.code === "foundry_no_importable" || data.code === "foundry_unsupported") {
      setFoundryGuidance({ skippedPayload: data.foundry ?? null })
    } else {
      setFoundryGuidance(null)
    }
    let message = data.error || "Import failed"
    if (data.completedChunks != null && data.totalChunks != null && data.totalChunks > 0) {
      message += ` (${data.completedChunks}/${data.totalChunks} sections completed before failure)`
    }
    if (data.code === "quota_exceeded" || data.code === "rate_limit") {
      message += " Try Clipboard → BYO JSON import, or a different server AI model."
    }
    return message
  }

  const applyImportSuccess = (
    data: {
      report?: ImportReport
      breakdown?: Record<string, number>
      count?: number
      pagesParsed?: { from?: number; to?: number; total?: number }
    },
    setStatus: (status: ImportStatus) => void,
  ) => {
    setStatus("success")
    setPendingImport(null)
    setImportReport(data.report ?? null)
    const breakdownText = data.breakdown
      ? Object.entries(data.breakdown)
          .filter(([, count]) => (count as number) > 0)
          .map(([type, count]) => `${count} ${type}`)
          .join(", ")
      : ""
    const pagesText = data.pagesParsed?.from
      ? ` (pages ${data.pagesParsed.from}–${data.pagesParsed.to} of ${data.pagesParsed.total})`
      : ""
    setMessage(
      data.report?.headline ??
        `Successfully imported ${data.count ?? 0} items${breakdownText ? `: ${breakdownText}` : ""}${pagesText}`,
    )
  }

  const handleConfirmImport = async (selections: ImportProposalSelections) => {
    if (!pendingImport) return

    setConfirmingImport(true)
    setMessage("")
    setImportReport(null)

    try {
      const response = await fetch("/api/import/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmImport: true,
          pendingContent: pendingImport.content,
          proposalSelections: selections,
          renameMap,
          materialSource: pendingImport.materialSource,
        }),
      })

      const parsed = await readImportApiJson(response)
      if (!parsed.ok) {
        if (pendingImport.source === "pdf") setPdfStatus("error")
        else setTextStatus("error")
        setMessage(parsed.message)
        return
      }
      const data = parsed.data

      if (response.ok) {
        if (pendingImport.source === "pdf") {
          applyImportSuccess(data, setPdfStatus)
        } else {
          applyImportSuccess(data, setTextStatus)
        }
      } else {
        if (pendingImport.source === "pdf") setPdfStatus("error")
        else setTextStatus("error")
        setMessage(formatImportError(data))
      }
    } catch (err) {
      if (pendingImport.source === "pdf") setPdfStatus("error")
      else setTextStatus("error")
      setMessage(err instanceof Error ? err.message : "Failed to complete import.")
    } finally {
      setConfirmingImport(false)
    }
  }

  const handlePdfUpload = async () => {
    if (!pdfFile) return

    setPdfStatus("uploading")
    setMessage("")
    setImportReport(null)
    setFoundryGuidance(null)
    setPendingImport(null)

    if (pdfPageScope === "range") {
      const start = parseInt(pdfPageStart, 10)
      const end = parseInt(pdfPageEnd, 10)
      if (!Number.isFinite(start) || !Number.isFinite(end)) {
        setPdfStatus("error")
        setMessage("Enter a valid start and end page number.")
        return
      }
      if (start < 1 || end < 1) {
        setPdfStatus("error")
        setMessage("Page numbers must be 1 or greater.")
        return
      }
      if (start > end) {
        setPdfStatus("error")
        setMessage("Start page must be less than or equal to end page.")
        return
      }
    }

    const formData = new FormData()
    formData.append("pdf", pdfFile)
    formData.append("contentType", pdfContentType)
    formData.append("contentTypeHint", pdfContentTypeHint)
    formData.append("pageScope", pdfPageScope)
    if (pdfPageScope === "range") {
      formData.append("pageStart", pdfPageStart)
      formData.append("pageEnd", pdfPageEnd)
    }
    if (pdfContentType === "specific" && pdfSpecificContent) {
      formData.append("specificContent", pdfSpecificContent)
    }
    const aiBody = importAiRequestBody(importAiSettings)
    if (aiBody.aiProvider) formData.append("aiProvider", aiBody.aiProvider)
    if (aiBody.aiModel) formData.append("aiModel", aiBody.aiModel)

    try {
      setPdfStatus("processing")
      const response = await fetch("/api/import/pdf", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        if (data.needsConfirmation) {
          setPdfStatus("review")
          const collisions = (data.collisions ?? []) as ImportCollision[]
          setRenameMap(defaultRenameMap(collisions))
          setPendingImport({
            content: data.pendingContent,
            proposals: data.proposals,
            previewSummary: data.previewSummary ?? "",
            source: "pdf",
            collisions,
            stages: (data.stages ?? []) as ImportStage[],
            stagingSummary: data.stagingSummary ?? "",
            tokenSavings: data.tokenSavings,
          })
          setMessage("Review this import before writing to the compendium.")
          return
        }
        applyImportSuccess(data, setPdfStatus)
      } else {
        setPdfStatus("error")
        setMessage(formatImportError(data))
      }
    } catch (err) {
      setPdfStatus("error")
      setMessage(err instanceof Error ? err.message : "Failed to upload file. Please try again.")
    }
  }

  const submitTextImport = async (payload: {
    text: string
    importMode?: "byo-json" | "server-ai"
  }) => {
    setTextStatus("processing")
    setMessage("")
    setImportReport(null)
    setFoundryGuidance(null)
    setPendingImport(null)

    try {
      const response = await fetch("/api/import/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: payload.text,
          contentType: textContentType,
          importMode: payload.importMode,
          materialSource: importMaterialSource,
          ...(payload.importMode === "server-ai" ? importAiRequestBody(importAiSettings) : {}),
        }),
      })

      const parsed = await readImportApiJson(response)
      if (!parsed.ok) {
        setTextStatus("error")
        setMessage(parsed.message)
        return
      }
      const data = parsed.data

      if (response.ok) {
        if (data.needsConfirmation) {
          setTextStatus("review")
          const collisions = (data.collisions ?? []) as ImportCollision[]
          setRenameMap(defaultRenameMap(collisions))
          setPendingImport({
            content: data.pendingContent as ImportContent,
            proposals: data.proposals as ImportProposalSet,
            previewSummary: (data.previewSummary as string) ?? "",
            source: "text",
            collisions,
            stages: (data.stages ?? []) as ImportStage[],
            stagingSummary: (data.stagingSummary as string) ?? "",
            tokenSavings: data.tokenSavings as ImportTokenSavingsReport | undefined,
            materialSource: importMaterialSource,
          })
          const warning = typeof data.warning === "string" ? data.warning : ""
          setMessage(
            warning
              ? `${warning} Review this import before writing to the compendium.`
              : "Review this import before writing to the compendium.",
          )
          return
        }
        applyImportSuccess(data, setTextStatus)
      } else {
        setTextStatus("error")
        setMessage(formatImportError(data))
      }
    } catch (err) {
      setTextStatus("error")
      setMessage(err instanceof Error ? err.message : "Failed to import text. Please try again.")
    }
  }

  const handleJsonImport = () => {
    if (!jsonImportText.trim()) return
    void submitTextImport({ text: jsonImportText, importMode: "byo-json" })
  }

  const handleServerAiImport = () => {
    if (!textContent.trim()) return
    void submitTextImport({ text: textContent, importMode: "server-ai" })
  }

  const handleSeedSRD = async () => {
    setSeedStatus("processing")
    setMessage("")

    try {
      if (staticMode) {
        const data = await seedLocalSrd()
        setSeedStatus("success")
        setMessage(
          `Loaded ${data.total} SRD items into ${getStorageLabel()}` +
            (data.breakdown
              ? ` (${Object.entries(data.breakdown)
                  .filter(([, n]) => (n as number) > 0)
                  .map(([k, n]) => `${n} ${k}`)
                  .join(", ")})`
              : ""),
        )
        return
      }

      const response = await fetch("/api/seed", {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        setSeedStatus("success")
        setMessage(
          `Successfully seeded ${data.total} SRD items` +
            (data.breakdown
              ? ` (${Object.entries(data.breakdown)
                  .filter(([, n]) => (n as number) > 0)
                  .map(([k, n]) => `${n} ${k}`)
                  .join(", ")})`
              : ""),
        )
      } else {
        setSeedStatus("error")
        setMessage(data.error || "Failed to seed database")
      }
    } catch (err) {
      setSeedStatus("error")
      setMessage(err instanceof Error ? err.message : "Failed to seed database. Please try again.")
    }
  }

  const handleJsonPackImport = async () => {
    if (!packFile) return
    setPackStatus("processing")
    setMessage("")

    try {
      const raw = await packFile.text()
      const items = parseDumpStatExportJson(raw)
      if (!items?.length) {
        setPackStatus("error")
        setMessage("Invalid Dump Stat JSON export file.")
        return
      }
      const data = await importDumpStatExportItemsLocal(items)
      setPackStatus("success")
      const breakdownText = Object.entries(data.breakdown)
        .filter(([, count]) => count > 0)
        .map(([type, count]) => `${count} ${type}`)
        .join(", ")
      setMessage(
        `Imported ${data.count} items${breakdownText ? `: ${breakdownText}` : ""} into ${getStorageLabel()}`,
      )
    } catch (err) {
      setPackStatus("error")
      setMessage(err instanceof Error ? err.message : "Failed to import JSON pack.")
    }
  }

  const getStatusIcon = (status: ImportStatus) => {
    switch (status) {
      case "processing":
      case "uploading":
        return <Loader2 className="w-5 h-5 animate-spin" />
      case "review":
        return <Info className="w-5 h-5 text-primary" />
      case "success":
        return <CheckCircle className="w-5 h-5 text-success" />
      case "error":
        return <AlertCircle className="w-5 h-5 text-destructive" />
      default:
        return null
    }
  }

  const isSuccessMessage =
    pdfStatus === "success" ||
    seedStatus === "success" ||
    textStatus === "success" ||
    packStatus === "success"

  const isReviewMessage = pdfStatus === "review" || textStatus === "review"

  const SRD_SEED_DESCRIPTION = staticMode
    ? "Load or reset the bundled SRD 5.2.1 into browser storage (IndexedDB). First visit auto-seeds; use this button to reload after clearing data."
    : "Populate your database with bundled SRD 5.2.1 content: 12 classes, 12 subclasses, 9 species, backgrounds, 340 spells, 17 feats, and 100+ equipment entries (parsed from the SRD, not a hand-picked sample)."

  return (
    <div id="import-root" className="min-h-screen bg-background">
      <MainNav />

      <main id="import-main" className="relative max-w-4xl mx-auto px-4 py-8">
        {/* SRD quickseed — upper right (in-flow on mobile, floating on sm+) */}
        <div className="flex justify-end mb-4 sm:mb-0 sm:absolute sm:top-8 sm:right-4 z-20">
          <div className="relative">
            <button
              type="button"
              onClick={handleSeedSRD}
              disabled={seedStatus === "processing"}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {getStatusIcon(seedStatus)}
              <span className="hidden sm:inline">
                {seedStatus === "processing"
                  ? "Seeding..."
                  : staticMode
                    ? "Load bundled SRD"
                    : "Seed SRD 5.2.1 Content"}
              </span>
              <span className="sm:hidden">
                {seedStatus === "processing" ? "Seeding..." : staticMode ? "Load SRD" : "Seed SRD"}
              </span>
            </button>
            <button
              type="button"
              aria-label="About SRD quickseed"
              aria-expanded={showSeedInfo}
              onClick={(e) => {
                e.stopPropagation()
                setShowSeedInfo((open) => !open)
              }}
              className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-primary/30 bg-background text-primary shadow-sm hover:bg-muted transition-colors"
            >
              <Info className="w-3 h-3" />
            </button>
            <AnimatePresence>
              {showSeedInfo && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full right-0 mt-2 w-72 sm:w-80 p-4 rounded-xl border border-primary/20 bg-card shadow-xl z-30"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-primary mb-1.5">
                    Quickseed
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{SRD_SEED_DESCRIPTION}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div id="import-header" className="mb-8 sm:pr-56">
          <h1 className="text-4xl font-black text-foreground mb-2">Import Content</h1>
          <p className="text-muted-foreground text-lg">
            {staticMode
              ? "Import Dump Stat JSON packs or reload the bundled SRD (data stays in your browser)."
              : "Add new content from PDFs or pasted text and JSON"}
          </p>
          {staticMode && (
            <p className="text-sm text-muted-foreground mt-2">
              Storage: {getStorageLabel()}. PDF and AI import require a hosted deployment with MySQL.
            </p>
          )}
        </div>

        <div className="mb-6">
          <ImportWorkflowGuidancePanel />
        </div>

        {foundryGuidance ? (
          <div className="mb-6">
            <FoundryImportGuidancePanel
              manifest={foundryGuidance.manifest}
              skippedPayload={foundryGuidance.skippedPayload ?? undefined}
            />
          </div>
        ) : null}

        {message && !importReport && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl mb-6 ${
              isSuccessMessage
                ? "bg-success/10 text-success border border-success/20"
                : isReviewMessage
                  ? "bg-primary/10 text-foreground border border-primary/20"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}
          >
            {message}
          </motion.div>
        )}

        {pendingImport && (
          <motion.div
            id="import-review"
            ref={reviewRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 scroll-mt-24 space-y-4"
          >
            {pendingImport.tokenSavings ? (
              <ImportTokenSavingsSummary savings={pendingImport.tokenSavings} />
            ) : null}
            {pendingImport.stagingSummary ? (
              <ImportStagingPanel
                stages={pendingImport.stages}
                summary={pendingImport.stagingSummary}
              />
            ) : null}
            <ImportCollisionPanel
              collisions={pendingImport.collisions}
              value={renameMap}
              onChange={setRenameMap}
            />
            <ImportModifierReviewPanel
              rows={modifierReviewRows}
              onRemoveModifier={handleRemoveModifierPreview}
              variant="review"
            />
            <ImportProposalPanel
              proposals={pendingImport.proposals}
              previewSummary={pendingImport.previewSummary}
              confirming={confirmingImport}
              onConfirm={handleConfirmImport}
              onCancel={clearPendingImport}
            />
          </motion.div>
        )}

        {importReport && (
          <motion.div
            id="import-report"
            ref={reportRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 scroll-mt-24"
          >
            <ImportReportPanel report={importReport} />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border-2 border-border overflow-hidden"
        >
          {/* Tab bar */}
          <div
            role="tablist"
            aria-label="Import source"
            className="flex gap-1 p-2 bg-muted/40 border-b border-border"
          >
            {IMPORT_TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                    isActive
                      ? "bg-background text-foreground shadow-sm border border-border/60"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {activeTab === "pack" && (
                <motion.div
                  key="pack"
                  role="tabpanel"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                >
                  <p className="text-muted-foreground mb-4">
                    Upload a Dump Stat JSON export (single item or bulk section export from the compendium).
                    Use compendium export buttons to share content packs between devices.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className="flex-1">
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={(e) => setPackFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <div className="flex items-center justify-center gap-2 px-4 py-3 bg-primary/10 border border-primary/20 rounded-xl cursor-pointer hover:bg-primary/15 transition-colors">
                        <Upload className="w-5 h-5 text-primary" />
                        <span className="font-medium truncate">
                          {packFile ? packFile.name : "Choose JSON pack..."}
                        </span>
                      </div>
                    </label>
                    <button
                      type="button"
                      onClick={handleJsonPackImport}
                      disabled={!packFile || packStatus === "processing"}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {getStatusIcon(packStatus)}
                      {packStatus === "processing" ? "Importing..." : "Import pack"}
                    </button>
                  </div>
                </motion.div>
              )}

              {canUseServerImport() && activeTab === "clipboard" && (
                <motion.div
                  key="clipboard"
                  role="tabpanel"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                >
                  <ClipboardImportPanel
                    contentType={textContentType}
                    onContentTypeChange={setTextContentType}
                    materialSource={importMaterialSource}
                    onMaterialSourceChange={setImportMaterialSource}
                    sourceText={textContent}
                    onSourceTextChange={setTextContent}
                    jsonText={jsonImportText}
                    onJsonTextChange={setJsonImportText}
                    status={textStatus}
                    serverAiEnabled={serverAiEnabled}
                    importAiSettings={importAiSettings}
                    onImportAiSettingsChange={setImportAiSettings}
                    onImportJson={handleJsonImport}
                    onServerAiImport={serverAiEnabled ? handleServerAiImport : undefined}
                  />
                </motion.div>
              )}

              {canUseServerImport() && activeTab === "pdf" && (
                <motion.div
                  key="pdf"
                  role="tabpanel"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-muted-foreground flex-1">
                      Upload a Dump Stat JSON export or a Foundry VTT dnd5e item export directly, or
                      extract text from a PDF when server AI is configured. For PDF homebrew without
                      server keys, use the Clipboard tab with your own LLM.
                    </p>
                    {serverAiEnabled ? (
                      <button
                        type="button"
                        onClick={() => setShowAiInfo(!showAiInfo)}
                        className="p-1.5 text-muted-foreground hover:text-orange transition-colors shrink-0"
                        title="How does server AI processing work?"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>

                  {!serverAiEnabled ? (
                    <div className="mb-4 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                      Server AI is not configured on this host. Upload{" "}
                      <code className="text-xs">.json</code> export files here, or use{" "}
                      <strong className="font-medium text-foreground">Clipboard</strong> to extract PDF
                      text elsewhere and paste structured JSON.
                    </div>
                  ) : null}

                  {serverAiEnabled && showAiInfo && (
                    <div className="mb-4 p-4 bg-orange/10 rounded-xl border border-orange/20">
                      <h3 className="font-bold text-orange mb-2">How AI Processing Works</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        PDF and text imports use an AI model (OpenAI, Anthropic, or Google Gemini) to
                        parse and structure D&D content. Set one API key on the server:{" "}
                        <code className="text-xs">OPENAI_API_KEY</code>,{" "}
                        <code className="text-xs">ANTHROPIC_API_KEY</code>, or{" "}
                        <code className="text-xs">GOOGLE_GENERATIVE_AI_API_KEY</code>.
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                        <li>Keys stay on the server — never in the browser</li>
                        <li>Optional: <code className="text-xs">IMPORT_AI_PROVIDER</code> (openai, anthropic, google)</li>
                        <li>GPT-4o mini is the recommended low-cost default; override via Import settings or <code className="text-xs">IMPORT_AI_MODEL</code></li>
                        <li>Extracts classes, species, spells, feats, equipment, and more</li>
                        <li>Understands D&D 2024 rules (species vs race, background bonuses)</li>
                        <li>Large PDFs are processed in multiple sections automatically (no 50k truncation)</li>
                        <li>Optionally import only a specific page range (e.g. pages 12–24)</li>
                      </ul>
                    </div>
                  )}

                  <div className="space-y-3">
                    {serverAiEnabled ? (
                      <ImportAiSettings value={importAiSettings} onChange={setImportAiSettings} />
                    ) : null}

                    <ImportContentTypeHintSelect
                      value={pdfContentTypeHint}
                      onChange={setPdfContentTypeHint}
                      focusRingClassName="focus:ring-orange"
                    />

                    <div className="flex flex-wrap gap-4 items-center">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="pdfContentType"
                          checked={pdfContentType === "all"}
                          onChange={() => setPdfContentType("all")}
                          className="w-4 h-4 accent-orange"
                        />
                        <span className="text-sm text-foreground">Extract all content</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="pdfContentType"
                          checked={pdfContentType === "specific"}
                          onChange={() => setPdfContentType("specific")}
                          className="w-4 h-4 accent-orange"
                        />
                        <span className="text-sm text-foreground">Specific content only</span>
                      </label>
                    </div>

                    {pdfContentType === "specific" && (
                      <input
                        type="text"
                        placeholder="e.g., Fighter class features, Fireball spell, Elf species..."
                        value={pdfSpecificContent}
                        onChange={(e) => setPdfSpecificContent(e.target.value)}
                        className="w-full px-4 py-2 bg-muted rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange text-sm"
                      />
                    )}

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-orange/80">Pages to import</p>
                      <div className="flex flex-wrap gap-4 items-center">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="pdfPageScope"
                            checked={pdfPageScope === "all"}
                            onChange={() => setPdfPageScope("all")}
                            className="w-4 h-4 accent-orange"
                          />
                          <span className="text-sm text-foreground">All pages</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="pdfPageScope"
                            checked={pdfPageScope === "range"}
                            onChange={() => setPdfPageScope("range")}
                            className="w-4 h-4 accent-orange"
                          />
                          <span className="text-sm text-foreground">Page range</span>
                        </label>
                      </div>
                      {pdfPageScope === "range" && (
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-2 text-sm text-foreground">
                            From
                            <input
                              type="number"
                              min={1}
                              placeholder="1"
                              value={pdfPageStart}
                              onChange={(e) => setPdfPageStart(e.target.value)}
                              className="w-24 px-3 py-2 bg-muted rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-orange"
                            />
                          </label>
                          <label className="flex items-center gap-2 text-sm text-foreground">
                            To
                            <input
                              type="number"
                              min={1}
                              placeholder="10"
                              value={pdfPageEnd}
                              onChange={(e) => setPdfPageEnd(e.target.value)}
                              className="w-24 px-3 py-2 bg-muted rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-orange"
                            />
                          </label>
                          <span className="text-xs text-muted-foreground">1-based page numbers</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <label className="flex-1">
                        <input
                          type="file"
                          accept=".pdf,.json,application/json"
                          onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <div className="flex items-center justify-center gap-2 px-4 py-3 bg-orange/10 border border-orange/20 rounded-xl cursor-pointer hover:bg-orange/15 transition-colors">
                          <FileText className="w-5 h-5 text-orange" />
                          <span className="font-medium truncate">
                            {pdfFile ? pdfFile.name : "Choose PDF or JSON file..."}
                          </span>
                        </div>
                      </label>
                      <button
                        type="button"
                        onClick={handlePdfUpload}
                        disabled={
                          !pdfFile ||
                          pdfStatus === "processing" ||
                          pdfStatus === "uploading" ||
                          (pdfPageScope === "range" && (!pdfPageStart.trim() || !pdfPageEnd.trim()))
                        }
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-orange text-orange-foreground rounded-xl font-bold hover:bg-orange/90 transition-all glow-orange disabled:opacity-50"
                      >
                        {getStatusIcon(pdfStatus)}
                        {pdfStatus === "processing" ? "Processing..." : "Import"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </motion.div>
      </main>
      <SiteFooter />
    </div>
  )
}
