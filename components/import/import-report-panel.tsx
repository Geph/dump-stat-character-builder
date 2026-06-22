"use client"

import type { ImportReport } from "@/lib/import/build-import-report"
import { AlertCircle, CheckCircle2, Info, ListChecks } from "lucide-react"

const STATUS_LABELS = {
  linked: { label: "Modifiers linked", className: "text-success" },
  preset_only: { label: "Preset only", className: "text-amber-600 dark:text-amber-400" },
  text_only: { label: "Text only", className: "text-muted-foreground" },
} as const

const STEP_ICONS = {
  action: AlertCircle,
  warning: AlertCircle,
  info: Info,
} as const

const STEP_STYLES = {
  action: "border-destructive/30 bg-destructive/5",
  warning: "border-amber-500/30 bg-amber-500/5",
  info: "border-border bg-muted/30",
} as const

type ImportReportPanelProps = {
  report: ImportReport
}

export function ImportReportPanel({ report }: ImportReportPanelProps) {
  const hasClassDetail = report.classes.length > 0
  const hasSubclassDetail = report.subclasses.length > 0
  const hasNextSteps = report.nextSteps.length > 0

  return (
    <div className="space-y-4 rounded-xl border border-success/20 bg-success/5 p-4 text-sm">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <div>
          <p className="font-semibold text-success">{report.headline}</p>
          {report.summary.autoWiredModifiers > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {report.summary.autoWiredModifiers} common modifier
              {report.summary.autoWiredModifiers === 1 ? "" : "s"} linked from import text.
            </p>
          ) : null}
          {report.warnings.length > 0 && (
            <ul className="mt-2 space-y-1 text-destructive">
              {report.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {hasNextSteps && (
        <section>
          <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
            <ListChecks className="h-4 w-4" />
            Suggested next steps
          </div>
          <ul className="space-y-2">
            {report.nextSteps.map((step, index) => {
              const Icon = STEP_ICONS[step.severity]
              return (
                <li
                  key={`${step.title}-${index}`}
                  className={`rounded-lg border px-3 py-2 ${STEP_STYLES[step.severity]}`}
                >
                  <div className="flex items-start gap-2">
                    <Icon
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        step.severity === "action"
                          ? "text-destructive"
                          : step.severity === "warning"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground"
                      }`}
                    />
                    <div>
                      <p className="font-medium text-foreground">{step.title}</p>
                      <p className="text-muted-foreground">{step.detail}</p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {hasClassDetail && (
        <section>
          <p className="mb-2 font-semibold text-foreground">Class analysis</p>
          <div className="space-y-3">
            {report.classes.map((classReport) => (
              <div
                key={classReport.name}
                className="rounded-lg border border-border/60 bg-background/70 p-3"
              >
                <p className="font-medium text-foreground">
                  {classReport.name}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {classReport.featureCount} features
                  </span>
                </p>
                {classReport.resourceNames.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Resources: {classReport.resourceNames.join(", ")}
                  </p>
                )}
                {classReport.psiLinkedFeatures > 0 && (
                  <p className="mt-1 text-xs text-success">
                    {classReport.psiLinkedFeatures} feature
                    {classReport.psiLinkedFeatures === 1 ? "" : "s"} linked to psi costs
                  </p>
                )}
                {classReport.notes.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                    {classReport.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {hasSubclassDetail && (
        <section>
          <p className="mb-2 font-semibold text-foreground">Subclass analysis</p>
          <div className="space-y-3">
            {report.subclasses.map((subclass) => (
              <div
                key={`${subclass.className}-${subclass.name}`}
                className="rounded-lg border border-border/60 bg-background/70 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-foreground">
                    {subclass.name}
                    <span className="ml-2 text-muted-foreground">({subclass.className})</span>
                  </p>
                  <span
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      subclass.imported ? "text-success" : "text-destructive"
                    }`}
                  >
                    {subclass.imported ? "Imported" : "Skipped"}
                  </span>
                </div>

                {subclass.features.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {subclass.features.map((feature) => {
                      const status = STATUS_LABELS[feature.modifierStatus]
                      return (
                        <li key={`${feature.level}-${feature.name}`} className="rounded-md bg-muted/40 px-3 py-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-foreground">
                              L{feature.level}: {feature.name}
                            </span>
                            <span className={`text-xs font-semibold ${status.className}`}>{status.label}</span>
                            {feature.spellTable && (
                              <span className="text-xs text-muted-foreground">
                                Spells {feature.spellTable.resolvedCount}/{feature.spellTable.totalCount} linked
                                {feature.spellTable.missingCount > 0
                                  ? ` (${feature.spellTable.missingCount} missing)`
                                  : ""}
                              </span>
                            )}
                          </div>
                          {feature.notes.length > 0 && (
                            <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                              {feature.notes.map((note) => (
                                <li key={note}>{note}</li>
                              ))}
                            </ul>
                          )}
                          {feature.spellTable?.missing.length ? (
                            <p className="mt-1 text-xs text-destructive">
                              Missing: {feature.spellTable.missing.map((spell) => spell.name).join(", ")}
                            </p>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
