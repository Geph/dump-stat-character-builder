"use client"

import { useRef, useState } from "react"
import { Settings, Download, Upload, Database, RefreshCw, ExternalLink } from "lucide-react"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { HeroBackgroundSettings } from "@/components/settings/hero-background-settings"
import { PageBackgroundSettings } from "@/components/settings/page-background-settings"
import { useBuilderLayout } from "@/components/settings/use-builder-layout"
import { LayoutGrid, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

const BUILDER_LAYOUT_OPTIONS = [
  {
    id: "visual" as const,
    label: "Visual",
    description: "Icon grids and cards for classes, weapons, and feats.",
    icon: Sparkles,
  },
  {
    id: "compact" as const,
    label: "Compact",
    description: "Dense lists and dropdowns that fit more on screen.",
    icon: LayoutGrid,
  },
]

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
  const { layout: builderLayout, setLayout: setBuilderLayout } = useBuilderLayout()
  const importInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 rounded-xl border-2 border-border bg-card hover:bg-muted"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-border px-6 py-4 text-left">
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Appearance, site preferences, and data management.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="appearance" className="gap-0">
            <div className="border-b border-border px-6 pt-3">
              <TabsList className="grid h-auto w-full grid-cols-3 gap-1 bg-transparent p-0">
                <TabsTrigger
                  value="appearance"
                  className="rounded-lg border border-transparent px-3 py-2 data-[state=active]:border-border data-[state=active]:bg-muted data-[state=active]:shadow-none"
                >
                  Appearance
                </TabsTrigger>
                <TabsTrigger
                  value="general"
                  className="rounded-lg border border-transparent px-3 py-2 data-[state=active]:border-border data-[state=active]:bg-muted data-[state=active]:shadow-none"
                >
                  General
                </TabsTrigger>
                <TabsTrigger
                  value="data"
                  className="rounded-lg border border-transparent px-3 py-2 data-[state=active]:border-border data-[state=active]:bg-muted data-[state=active]:shadow-none"
                >
                  Data
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="max-h-[min(70vh,32rem)] overflow-y-auto px-6 py-4">
              <TabsContent value="appearance" className="mt-0 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Choose a color theme for the app interface.
                </p>
                <ul className="space-y-2">
                  {APP_THEMES.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => setTheme(t.id)}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left transition-colors",
                          theme === t.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/60",
                        )}
                      >
                        <span className="mt-0.5 flex shrink-0 gap-1" aria-hidden>
                          {t.swatches.map((color, i) => (
                            <span
                              key={i}
                              className="h-4 w-4 rounded-full border border-border/80"
                              style={{ background: color }}
                            />
                          ))}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-foreground">{t.label}</span>
                          <span className="block text-xs text-muted-foreground leading-snug">
                            {t.description}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-border pt-4 space-y-4">
                  <HeroBackgroundSettings onStatus={setStatus} disabled={busy} />
                  <PageBackgroundSettings onStatus={setStatus} disabled={busy} />
                </div>
              </TabsContent>

              <TabsContent value="general" className="mt-0 space-y-6">
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                  <p className="text-sm font-semibold text-foreground">Deployment</p>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <dt className="text-muted-foreground">Mode</dt>
                    <dd className="font-medium text-foreground">{getDeployMode()}</dd>
                    <dt className="text-muted-foreground">Storage</dt>
                    <dd className="font-medium text-foreground">{getStorageLabel()}</dd>
                  </dl>
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground">Builder layout</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Default presentation for the character builder. You can still toggle it per
                    session inside the builder.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {BUILDER_LAYOUT_OPTIONS.map((option) => {
                      const Icon = option.icon
                      const active = builderLayout === option.id
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setBuilderLayout(option.id)}
                          aria-pressed={active}
                          className={cn(
                            "flex flex-col gap-1 rounded-xl border-2 p-3 text-left transition-colors",
                            active
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted/60",
                          )}
                        >
                          <span className="flex items-center gap-2 font-semibold text-foreground">
                            <Icon className="h-4 w-4" />
                            {option.label}
                          </span>
                          <span className="text-xs text-muted-foreground leading-snug">
                            {option.description}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground">Attribution</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Open licenses and third-party credits for bundled content.
                  </p>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-2"
                    onClick={() => setOpen(false)}
                  >
                    <Link href="/#home-footer">
                      <ExternalLink className="h-4 w-4" />
                      Licenses &amp; attribution
                    </Link>
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="data" className="mt-0 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Export, import, or reload compendium data. Hosted deployments use the Import page
                  for full workflows.
                </p>

                {isStaticDeploy() ? (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start gap-2"
                      disabled={busy}
                      onClick={() => void handleExportAll()}
                    >
                      <Download className="h-4 w-4" />
                      Export all compendium data
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start gap-2"
                      disabled={busy}
                      onClick={() => importInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" />
                      Import JSON pack
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start gap-2"
                      disabled={busy}
                      onClick={() => void handleReloadSrd()}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Reload bundled SRD
                    </Button>
                  </div>
                ) : (
                  <p className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                    JSON pack import/export is available in the static (GitHub Pages) build. Use the
                    Import page below for hosted mode.
                  </p>
                )}

                <Button
                  asChild
                  variant="default"
                  className="w-full justify-start gap-2"
                  onClick={() => setOpen(false)}
                >
                  <Link href="/import">
                    <Database className="h-4 w-4" />
                    Import &amp; data management
                  </Link>
                </Button>
              </TabsContent>
            </div>

            {status ? (
              <div className="border-t border-border px-6 py-3 text-xs text-foreground bg-muted/30">
                {status}
              </div>
            ) : null}
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}
