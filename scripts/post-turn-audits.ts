/**
 * Post-turn audits for import / compendium / character work.
 *
 *   node scripts/run-vite-node.mjs scripts/post-turn-audits.ts --files-from <list>
 *   node scripts/run-vite-node.mjs scripts/post-turn-audits.ts --full
 *
 * Prints a human report on stderr. Last stdout line is JSON for the stop hook.
 */
import { readFileSync } from "node:fs"
import {
  auditShippedResourceGraph,
  resourceGraphMissKey,
  resourceGraphOrphanKey,
} from "@/lib/compendium/audit-resource-graph"
import {
  auditMageHandPressGrantedEquipment,
  grantedEquipmentViolationKey,
} from "@/lib/compendium/audit-granted-equipment"
import { loadKnownAuditBaselineKeys } from "@/lib/compendium/post-turn-audit-baselines"
import {
  resolvePostTurnAuditScope,
  type PostTurnAuditScope,
} from "@/lib/compendium/post-turn-audit-scope"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import {
  collectClassClaimCoverage,
  type ClassClaimCoverageReport,
} from "@/lib/import/feature-claims"
import type { ImportContent } from "@/lib/import/content-schema"
import { loadKibblesTastyPack } from "@/lib/seed-packs/kibbles-tasty/load"
import { loadMageHandPressPack } from "@/lib/seed-packs/mage-hand-press/load"

const VERBOSE = process.argv.includes("--verbose") || process.env.CURSOR_HOOK_VERBOSE === "1"

export type PostTurnAuditMiss = {
  audit: "resource-graph" | "granted-equipment" | "claim-coverage"
  class: string
  feature?: string
  level?: number
  detail: string
}

export type PostTurnAuditPayload = {
  ok: true
  full: boolean
  classes: string[]
  newMisses: PostTurnAuditMiss[]
  knownCounts: {
    resourceGraph: number
    grantedEquipment: number
    claimUnresolved: number
  }
  summary: string
}

function log(...args: unknown[]) {
  if (VERBOSE) console.error("post-turn-audits:", ...args)
}

function parseArgs(argv: string[]) {
  const files: string[] = []
  let full = argv.includes("--full") || argv.includes("--force")
  if (process.env.CURSOR_HOOK_FORCE === "1") full = true
  const filesFromIdx = argv.indexOf("--files-from")
  if (filesFromIdx >= 0 && argv[filesFromIdx + 1]) {
    const raw = readFileSync(argv[filesFromIdx + 1], "utf8")
    files.push(...raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))
  }
  const filesIdx = argv.indexOf("--files")
  if (filesIdx >= 0) {
    files.push(...argv.slice(filesIdx + 1).filter((arg) => !arg.startsWith("--")))
  }
  return { files, forceFull: full }
}

function classFilesForScope(scope: PostTurnAuditScope, files: ImportContent[]): ImportContent[] {
  if (scope.full) return files
  const wanted = new Set(scope.classes.map((name) => name.toLowerCase()))
  return files.filter((content) =>
    (content.classes ?? []).some((cls) => wanted.has(String(cls.name ?? "").trim().toLowerCase())),
  )
}

function claimMisses(reports: ClassClaimCoverageReport[]): PostTurnAuditMiss[] {
  const rows: PostTurnAuditMiss[] = []
  for (const report of reports) {
    const classLabel =
      report.kind === "subclass" && report.parentClassName
        ? `${report.className} (${report.parentClassName})`
        : report.className
    for (const feature of report.features) {
      for (const claim of feature.claims) {
        if (claim.status !== "unresolved") continue
        rows.push({
          audit: "claim-coverage",
          class: classLabel,
          feature: feature.name,
          level: feature.level,
          detail: claim.text.slice(0, 180),
        })
      }
    }
  }
  return rows
}

function formatMiss(row: PostTurnAuditMiss): string {
  const where = row.feature
    ? `${row.class} / ${row.feature}${row.level != null ? ` L${row.level}` : ""}`
    : row.class
  return `- [${row.audit}] ${where}: ${row.detail}`
}

function resolveScope(files: string[], forceFull: boolean): PostTurnAuditScope {
  if (forceFull && !files.length) return { full: true, classes: [] }
  const scoped = resolvePostTurnAuditScope(files)
  if (forceFull && !scoped.classes.length) return { full: true, classes: [] }
  if (forceFull && scoped.full) return { full: true, classes: [] }
  return scoped
}

