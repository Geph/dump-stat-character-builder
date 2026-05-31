"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ImportContentTypeHintSelect } from "@/components/import-content-type-hint-select"
import { MainNav } from "@/components/main-nav"
import { Upload, Globe, FileText, CheckCircle, AlertCircle, Loader2, ClipboardPaste, Info } from "lucide-react"

type ImportStatus = "idle" | "uploading" | "processing" | "success" | "error"

export default function ImportPage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfContentType, setPdfContentType] = useState<"all" | "specific">("all")
  const [pdfContentTypeHint, setPdfContentTypeHint] = useState("all")
  const [pdfSpecificContent, setPdfSpecificContent] = useState("")
  const [pdfPageScope, setPdfPageScope] = useState<"all" | "range">("all")
  const [pdfPageStart, setPdfPageStart] = useState("")
  const [pdfPageEnd, setPdfPageEnd] = useState("")
  const [webUrl, setWebUrl] = useState("")
  const [webContentType, setWebContentType] = useState("all")
  const [textContent, setTextContent] = useState("")
  const [textContentType, setTextContentType] = useState<string>("all")
  const [pdfStatus, setPdfStatus] = useState<ImportStatus>("idle")
  const [webStatus, setWebStatus] = useState<ImportStatus>("idle")
  const [textStatus, setTextStatus] = useState<ImportStatus>("idle")
  const [seedStatus, setSeedStatus] = useState<ImportStatus>("idle")
  const [message, setMessage] = useState("")
  const [showAiInfo, setShowAiInfo] = useState(false)

  const handlePdfUpload = async () => {
    if (!pdfFile) return

    setPdfStatus("uploading")
    setMessage("")

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

    try {
      setPdfStatus("processing")
      const response = await fetch("/api/import/pdf", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setPdfStatus("success")
        const breakdownText = data.breakdown 
          ? Object.entries(data.breakdown)
              .filter(([, count]) => (count as number) > 0)
              .map(([type, count]) => `${count} ${type}`)
              .join(", ")
          : ""
        const pagesText = data.pagesParsed?.from
          ? ` (pages ${data.pagesParsed.from}–${data.pagesParsed.to} of ${data.pagesParsed.total})`
          : ""
        setMessage(`Successfully imported ${data.count} items${breakdownText ? `: ${breakdownText}` : ""}${pagesText}`)
      } else {
        setPdfStatus("error")
        setMessage(data.error || "Failed to import file")
      }
    } catch (err) {
      setPdfStatus("error")
      setMessage(err instanceof Error ? err.message : "Failed to upload file. Please try again.")
    }
  }

  const handleTextImport = async () => {
    if (!textContent.trim()) return

    setTextStatus("processing")
    setMessage("")

    try {
      const response = await fetch("/api/import/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: textContent,
          contentType: textContentType
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setTextStatus("success")
        const breakdownText = data.breakdown 
          ? Object.entries(data.breakdown)
              .filter(([, count]) => (count as number) > 0)
              .map(([type, count]) => `${count} ${type}`)
              .join(", ")
          : ""
        setMessage(`Successfully imported ${data.count} items${breakdownText ? `: ${breakdownText}` : ""}`)
      } else {
        setTextStatus("error")
        setMessage(data.error || "Failed to import text")
      }
    } catch (err) {
      setTextStatus("error")
      setMessage(err instanceof Error ? err.message : "Failed to import text. Please try again.")
    }
  }

  const handleWebImport = async () => {
    if (!webUrl) return

    setWebStatus("processing")
    setMessage("")

    try {
      const response = await fetch("/api/import/web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webUrl, contentType: webContentType }),
      })

      const data = await response.json()

      if (response.ok) {
        setWebStatus("success")
        setMessage(`Successfully imported ${data.count} items from ${data.source}`)
      } else {
        setWebStatus("error")
        setMessage(data.error || "Failed to import from web")
      }
    } catch (err) {
      setWebStatus("error")
      setMessage(err instanceof Error ? err.message : "Failed to import from web. Please try again.")
    }
  }

  const handleSeedSRD = async () => {
    setSeedStatus("processing")
    setMessage("")

    try {
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

  const getStatusIcon = (status: ImportStatus) => {
    switch (status) {
      case "processing":
      case "uploading":
        return <Loader2 className="w-5 h-5 animate-spin" />
      case "success":
        return <CheckCircle className="w-5 h-5 text-success" />
      case "error":
        return <AlertCircle className="w-5 h-5 text-destructive" />
      default:
        return null
    }
  }

  return (
    <div id="import-root" className="min-h-screen bg-background">
      <MainNav />
      
      <main id="import-main" className="max-w-4xl mx-auto px-4 py-8">
        <div id="import-header" className="mb-8">
          <h1 className="text-4xl font-black text-foreground mb-2">Import Content</h1>
          <p className="text-muted-foreground text-lg">
            Add new content from PDFs, copied text, or online sources
          </p>
        </div>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl mb-6 ${
              pdfStatus === "success" || webStatus === "success" || seedStatus === "success" || textStatus === "success"
                ? "bg-success/10 text-success border border-success/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}
          >
            {message}
          </motion.div>
        )}

        <div className="grid gap-6">
          {/* Seed SRD Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-6 border-2 border-primary/20"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center shrink-0">
                <FileText className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground mb-2">
                  Quick Start: Seed D&D 5.5e SRD Content
                </h2>
                <p className="text-muted-foreground mb-4">
                  Populate your database with the full official SRD 5.2.1: 12 classes, 12 subclasses,
                  9 species, backgrounds, 340 spells, 17 feats, and 100+ equipment entries
                  (parsed from the SRD, not a hand-picked sample).
                </p>
                <button
                  onClick={handleSeedSRD}
                  disabled={seedStatus === "processing"}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {getStatusIcon(seedStatus)}
                  {seedStatus === "processing" ? "Seeding..." : "Seed D&D 5.5e SRD Content"}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Text Import (Paste) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-card rounded-2xl p-6 border-2 border-border"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-lime/20 rounded-xl flex items-center justify-center shrink-0">
                <ClipboardPaste className="w-7 h-7 text-lime" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground mb-2">Import from Copied Text</h2>
                <p className="text-muted-foreground mb-4">
                  Paste D&D content text (class details, spells, species, etc.) and AI will extract structured data.
                  You can also paste a Dump Stat JSON export to import directly without AI.
                </p>
                
                <div className="space-y-3">
                  <ImportContentTypeHintSelect
                    value={textContentType}
                    onChange={setTextContentType}
                    focusRingClassName="focus:ring-lime"
                  />
                  
                  <textarea
                    placeholder="Paste D&D content here (class features, spell descriptions, species traits, etc.)..."
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-3 bg-muted rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-lime resize-y font-mono text-sm"
                  />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {textContent.length} characters
                    </span>
                    <button
                      onClick={handleTextImport}
                      disabled={!textContent.trim() || textStatus === "processing"}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-lime text-lime-foreground rounded-xl font-bold hover:bg-lime/90 transition-colors disabled:opacity-50"
                    >
                      {getStatusIcon(textStatus)}
                      {textStatus === "processing" ? "Processing..." : "Import Text"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* PDF Upload */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-orange/10 to-orange/5 rounded-2xl p-6 border-2 border-orange/25"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-orange/20 rounded-xl flex items-center justify-center shrink-0">
                <Upload className="w-7 h-7 text-orange" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold text-orange">Upload PDF or JSON (Dump Stat Export)</h2>
                  <button
                    onClick={() => setShowAiInfo(!showAiInfo)}
                    className="p-1 text-orange/70 hover:text-orange transition-colors"
                    title="How does AI processing work?"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-muted-foreground mb-4">
                  Upload a D&D sourcebook PDF and our AI will extract the content automatically,
                  or upload a Dump Stat JSON export to import compendium items directly.
                </p>
                
                {showAiInfo && (
                  <div className="mb-4 p-4 bg-orange/10 rounded-xl border border-orange/20">
                    <h3 className="font-bold text-orange mb-2">How AI Processing Works</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      PDF and text imports use <strong>OpenAI</strong> (default model:{" "}
                      <code className="text-xs">gpt-4o</code>) to parse and structure D&D content.
                      Set <code className="text-xs">OPENAI_API_KEY</code> in your server environment.
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Requires your own OpenAI API key on the server (not in the browser)</li>
                      <li>Optional: override model with IMPORT_AI_MODEL (e.g. gpt-4o-mini)</li>
                      <li>Extracts classes, species, spells, feats, equipment, and more</li>
                      <li>Understands D&D 2024 rules (species vs race, background bonuses)</li>
                      <li>Large PDFs are truncated to 50,000 characters for processing</li>
                      <li>Optionally import only a specific page range (e.g. pages 12–24)</li>
                    </ul>
                  </div>
                )}
                
                <div className="space-y-3">
                  <ImportContentTypeHintSelect
                    value={pdfContentTypeHint}
                    onChange={setPdfContentTypeHint}
                    focusRingClassName="focus:ring-orange"
                  />

                  {/* Content filtering options */}
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
              </div>
            </div>
          </motion.div>

          {/* Web Import */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-2xl p-6 border-2 border-border"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-accent/20 rounded-xl flex items-center justify-center shrink-0">
                <Globe className="w-7 h-7 text-accent" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground mb-2">Import from Web</h2>
                <p className="text-muted-foreground mb-4">
                  Paste a URL from dnd2024.wikidot.com to import species, classes, spells, and more into your compendium.
                </p>
                
                <div className="space-y-3">
                  <ImportContentTypeHintSelect
                    value={webContentType}
                    onChange={setWebContentType}
                    focusRingClassName="focus:ring-accent"
                  />

                  <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="url"
                    placeholder="https://dnd2024.wikidot.com/..."
                    value={webUrl}
                    onChange={(e) => setWebUrl(e.target.value)}
                    className="flex-1 px-4 py-3 bg-muted rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <button
                    onClick={handleWebImport}
                    disabled={!webUrl || webStatus === "processing"}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-xl font-bold hover:bg-accent/90 transition-colors disabled:opacity-50"
                  >
                    {getStatusIcon(webStatus)}
                    {webStatus === "processing" ? "Importing..." : "Import"}
                  </button>
                </div>
                </div>
                
                <p className="text-xs text-muted-foreground mt-3">
                  Imported content will appear in the Compendium after import completes.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
