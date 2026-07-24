"use client"

import { useState, type ReactNode } from "react"
import {
  CLASS_IMPORT_NOTES,
  CLASS_IMPORT_STEPS,
  JSON_ARRAY_IMPORT_TIP,
  MULTI_FILE_IMPORT_TIP,
  ONE_CLASS_AT_A_TIME_WARNING,
  SCHEMA_FIT_WARNING,
  WEAPON_MASTERY_IMPORT_TIP,
} from "@/lib/import/import-workflow-guidance"
import { CLEAN_SOURCE_TEXT_UI_GUIDELINES } from "@/lib/import/byo-import-kit"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  BookOpen,
  ChevronRight,
  ClipboardPaste,
  Library,
  ScrollText,
} from "lucide-react"

type GuidanceTopic = "one-class" | "import-order" | "clean-source" | "schema-fit"

const TOPIC_BUTTONS: {
  id: GuidanceTopic
  title: string
  blurb: string
  icon: typeof AlertTriangle
  accent: string
}[] = [
  {
    id: "one-class",
    title: "One class at a time",
    blurb: "Why multi-class extracts fail",
    icon: AlertTriangle,
    accent: "text-amber-700 dark:text-amber-300",
  },
  {
    id: "schema-fit",
    title: "Schema fit",
    blurb: "Masteries, whole books, bad shapes",
    icon: AlertTriangle,
    accent: "text-amber-700 dark:text-amber-300",
  },
  {
    id: "import-order",
    title: "Importing a class",
    blurb: "Library → class chapter → one paste",
    icon: ScrollText,
    accent: "text-sky-700 dark:text-sky-300",
  },
  {
    id: "clean-source",
    title: "Clean source text",
    blurb: "PDF & paste tips before extract",
    icon: BookOpen,
    accent: "text-lime",
  },
]

const STEP_ICONS = [Library, ScrollText, ClipboardPaste] as const

function GuidanceDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  contentClassName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  children: ReactNode
  contentClassName?: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("gap-0 overflow-hidden p-0 sm:max-w-lg", contentClassName)}>
        <DialogHeader className="border-b border-border px-6 py-4 text-left pr-12">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[min(70vh,32rem)] overflow-y-auto px-6 py-4 text-sm">{children}</div>
      </DialogContent>
    </Dialog>
  )
}

export function ImportWorkflowGuidancePanel() {
  const [topic, setTopic] = useState<GuidanceTopic | null>(null)

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Import tips</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {TOPIC_BUTTONS.map((entry) => {
          const Icon = entry.icon
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTopic(entry.id)}
              className="inline-flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-border bg-background/80 px-3 py-2.5 text-left transition-colors hover:bg-muted/40 sm:min-w-[12rem]"
            >
              <Icon className={cn("h-4 w-4 shrink-0", entry.accent)} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">{entry.title}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                  {entry.blurb}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          )
        })}
      </div>

      <GuidanceDialog
        open={topic === "one-class"}
        onOpenChange={(open) => setTopic(open ? "one-class" : null)}
        title="One class at a time"
        description="Keep each import pass focused on a single class chapter."
      >
        <p className="leading-relaxed text-muted-foreground">{ONE_CLASS_AT_A_TIME_WARNING}</p>
      </GuidanceDialog>

      <GuidanceDialog
        open={topic === "schema-fit"}
        onOpenChange={(open) => setTopic(open ? "schema-fit" : null)}
        title="Schema fit & masteries"
        description="Upload shapes that match the JSON schema — and how homebrew masteries land."
        contentClassName="sm:max-w-xl"
      >
        <div className="space-y-3">
          <p className="leading-relaxed text-muted-foreground">{SCHEMA_FIT_WARNING}</p>
          <p className="leading-relaxed text-muted-foreground">{WEAPON_MASTERY_IMPORT_TIP}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Same-name classes (e.g. Mage Hand Press Warden vs Kibbles Tasty Warden): keep the source
            header name in JSON; the import review asks you what to rename the class to.
          </p>
        </div>
      </GuidanceDialog>

      <GuidanceDialog
        open={topic === "import-order"}
        onOpenChange={(open) => setTopic(open ? "import-order" : null)}
        title="Importing a class"
        description="The usual pattern for homebrew classes — works for casters, martials, psions, and similar."
        contentClassName="sm:max-w-xl"
      >
        <div className="space-y-4">
          <p className="leading-relaxed text-muted-foreground">{MULTI_FILE_IMPORT_TIP}</p>

          <ol className="space-y-3">
            {CLASS_IMPORT_STEPS.map((step, index) => {
              const Icon = STEP_ICONS[index] ?? ScrollText
              return (
                <li key={step.label} className="flex gap-3">
                  <div className="flex shrink-0 flex-col items-center">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-sm shadow-primary/20">
                      {index + 1}
                    </span>
                    {index < CLASS_IMPORT_STEPS.length - 1 ? (
                      <span className="mt-1 h-full min-h-[0.75rem] w-px grow bg-border" aria-hidden />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 rounded-xl border border-border/70 bg-muted/15 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                      <p className="font-semibold text-foreground">{step.label}</p>
                    </div>
                    {step.hint ? (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.hint}</p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>

          <p className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            {JSON_ARRAY_IMPORT_TIP}
          </p>

          <ul className="list-disc space-y-1.5 pl-4 text-[11px] leading-relaxed text-muted-foreground">
            {CLASS_IMPORT_NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </GuidanceDialog>

      <GuidanceDialog
        open={topic === "clean-source"}
        onOpenChange={(open) => setTopic(open ? "clean-source" : null)}
        title="Clean source text"
        description="Quick prep tips before you extract a class chapter."
        contentClassName="sm:max-w-xl"
      >
        <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted-foreground">
          {CLEAN_SOURCE_TEXT_UI_GUIDELINES}
        </pre>
      </GuidanceDialog>
    </div>
  )
}
