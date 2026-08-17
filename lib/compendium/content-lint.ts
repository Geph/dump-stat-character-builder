import { isHtml } from "@/lib/compendium/html-utils"

export type ContentLintSeverity = "warning" | "info"

export type ContentLintIssue = {
  severity: ContentLintSeverity
  path: string
  name: string
  message: string
}

const MARKDOWN_MARKERS = /(?:^|[\s(>])(?:\*\*[^*]+\*\*|_[^_\n]+_|\*[^*\n]+\*)/

export function descriptionHasLeftoverMarkdown(value: string | null | undefined): boolean {
  if (!value?.trim()) return false
  return MARKDOWN_MARKERS.test(value)
}

export function featureLooksUnwired(feature: {
  name?: string
  isChoice?: boolean
  choices?: { options?: unknown[] | null; optionsSource?: string | null } | null
  linkedModifiers?: unknown[] | null
  description?: string | null
}): boolean {
  if (!feature.isChoice) return false
  const options = feature.choices?.options
  const hasOptions = Array.isArray(options) && options.length > 0
  const hasSource = Boolean(feature.choices?.optionsSource)
  const hasModifiers = Array.isArray(feature.linkedModifiers) && feature.linkedModifiers.length > 0
  return !hasOptions && !hasSource && !hasModifiers
}

type WalkNode = Record<string, unknown>

function asRecord(value: unknown): WalkNode | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as WalkNode) : null
}

function lintDescription(path: string, name: string, description: unknown, issues: ContentLintIssue[]) {
  if (typeof description !== "string" || !descriptionHasLeftoverMarkdown(description)) return
  const wrapped = isHtml(description)
  issues.push({
    severity: "warning",
    path,
    name,
    message: wrapped
      ? "Description mixes HTML with leftover **bold** or _italic_ markdown."
      : "Description still contains markdown markers (** or _).",
  })
}

function lintFeature(path: string, feature: WalkNode, issues: ContentLintIssue[]) {
  const name = String(feature.name ?? "Feature")
  lintDescription(`${path}.description`, name, feature.description, issues)
  if (featureLooksUnwired(feature as { isChoice?: boolean; choices?: { options?: unknown[] } })) {
    issues.push({
      severity: "info",
      path,
      name,
      message: "Choice feature has no options, optionsSource, or linked modifiers.",
    })
  }
  const options = Array.isArray(feature.choices)
    ? null
    : asRecord(feature.choices)?.options
  if (Array.isArray(options)) {
    for (const [index, option] of options.entries()) {
      const row = asRecord(option)
      if (!row) continue
      lintDescription(
        `${path}.choices.options[${index}].description`,
        String(row.name ?? name),
        row.description,
        issues,
      )
    }
  }
}

/** Lint seeded or imported JSON blobs for leftover markdown and unwired choices. */
export function lintCompendiumRecords(
  records: unknown[],
  kind: string,
): ContentLintIssue[] {
  const issues: ContentLintIssue[] = []
  for (const [index, raw] of records.entries()) {
    const row = asRecord(raw)
    if (!row) continue
    const name = String(row.name ?? `${kind}[${index}]`)
    const base = `${kind}[${index}]`
    lintDescription(`${base}.description`, name, row.description, issues)

    const features = Array.isArray(row.features) ? row.features : []
    for (const [fi, feature] of features.entries()) {
      const feat = asRecord(feature)
      if (feat) lintFeature(`${base}.features[${fi}]`, feat, issues)
    }
    const traits = Array.isArray(row.traits) ? row.traits : []
    for (const [ti, trait] of traits.entries()) {
      const item = asRecord(trait)
      if (item) lintFeature(`${base}.traits[${ti}]`, item, issues)
    }
    if (asRecord(row.feature)) {
      lintFeature(`${base}.feature`, asRecord(row.feature)!, issues)
    }
  }
  return issues
}

export function summarizeContentLint(issues: ContentLintIssue[]): {
  warnings: number
  infos: number
  leftoverMarkdown: number
  unwiredChoices: number
} {
  return {
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    infos: issues.filter((issue) => issue.severity === "info").length,
    leftoverMarkdown: issues.filter((issue) => issue.message.includes("markdown")).length,
    unwiredChoices: issues.filter((issue) => issue.message.includes("Choice feature")).length,
  }
}