function main() {
  const { files, forceFull } = parseArgs(process.argv.slice(2))
  const scope = resolveScope(files, forceFull)
  const classNames = scope.full ? null : scope.classes
  log(scope.full ? "full sweep" : `scoped to ${scope.classes.join(", ") || "(none)"}`)

  const known = loadKnownAuditBaselineKeys()

  const resource = auditShippedResourceGraph(classNames)
  const granted = auditMageHandPressGrantedEquipment(classNames)

  const packFiles = classFilesForScope(scope, [
    ...loadMageHandPressPack().files,
    ...loadKibblesTastyPack().files,
  ])
  const claimReports = packFiles.flatMap((file) =>
    collectClassClaimCoverage(enrichImportContentModifiers(file)),
  )
  const unresolvedClaims = claimMisses(claimReports)

  const newResource: PostTurnAuditMiss[] = resource.misses
    .filter((row) => !known.resourceMisses.has(resourceGraphMissKey(row)))
    .map((row) => ({
      audit: "resource-graph",
      class: row.class,
      feature: row.feature,
      level: row.level,
      detail: `${row.resource} — ${row.phrase}`,
    }))
  const newOrphans: PostTurnAuditMiss[] = resource.orphanSpends
    .filter((row) => !known.resourceOrphans.has(resourceGraphOrphanKey(row)))
    .map((row) => ({
      audit: "resource-graph",
      class: row.class,
      feature: row.feature,
      level: row.level,
      detail: `orphan spend ${row.resourceKey}`,
    }))
  const newGranted: PostTurnAuditMiss[] = granted.violations
    .filter((row) => !known.granted.has(grantedEquipmentViolationKey(row)))
    .map((row) => ({
      audit: "granted-equipment",
      class: row.class,
      feature: row.feature,
      level: row.level,
      detail: `${row.kind}: ${row.item}`,
    }))

  const newMisses = [...newResource, ...newOrphans, ...newGranted]
  const knownCounts = {
    resourceGraph: resource.misses.length + resource.orphanSpends.length,
    grantedEquipment: granted.violations.length,
    claimUnresolved: unresolvedClaims.length,
  }
  const scopeLabel = scope.full
    ? "full sweep"
    : `scoped: ${scope.classes.join(", ") || "none"}`
  const summary =
    `post-turn audits (${scopeLabel}): ${newMisses.length} new miss(es); ` +
    `${knownCounts.resourceGraph} resource-graph, ${knownCounts.grantedEquipment} granted-equipment, ` +
    `${knownCounts.claimUnresolved} unresolved claims`

  console.error(summary)
  for (const report of claimReports) {
    const title =
      report.kind === "subclass" && report.parentClassName
        ? `${report.className} (${report.parentClassName} subclass)`
        : report.className
    if (!report.totals.total && !report.totals.unresolved) continue
    console.error(
      `  claim-coverage ${title}: ${report.totals.total} claims, ${report.totals.wired} wired, ${report.totals.unresolved} unresolved, ${report.totals.narrative} narrative`,
    )
  }
  if (VERBOSE) {
    if (resource.misses.length) {
      console.error("resource-graph (current, including known):")
      for (const row of resource.misses) {
        console.error(`  ${row.class} / ${row.feature}: ${row.resource}`)
      }
    }
    if (granted.violations.length) {
      console.error("granted-equipment (current, including known):")
      for (const row of granted.violations) {
        console.error(`  ${row.class} / ${row.item}: ${row.kind}`)
      }
    }
    if (unresolvedClaims.length) {
      console.error("claim-coverage unresolved:")
      for (const row of unresolvedClaims.slice(0, 40)) console.error(`  ${formatMiss(row)}`)
      if (unresolvedClaims.length > 40) {
        console.error(`  … ${unresolvedClaims.length - 40} more`)
      }
    }
  }
  if (newMisses.length) {
    console.error("new misses:")
    for (const row of newMisses) console.error(formatMiss(row))
  }

  const payload: PostTurnAuditPayload = {
    ok: true,
    full: scope.full,
    classes: scope.classes,
    newMisses,
    knownCounts,
    summary,
  }
  process.stdout.write(`${JSON.stringify(payload)}\n`)
}

main()
