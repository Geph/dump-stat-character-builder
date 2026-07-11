"use client"

import { useState } from "react"
import { Settings, ExternalLink, Bug } from "lucide-react"
import Link from "next/link"
import { useAppTheme, APP_THEMES } from "@/components/providers/app-theme-provider"
import {
  getAppVersion,
  getDeployMode,
  getStorageLabel,
} from "@/lib/config/deploy-mode"
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
import { useAppPresentationMode } from "@/components/settings/use-app-presentation-mode"
import { useGmDashboardNav } from "@/components/settings/use-gm-dashboard-nav"
import { LayoutGrid, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

const GITHUB_ISSUES_URL = "https://github.com/Geph/dump-stat-character-builder/issues"

const BUILDER_LAYOUT_OPTIONS = [
  {
    id: "visual" as const,
    label: "Visual",
    description: "Card art and richer pickers in the builder and compendium.",
    icon: Sparkles,
  },
  {
    id: "compact" as const,
    label: "Compact",
    description: "Dense lists without card art so more fits on screen.",
    icon: LayoutGrid,
  },
]

export function GlobalSettingsMenu() {
  const { theme, setTheme } = useAppTheme()
  const { layout: builderLayout, setLayout: setBuilderLayout } = useBuilderLayout()
  const { isCompactOnly } = useAppPresentationMode()
  const { enabled: gmDashboardNavEnabled, setEnabled: setGmDashboardNavEnabled } = useGmDashboardNav()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  return (
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
            Appearance and site preferences.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="appearance" className="gap-0">
          <div className="border-b border-border px-6 pt-3">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-transparent p-0">
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
                {!isCompactOnly ? (
                  <>
                    <HeroBackgroundSettings onStatus={setStatus} />
                    <PageBackgroundSettings onStatus={setStatus} />
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Background graphics are hidden in Compact Only mode. Choose Visual + Compact on
                    the home page splash to re-enable them.
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="general" className="mt-0 space-y-6">
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 space-y-1">
                <p className="text-xs font-semibold text-foreground">Deployment</p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11px] leading-tight">
                  <dt className="text-muted-foreground">Version</dt>
                  <dd className="font-medium text-foreground tabular-nums">{getAppVersion()}</dd>
                  <dt className="text-muted-foreground">Mode</dt>
                  <dd className="font-medium text-foreground">{getDeployMode()}</dd>
                  <dt className="text-muted-foreground">Storage</dt>
                  <dd className="font-medium text-foreground">{getStorageLabel()}</dd>
                </dl>
              </div>

              <div>
                <p className="text-sm font-semibold text-foreground">Card layout</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isCompactOnly
                    ? "Compact Only mode keeps the builder and compendium in dense list view."
                    : "Default Visual or Compact presentation for the character builder and compendium. You can still toggle it on those pages."}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {BUILDER_LAYOUT_OPTIONS.filter((option) => !isCompactOnly || option.id === "compact").map((option) => {
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
                <p className="text-sm font-semibold text-foreground">Navigation</p>
                <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/20 p-3">
                  <input
                    type="checkbox"
                    checked={gmDashboardNavEnabled}
                    onChange={(event) => setGmDashboardNavEnabled(event.target.checked)}
                    className="mt-0.5 size-4 shrink-0 rounded border-border accent-primary"
                  />
                  <span className="text-sm leading-snug">
                    <span className="font-semibold text-foreground">
                      Show GM Dashboard{" "}
                      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        (beta)
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Adds a GM Dashboard link to the header for multi-character table tools.
                    </span>
                  </span>
                </label>
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

              <div>
                <p className="text-sm font-semibold text-foreground">Feedback</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Report bugs or request features on GitHub.
                </p>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-2"
                >
                  <a href={GITHUB_ISSUES_URL} target="_blank" rel="noopener noreferrer">
                    <Bug className="h-4 w-4" />
                    Report an issue on GitHub
                  </a>
                </Button>
              </div>
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
  )
}
