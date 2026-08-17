/**
 * Lint bundled SRD / seed JSON for leftover markdown and unwired choice features.
 * Usage: node scripts/content-lint.mjs
 */
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function isHtml(value) {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

const MARKDOWN_MARKERS = /(?:^|[\s(>])(?:\*\*[^*]+\*\*|_[^_\n]+_|\*[^*\n]+\*)/

function leftoverMarkdown(value) {
  return typeof value === "string" && MARKDOWN_MARKERS.test(value)
}

function featureLooksUnwired(feature) {
  if (!feature?.isChoice) return false
  const options = feature.choices?.options
  const hasOptions = Array.isArray(options) && options.length > 0
  const hasSource = Boolean(feature.choices?.optionsSource)
  const hasModifiers = Array.isArray(feature.linkedModifiers) && feature.linkedModifiers.length > 0
  return !hasOptions && !hasSource && !hasModifiers
}

function walk(records, kind, issues) {
  for (const [index, row] of records.entries()) {
    if (!row || typeof row !== "object") continue
    const name = row.name ?? `${kind}[${index}]`
    const check = (value, pathLabel) => {
      if (!leftoverMarkdown(value)) return
      issues.push({
        severity: "warning",
        path: pathLabel,
        name,
        message: isHtml(value)
          ? "Description mixes HTML with leftover markdown."
          : "Description still contains markdown markers.",
      })
    }
    check(row.description, `${kind}[${index}].description`)
    const features = Array.isArray(row.features) ? row.features : []
    for (const [fi, feature] of features.entries()) {
      check(feature?.description, `${kind}[${index}].features[${fi}].description`)
      if (featureLooksUnwired(feature)) {
        issues.push({
          severity: "info",
          path: `${kind}[${index}].features[${fi}]`,
          name: feature?.name ?? name,
          message: "Choice feature has no options, optionsSource, or linked modifiers.",
        })
      }
    }
  }
}

const dirs = [
  path.join(root, "lib/srd/seed-data"),
  path.join(root, "lib/seed-packs"),
]

const issues = []
for (const dir of dirs) {
  let files = []
  try {
    files = (await readdir(dir)).filter((file) => file.endsWith(".json"))
  } catch {
    continue
  }
  for (const file of files) {
    const raw = JSON.parse(await readFile(path.join(dir, file), "utf8"))
    const records = Array.isArray(raw) ? raw : raw.entries ?? raw.items ?? []
    if (Array.isArray(records)) walk(records, file, issues)
  }
}

const warnings = issues.filter((issue) => issue.severity === "warning")
const infos = issues.filter((issue) => issue.severity === "info")
console.log(`Content lint: ${warnings.length} warning(s), ${infos.length} info(s).`)
for (const issue of issues.slice(0, 40)) {
  console.log(`- [${issue.severity}] ${issue.name}: ${issue.message} (${issue.path})`)
}
if (issues.length > 40) console.log(`…and ${issues.length - 40} more.`)
process.exit(warnings.length ? 1 : 0)
