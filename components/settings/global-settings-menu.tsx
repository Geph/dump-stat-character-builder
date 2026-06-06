"use client"

import { useRef, useState } from "react"
import { Settings, Download, Upload, Database, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useAppTheme, APP_THEMES } from "@/components/providers/app-theme-provider"
import {
  getDeployMode,
  getStorageLabel,
  isStaticDeploy,
} from "@/lib/config/deploy-mode"
import { createClient } from "@/lib/data/client"
import { seedLocalSrd } from "@/lib/data/local-seed"
import {
  importDumpStatExportItemsLocal,
  parseDumpStatExportJson,
} from "@/lib/data/local-import"
import { buildBulkExportJson, rowToExportItem } from "@/lib/import/dump-stat-export-format"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { HeroBackgroundSettings } from "@/components/settings/hero-background-settings"

const EXPORT_SECTIONS = [
  { tab: "classes", table: "classes" },
  { tab: "subclasses", table: "subclasses" },
  { tab: "species", table: "species" },
  { tab: "backgrounds", table: "backgrounds" },
  { tab: "spells", table: "spells" },
  { tab: "feats", table: "feats" },
  { tab: "equipment", table: "equipment" },
  { tab: "abilities", table: "custom_abilities" },
] as const

export function GlobalSettingsMenu() {
  const { theme, setTheme } = useAppTheme()
  const importInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const handleExportAll = async () => {
    setBusy(true)
    setStatus(null)
    try {
      const db = createClient()
      const allItems = []
      for (const { tab, table } of EXPORT_SECTIONS) {
        const { data } = await db.from(table).select("*").order("name").limit(5000)
        for (const row of data ?? []) {
          const exportRow = { ...(row as Record<string, unknown>) }
          if (tab === "subclasses" && exportRow.class_id) {
            const { data: classes } = await db.from("classes").select("id, name")
            const cls = (classes ?? []).find((c) => c.id === exportRow.class_id)
            if (cls) exportRow.class_name = cls.name
          }
          const item = rowToExportItem(tab, exportRow)
          if (item) allItems.push(item)
        }
      }
      const payload = buildBulkExportJson("all", allItems)
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "dump-stat-full-export.json"
      a.click()
      URL.revokeObjectURL(url)
      setStatus(`Exported ${allItems.length} items`)
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Export failed")
    } finally {
      setBusy(false)
    }
  }

  const handleImportFile = async (file: File) => {
    setBusy(true)
    setStatus(null)
    try {
      const items = parseDumpStatExportJson(await file.text())
      if (!items?.length) {
        setStatus("Invalid JSON pack")
        return
      }
      const result = isStaticDeploy()
        ? await importDumpStatExportItemsLocal(items)
        : null
      if (!result) {
        setStatus("Import packs from the Import page in hosted mode")
        return
      }
      setStatus(`Imported ${result.count} items`)
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Import failed")
    } finally {
      setBusy(false)
    }
  }

  const handleReloadSrd = async () => {
    if (!isStaticDeploy()) return
    setBusy(true)
    setStatus(null)
    try {
      const result = await seedLocalSrd()
      setStatus(`Reloaded ${result.total} SRD items`)
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "SRD reload failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleImportFile(file)
          e.target.value = ""
        }}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 rounded-xl border-2 border-border bg-card hover:bg-muted"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Deployment</DropdownMenuLabel>
          <div className="px-2 pb-2 text-xs text-muted-foreground space-y-1">
            <p>
              Mode: <span className="font-semibold text-foreground">{getDeployMode()}</span>
            </p>
            <p>
              Storage: <span className="font-semibold text-foreground">{getStorageLabel()}</span>
            </p>
            {status && <p className="text-foreground pt-1">{status}</p>}
          </div>
          {isStaticDeploy() && (
            <>
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                disabled={busy}
                onClick={() => void handleExportAll()}
              >
                <Download className="w-4 h-4" />
                Export all compendium data
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                disabled={busy}
                onClick={() => importInputRef.current?.click()}
              >
                <Upload className="w-4 h-4" />
                Import JSON pack
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                disabled={busy}
                onClick={() => void handleReloadSrd()}
              >
                <RefreshCw className="w-4 h-4" />
                Reload bundled SRD
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem asChild>
            <Link href="/import" className="gap-2 cursor-pointer flex items-center">
              <Database className="w-4 h-4" />
              Import &amp; data management
            </Link>
          </DropdownMenuItem>
          <HeroBackgroundSettings onStatus={setStatus} disabled={busy} />
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Appearance</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
            {APP_THEMES.map((t) => (
              <DropdownMenuRadioItem key={t.id} value={t.id} className="items-start gap-3 py-2.5">
                <span className="flex gap-1 shrink-0 mt-0.5" aria-hidden>
                  {t.swatches.map((color, i) => (
                    <span
                      key={i}
                      className="w-3.5 h-3.5 rounded-full border border-border/80"
                      style={{ background: color }}
                    />
                  ))}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-foreground">{t.label}</span>
                  <span className="block text-xs text-muted-foreground leading-snug">{t.description}</span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
