"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { MainNav } from "@/components/main-nav"
import { Upload, Globe, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react"

type ImportStatus = "idle" | "uploading" | "processing" | "success" | "error"

export default function ImportPage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [webUrl, setWebUrl] = useState("")
  const [pdfStatus, setPdfStatus] = useState<ImportStatus>("idle")
  const [webStatus, setWebStatus] = useState<ImportStatus>("idle")
  const [seedStatus, setSeedStatus] = useState<ImportStatus>("idle")
  const [message, setMessage] = useState("")

  const handlePdfUpload = async () => {
    if (!pdfFile) return

    setPdfStatus("uploading")
    setMessage("")

    const formData = new FormData()
    formData.append("pdf", pdfFile)

    try {
      setPdfStatus("processing")
      const response = await fetch("/api/import/pdf", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setPdfStatus("success")
        setMessage(`Successfully imported ${data.count} items`)
      } else {
        setPdfStatus("error")
        setMessage(data.error || "Failed to import PDF")
      }
    } catch {
      setPdfStatus("error")
      setMessage("Failed to connect to server")
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
        body: JSON.stringify({ url: webUrl }),
      })

      const data = await response.json()

      if (response.ok) {
        setWebStatus("success")
        setMessage(`Successfully imported ${data.count} items from ${data.source}`)
      } else {
        setWebStatus("error")
        setMessage(data.error || "Failed to import from web")
      }
    } catch {
      setWebStatus("error")
      setMessage("Failed to connect to server")
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
        setMessage(`Successfully seeded ${data.total} items from SRD 5.2`)
      } else {
        setSeedStatus("error")
        setMessage(data.error || "Failed to seed database")
      }
    } catch {
      setSeedStatus("error")
      setMessage("Failed to connect to server")
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
    <div className="min-h-screen bg-background">
      <MainNav />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-foreground mb-2">Import Content</h1>
          <p className="text-muted-foreground text-lg">
            Add new content from PDFs or online sources
          </p>
        </div>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl mb-6 ${
              pdfStatus === "success" || webStatus === "success" || seedStatus === "success"
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
                  Quick Start: Seed SRD Content
                </h2>
                <p className="text-muted-foreground mb-4">
                  Instantly populate your database with the D&D 5.2 SRD content including 
                  classes, species, backgrounds, spells, and equipment.
                </p>
                <button
                  onClick={handleSeedSRD}
                  disabled={seedStatus === "processing"}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {getStatusIcon(seedStatus)}
                  {seedStatus === "processing" ? "Seeding..." : "Seed SRD Content"}
                </button>
              </div>
            </div>
          </motion.div>

          {/* PDF Upload */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl p-6 border-2 border-border"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-secondary/20 rounded-xl flex items-center justify-center shrink-0">
                <Upload className="w-7 h-7 text-secondary" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground mb-2">Upload PDF</h2>
                <p className="text-muted-foreground mb-4">
                  Upload a D&D sourcebook PDF and our AI will extract the content automatically.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <div className="flex items-center justify-center gap-2 px-4 py-3 bg-muted rounded-xl cursor-pointer hover:bg-muted/80 transition-colors">
                      <FileText className="w-5 h-5" />
                      <span className="font-medium truncate">
                        {pdfFile ? pdfFile.name : "Choose PDF file..."}
                      </span>
                    </div>
                  </label>
                  <button
                    onClick={handlePdfUpload}
                    disabled={!pdfFile || pdfStatus === "processing" || pdfStatus === "uploading"}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-xl font-bold hover:bg-secondary/90 transition-colors disabled:opacity-50"
                  >
                    {getStatusIcon(pdfStatus)}
                    {pdfStatus === "processing" ? "Processing..." : "Import"}
                  </button>
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
                  Import content from dnd2024.wikidot.com or other supported sources.
                </p>
                
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
                
                <div className="mt-4 p-3 bg-muted rounded-xl">
                  <p className="text-sm font-medium text-foreground mb-2">Supported sources:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>- dnd2024.wikidot.com/lineage:* (Species)</li>
                    <li>- dnd2024.wikidot.com/class:* (Classes)</li>
                    <li>- dnd2024.wikidot.com/background:* (Backgrounds)</li>
                    <li>- dnd2024.wikidot.com/spell:* (Spells)</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
