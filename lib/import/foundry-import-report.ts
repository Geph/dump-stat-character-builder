import type { FoundryImportMeta, FoundrySkippedEntry } from "@/lib/import/foundry-types"
import type { ImportReport, ImportReportNextStep } from "@/lib/import/build-import-report"

export type ImportReportFoundrySection = {
  sourceLabel: string
  mapped: FoundryImportMeta["mapped"]
  skipped: FoundrySkippedEntry[]
  review: FoundryImportMeta["review"]
}

export function mergeFoundryIntoImportReport(
  report: ImportReport,
  foundry: FoundryImportMeta | undefined,
): ImportReport {
  if (!foundry) return report

  const foundrySection: ImportReportFoundrySection = {
    sourceLabel: foundry.sourceLabel,
    mapped: foundry.mapped,
    skipped: foundry.skipped,
    review: foundry.review,
  }

  const nextSteps: ImportReportNextStep[] = [...report.nextSteps]

  for (const skipped of foundry.skipped) {
    const examples = skipped.examples.slice(0, 3).join(", ")
    nextSteps.unshift({
      severity: "info",
      title: skipped.reason,
      detail: `${skipped.count} document${skipped.count === 1 ? "" : "s"} skipped${examples ? `: ${examples}` : ""}.`,
    })
  }

  for (const review of foundry.review.slice(0, 8)) {
    nextSteps.push({
      severity: "warning",
      title: review.label,
      detail: review.documentName ? `${review.detail} (${review.documentName})` : review.detail,
    })
  }

  const effectCount = foundry.mapped.effects
  const advancementCount = foundry.mapped.advancements
  let headline = report.headline
  if (effectCount > 0 || advancementCount > 0) {
    const parts: string[] = []
    if (effectCount > 0) parts.push(`${effectCount} Active Effect${effectCount === 1 ? "" : "s"}`)
    if (advancementCount > 0) parts.push(`${advancementCount} advancement${advancementCount === 1 ? "" : "s"}`)
    headline += `. Foundry: ${parts.join(", ")} mapped.`
  }

  return {
    ...report,
    headline,
    nextSteps,
    foundry: foundrySection,
  }
}

export function recordSkippedDocuments(
  meta: FoundryImportMeta,
  reason: string,
  names: string[],
): void {
  if (!names.length) return
  const existing = meta.skipped.find((entry) => entry.reason === reason)
  if (existing) {
    existing.count += names.length
    for (const name of names) {
      if (existing.examples.length < 5) existing.examples.push(name)
    }
    return
  }
  meta.skipped.push({
    reason,
    count: names.length,
    examples: names.slice(0, 5),
  })
}
