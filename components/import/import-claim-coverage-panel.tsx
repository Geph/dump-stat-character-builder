"use client"

import type { ClassClaimCoverageReport, FeatureClaimCoverage } from "@/lib/import/feature-claims"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Bug } from "lucide-react"

type ImportClaimCoveragePanelProps = {
  reports: ClassClaimCoverageReport[]
  embedded?: boolean
}

function formatCounts(total: number, wired: number, unresolved: number, narrative: number): string {
  return `${total} claims, ${wired} wired, ${unresolved} unresolved, ${narrative} narrative`
}

function FeatureClaimRow({ feature }: { feature: FeatureClaimCoverage }) {
  const unresolvedClaims = feature.claims.filter((claim) => claim.status === "unresolved")
  const levelPrefix = feature.level != null ? `L${feature.level} ` : ""
  const summary = (
    <>
      <span className="text-muted-foreground">{levelPrefix}</span>
      <span className="font-medium text-foreground">{feature.name}</span>
      <span className="text-muted-foreground">
        {": "}
        {feature.totals.total} claims, {feature.totals.wired} wired
        {feature.totals.unresolved > 0 ? `, ${feature.totals.unresolved} unresolved` : ""}
      </span>
    </>
  )

  if (!unresolvedClaims.length) {
    return <li className="text-xs leading-snug">{summary}</li>
  }

  return (
    <li className="text-xs leading-snug">
      <details className="group">
        <summary className="cursor-pointer list-none marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="underline-offset-2 group-open:underline">{summary}</span>
          <span className="ml-1.5 text-[10px] font-medium text-destructive">show</span>
        </summary>
        <ul className="mt-1.5 space-y-1.5 border-l border-destructive/30 pl-3">
          {unresolvedClaims.map((claim) => (
            <li key={claim.id} className="text-[11px] leading-snug text-muted-foreground">
              <span className="mr-1.5 font-semibold text-destructive">unresolved</span>
              {claim.text}
            </li>
          ))}
        </ul>
      </details>
    </li>
  )
}

export function ImportClaimCoveragePanel({
  reports,
  embedded = false,
}: ImportClaimCoveragePanelProps) {
  if (!reports.length) return null

  const totals = reports.reduce(
    (acc, report) => ({
      total: acc.total + report.totals.total,
      wired: acc.wired + report.totals.wired,
      unresolved: acc.unresolved + report.totals.unresolved,
      narrative: acc.narrative + report.totals.narrative,
    }),
    { total: 0, wired: 0, unresolved: 0, narrative: 0 },
  )

  const shellClass = embedded
    ? "text-sm"
    : "rounded-xl border border-border bg-background/80 p-2 text-sm"

  return (
    <section className={shellClass}>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="claim-coverage" className="border-none">
          <AccordionTrigger className="px-2 py-2 hover:no-underline">
            <div className="flex min-w-0 items-start gap-2 text-left">
              <Bug className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="font-semibold text-foreground">
                  Debug · claim coverage
                  <span className="ml-2 font-normal text-muted-foreground">
                    ({totals.unresolved} unresolved of {totals.total})
                  </span>
                </p>
                <p className="mt-0.5 text-xs font-normal text-muted-foreground">
                  Import instrumentation only — expand to inspect per-feature claim wiring.
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-2 pb-2">
            <p className="mb-3 text-xs text-muted-foreground">
              Each feature is split into atomic mechanical claims. Click a feature with unresolved
              claims to read the leftover text.
            </p>
            <ul className="space-y-3">
              {reports.map((report) => {
                const title =
                  report.kind === "subclass" && report.parentClassName
                    ? `${report.className} (${report.parentClassName})`
                    : report.className
                return (
                  <li
                    key={`${report.kind}:${report.className}`}
                    className="rounded-lg border border-border/70 px-3 py-2"
                  >
                    <p className="font-medium text-foreground">{title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatCounts(
                        report.totals.total,
                        report.totals.wired,
                        report.totals.unresolved,
                        report.totals.narrative,
                      )}
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {report.features.map((feature) => (
                        <FeatureClaimRow
                          key={`${feature.level ?? 0}:${feature.name}`}
                          feature={feature}
                        />
                      ))}
                    </ul>
                  </li>
                )
              })}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  )
}
