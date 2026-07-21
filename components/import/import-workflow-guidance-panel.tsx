"use client"

import { useState, type ReactNode } from "react"
import {
  IMPORT_WORKFLOWS,
  JSON_ARRAY_IMPORT_TIP,
  MULTI_FILE_IMPORT_TIP,
  ONE_CLASS_AT_A_TIME_WARNING,
  SCHEMA_FIT_WARNING,
  WEAPON_MASTERY_IMPORT_TIP,
} from "@/lib/import/import-workflow-guidance"
import { CLEAN_SOURCE_TEXT_GUIDELINES } from "@/lib/import/byo-import-kit"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { AlertTriangle, BookOpen, ChevronRight, Layers } from "lucide-react"

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
    title: "Import order",
    blurb: "Usually 2 extracts → 1 paste",
    icon: Layers,
    accent: "text-sky-700 dark:text-sky-300",
  },
  {
    id: "clean-source",
    title: "Clean source text guidelines",
    blurb: "PDF & paste tips for better extraction",
    icon: BookOpen,
    accent: "text-lime",
  },
]

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
  const [activeId, setActiveId] = useState(IMPORT_WORKFLOWS[0]?.id ?? "")
  const active = IMPORT_WORKFLOWS.find((workflow) => workflow.id === activeId) ?? IMPORT_WORKFLOWS[0]

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
            Same-name classes (e.g. Mage Hand Press Warden vs Kibbles): keep the source header name
            in JSON; the import review asks you what to rename the class to.
          </p>
        </div>
      </GuidanceDialog>

      <GuidanceDialog
        open={topic === "import-order"}
        onOpenChange={(open) => setTopic(open ? "import-order" : null)}
        title="Import order"
        description="Usually two LLM extracts, then one Step 2 paste — libraries auto-merge with the class chapter."
        contentClassName="sm:max-w-xl"
      >
        <div className="space-y-4">
          <p className="leading-relaxed text-muted-foreground">{MULTI_FILE_IMPORT_TIP}</p>
          <p className="flex gap-2 leading-relaxed text-muted-foreground">
            <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-700 dark:text-sky-300" />
            <span>{JSON_ARRAY_IMPORT_TIP}</span>
          </p>

          <div className="flex flex-wrap gap-2">
            {IMPORT_WORKFLOWS.map((workflow) => (
              <button
                key={workflow.id}
                type="button"
                onClick={() => setActiveId(workflow.id)}
                className={
                  workflow.id === active?.id
                    ? "rounded-lg border border-lime/40 bg-lime/10 px-3 py-1.5 text-xs font-semibold text-foreground"
                    : "rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/60"
                }
              >
                {workflow.title.split("(")[0].trim()}
              </button>
            ))}
          </div>

          {active ? (
            <div className="space-y-3 border-t border-border pt-4">
              <div>
                <h3 className="font-semibold text-foreground">{active.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{active.summary}</p>
                {active.examples.length ? (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Examples: {active.examples.join(", ")}
                  </p>
                ) : null}
              </div>

              <ol className="space-y-2">
                {active.steps.map((step, index) => (
                  <li key={step.label} className="flex gap-2">
                    <span className="shrink-0 font-bold text-lime">{index + 1}.</span>
                    <span>
                      <span className="font-medium text-foreground">{step.label}</span>
                      {step.hint ? (
                        <span className="text-muted-foreground"> — {step.hint}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ol>

              {active.notes?.length ? (
                <ul className="list-disc space-y-1.5 pl-4 text-[11px] leading-relaxed text-muted-foreground">
                  {active.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </GuidanceDialog>

      <GuidanceDialog
        open={topic === "clean-source"}
        onOpenChange={(open) => setTopic(open ? "clean-source" : null)}
        title="Clean source text guidelines"
        description="Prep PDF text and pastes so extraction stays reliable."
        contentClassName="sm:max-w-xl"
      >
        <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted-foreground">
          {CLEAN_SOURCE_TEXT_GUIDELINES}
        </pre>
      </GuidanceDialog>
    </div>
  )
}
