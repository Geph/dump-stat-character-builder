"use client"

import { useState } from "react"
import {
  IMPORT_WORKFLOWS,
  JSON_ARRAY_IMPORT_TIP,
  MULTI_FILE_IMPORT_TIP,
  ONE_CLASS_AT_A_TIME_WARNING,
} from "@/lib/import/import-workflow-guidance"
import { AlertTriangle, ChevronDown, ChevronUp, Layers } from "lucide-react"

export function ImportWorkflowGuidancePanel() {
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState(IMPORT_WORKFLOWS[0]?.id ?? "")

  const active = IMPORT_WORKFLOWS.find((workflow) => workflow.id === activeId) ?? IMPORT_WORKFLOWS[0]

  return (
    <div className="space-y-3">
      <div className="flex gap-2.5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3.5 py-3 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
        <div className="min-w-0 space-y-1">
          <p className="font-semibold text-foreground">One class at a time</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {ONE_CLASS_AT_A_TIME_WARNING}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-sky-500/10 transition-colors"
        >
          <span className="flex items-start gap-2.5 min-w-0">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-sky-700 dark:text-sky-300" />
            <span className="min-w-0">
              <span className="block font-semibold">Import order</span>
              <span className="mt-0.5 block text-xs font-normal leading-relaxed text-muted-foreground">
                Dependencies like spells or abilities first, then class and subclasses section
              </span>
            </span>
          </span>
          {open ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-sky-700/70 dark:text-sky-300/70" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-sky-700/70 dark:text-sky-300/70" />
          )}
        </button>

        {open ? (
          <div className="space-y-4 border-t border-sky-500/25 px-4 py-4">
            <p className="text-xs text-muted-foreground leading-relaxed">{MULTI_FILE_IMPORT_TIP}</p>
            <p className="text-xs text-muted-foreground leading-relaxed flex gap-2">
              <Layers className="h-3.5 w-3.5 shrink-0 mt-0.5 text-sky-700 dark:text-sky-300" />
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
              <div className="rounded-lg border border-border bg-background/80 p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{active.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{active.summary}</p>
                  {active.examples.length ? (
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Examples: {active.examples.join(", ")}
                    </p>
                  ) : null}
                </div>

                <ol className="space-y-2 text-sm">
                  {active.steps.map((step, index) => (
                    <li key={step.label} className="flex gap-2">
                      <span className="font-bold text-lime shrink-0">{index + 1}.</span>
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
                  <ul className="text-[11px] text-muted-foreground space-y-1.5 list-disc pl-4 leading-relaxed">
                    {active.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
