import {
  featureHasModifierPreset,
  featureLooksLikeSpellList,
} from "@/lib/compendium/enrich-srd-class-features"
import type { ImportContent } from "@/lib/import/content-schema"
import {
  collectImportModifierPreviews,
  collectImportModifierReview,
  collectUnmatchedModifierFeatures,
  type ImportModifierReviewRow,
  type ImportUnmatchedFeatureEntry,
} from "@/lib/import/import-modifier-previews"
import { parseClassProgressionTable } from "@/lib/import/parse-class-progression-table"
import {
  isSubclassSpellTableFeature,
  parseSubclassSpellTable,
  resolveSpellNamesToIds,
} from "@/lib/import/subclass-spell-table"
import type { Feature } from "@/lib/types"

export type ImportReportNextStep = {
  severity: "info" | "warning" | "action"
  title: string
  detail: string
}

export type ImportReportSpellTable = {
  featureName: string
  resolvedCount: number
  missingCount: number
  totalCount: number
  resolved: { name: string; unlocksAtClassLevel: number }[]
  missing: { name: string; unlocksAtClassLevel: number }[]
}

export type ImportReportSubclassFeature = {
  name: string
  level: number
  modifierStatus: "linked" | "preset_only" | "text_only"
  linkedModifierCount: number
  spellTable?: ImportReportSpellTable
  notes: string[]
}

export type ImportReportSubclass = {
  name: string
  className: string
  imported: boolean
  features: ImportReportSubclassFeature[]
}

export type ImportReportClass = {
  name: string
  featureCount: number
  resourceNames: string[]
  psiLinkedFeatures: number
  notes: string[]
}

export type ImportReport = {
  summary: {
    totalImported: number
    breakdown: Record<string, number>
    autoWiredModifiers: number
  }
  tokenSavings?: {
    inputCharsBefore: number
    inputCharsAfter: number
    estimatedTokensSaved: number
    savedPercent: number
    chunkCount: number
    aiProvider?: string
    aiModelId?: string
    extractionMode?: "deterministic" | "hybrid" | "ai" | "byo-json"
    cacheHits?: number
    confidence?: {
      level: "high" | "partial" | "low"
      score: number
      matchRatio: number
      matchedTableFeatures: number
      tableFeatureCount: number
    }
    subtractedRegions: { kind: string; label: string; charCount: number }[]
  }
  warnings: string[]
  classes: ImportReportClass[]
  subclasses: ImportReportSubclass[]
  nextSteps: ImportReportNextStep[]
  unmatchedFeatures: ImportUnmatchedFeatureEntry[]
  modifierReview: ImportModifierReviewRow[]
  headline: string
}

function collectClassText(row: Record<string, unknown>): string {
  const parts: string[] = []
  if (typeof row.description === "string") parts.push(row.description)
  const features = row.features
  if (Array.isArray(features)) {
    for (const raw of features) {
      const feature = raw as Feature
      if (typeof feature.description === "string") parts.push(feature.description)
    }
  }
  return parts.join("\n\n")
}

function countPsiLinkedFeatures(features: Feature[]): number {
  return features.filter(
    (feature) =>
      feature.limitedUses?.type === "class_resource" &&
      /psi/i.test(feature.limitedUses.classResourceKey ?? ""),
  ).length
}

function countLinkedModifiers(feature: Feature): number {
  return (feature.linkedModifiers ?? []).reduce(
    (sum, instance) => sum + (instance.characteristics?.length ?? 0),
    0,
  )
}

function countLinkedSpells(feature: Feature): number {
  let count = 0
  for (const instance of feature.linkedModifiers ?? []) {
    for (const char of instance.characteristics ?? []) {
      if (char.type !== "spells_known") continue
      count += (char.spells ?? []).filter((entry) => entry.spellId).length
    }
  }
  return count
}

function analyzeSpellTableFeature(
  feature: Feature,
  spellCatalog: { id: string; name: string }[],
): ImportReportSpellTable | undefined {
  const description = feature.description ?? ""
  if (!isSubclassSpellTableFeature(feature.name ?? "", description)) return undefined

  const parsed = parseSubclassSpellTable(description)
  if (!parsed) return undefined

  const resolved: { name: string; unlocksAtClassLevel: number }[] = []
  const missing: { name: string; unlocksAtClassLevel: number }[] = []

  for (const row of parsed.rows) {
    const { resolved: rowResolved, missing: rowMissing } = resolveSpellNamesToIds(
      row.spellNames,
      spellCatalog,
    )
    for (const spell of rowResolved) {
      if (!resolved.some((entry) => entry.name === spell.name)) {
        resolved.push({ name: spell.name, unlocksAtClassLevel: row.unlocksAtClassLevel })
      }
    }
    for (const name of rowMissing) {
      if (!missing.some((entry) => entry.name === name)) {
        missing.push({ name, unlocksAtClassLevel: row.unlocksAtClassLevel })
      }
    }
  }

  return {
    featureName: feature.name ?? "Subclass Spells",
    resolvedCount: resolved.length,
    missingCount: missing.length,
    totalCount: parsed.allSpellNames.length,
    resolved,
    missing,
  }
}

function analyzeSubclassFeature(
  feature: Feature,
  parentClassName: string,
  subclassName: string,
  spellCatalog: { id: string; name: string }[],
): ImportReportSubclassFeature {
  const notes: string[] = []
  const spellTable = analyzeSpellTableFeature(feature, spellCatalog)
  const linkedSpellCount = countLinkedSpells(feature)
  const linkedModifierCount = countLinkedModifiers(feature)
  const hasPreset = featureHasModifierPreset(parentClassName, subclassName, feature.name ?? "")
  const hasPsiLink =
    feature.limitedUses?.type === "class_resource" &&
    /psi/i.test(feature.limitedUses.classResourceKey ?? "")

  let modifierStatus: ImportReportSubclassFeature["modifierStatus"] = "text_only"
  if (linkedSpellCount > 0 || linkedModifierCount > 0 || hasPsiLink) {
    modifierStatus = "linked"
  } else if (hasPreset) {
    modifierStatus = "preset_only"
  }

  if (linkedModifierCount > 0) {
    notes.push(`Auto-wired ${linkedModifierCount} common modifier${linkedModifierCount === 1 ? "" : "s"}.`)
  }

  if (hasPsiLink) {
    notes.push(
      `Linked to ${feature.limitedUses?.classResourceKey} (${feature.limitedUses?.classResourceAmount ?? 1} per use).`,
    )
  }

  if (spellTable) {
    if (linkedSpellCount > 0) {
      notes.push(`Linked ${linkedSpellCount}/${spellTable.totalCount} always-prepared spells.`)
    } else if (spellTable.resolvedCount > 0) {
      notes.push(`Parsed ${spellTable.resolvedCount} spells from table but none were linked — check compendium.`)
    } else {
      notes.push("Spell table found but no spells matched the compendium.")
    }
  } else if (featureLooksLikeSpellList(feature.name ?? "")) {
    notes.push("Spell-list feature without a parseable table — spells remain reference text only.")
  } else if (modifierStatus === "text_only") {
    notes.push("No common-modifier preset matched — feature is text-only until edited in compendium.")
  }

  return {
    name: feature.name ?? "Feature",
    level: feature.level ?? 1,
    modifierStatus,
    linkedModifierCount,
    spellTable,
    notes,
  }
}

function buildClassReports(
  enrichedClasses: Record<string, unknown>[],
  breakdown: Record<string, number>,
  explicitResources: ClassResourceImportRow[] | undefined,
): ImportReportClass[] {
  return enrichedClasses.map((row) => {
    const className = String(row.name ?? "")
    const features = Array.isArray(row.features) ? (row.features as Feature[]) : []
    const parsed = parseClassProgressionTable(collectClassText(row))
    const explicit = explicitResources?.filter((resource) => resource.class_name === className) ?? []
    const resourceNames = [
      ...new Set([
        ...explicit.map((resource) => resource.name),
        ...(parsed?.columns.map((column) => column.resourceName) ?? []),
      ]),
    ]
    const psiLinked = countPsiLinkedFeatures(features)
    const notes: string[] = []

    if (resourceNames.length > 0) {
      notes.push(
        `${resourceNames.length} class resource${resourceNames.length === 1 ? "" : "s"}: ${resourceNames.join(", ")}.`,
      )
    } else if (collectClassText(row).toLowerCase().includes("psi point")) {
      notes.push("Psi Points mentioned but no progression table was parsed — check class description table formatting.")
    }

    if (psiLinked > 0) {
      notes.push(`${psiLinked} class feature${psiLinked === 1 ? "" : "s"} linked to psi point costs.`)
    }

    const importedResources = breakdown.class_resources ?? 0
    if (importedResources === 0 && resourceNames.length === 0 && /psi/i.test(collectClassText(row))) {
      notes.push("Consider re-importing with the class level table or adding class resources manually.")
    }

    return {
      name: className,
      featureCount: features.length,
      resourceNames,
      psiLinkedFeatures: psiLinked,
      notes,
    }
  })
}

function buildSubclassReports(
  enrichedSubclasses: Record<string, unknown>[],
  classNameById: Map<string, string>,
  skippedSubclasses: { name: string; class_name: string }[],
  spellCatalog: { id: string; name: string }[],
): ImportReportSubclass[] {
  const reports: ImportReportSubclass[] = []

  for (const skipped of skippedSubclasses) {
    reports.push({
      name: skipped.name,
      className: skipped.class_name,
      imported: false,
      features: [],
    })
  }

  for (const row of enrichedSubclasses) {
    const classId = String(row.class_id ?? "")
    const parentClassName = classNameById.get(classId) ?? "Unknown"
    const subclassName = String(row.name ?? "")
    const features = Array.isArray(row.features) ? (row.features as Feature[]) : []

    reports.push({
      name: subclassName,
      className: parentClassName,
      imported: true,
      features: features.map((feature) =>
        analyzeSubclassFeature(feature, parentClassName, subclassName, spellCatalog),
      ),
    })
  }

  return reports
}

function buildNextSteps(
  classReports: ImportReportClass[],
  subclassReports: ImportReportSubclass[],
  warnings: string[],
  content: ImportContent,
): ImportReportNextStep[] {
  const steps: ImportReportNextStep[] = []
  const seenMissingSpells = new Set<string>()

  for (const warning of warnings) {
    steps.push({ severity: "warning", title: "Import warning", detail: warning })
  }

  if ((content.spells?.length ?? 0) > 0 && (breakdownSpellGap(content) ?? 0) > 0) {
    steps.push({
      severity: "info",
      title: "Review imported spells",
      detail: `${content.spells?.length} spells imported. Verify custom Psion spells are assigned to the Psion class list in the compendium.`,
    })
  }

  for (const classReport of classReports) {
    if (classReport.resourceNames.length === 0 && classReport.notes.some((note) => note.includes("Psi Points"))) {
      steps.push({
        severity: "action",
        title: `Add class resources for ${classReport.name}`,
        detail: "Import the class level table (pages with Psi Points / Psi Limit columns) or create Psi Points and Psi Limit in Class Resources.",
      })
    }
  }

  for (const subclass of subclassReports) {
    if (!subclass.imported) {
      steps.push({
        severity: "action",
        title: `Create parent class for ${subclass.name}`,
        detail: `Import or seed the ${subclass.className} class first, then re-import archetypes/subclasses.`,
      })
      continue
    }

    for (const feature of subclass.features) {
      if (!feature.spellTable?.missing.length) continue
      for (const missing of feature.spellTable.missing) {
        const key = missing.name.toLowerCase()
        if (seenMissingSpells.has(key)) continue
        seenMissingSpells.add(key)
        steps.push({
          severity: "action",
          title: `Import or create spell: ${missing.name}`,
          detail: `${subclass.name} (${subclass.className}) lists ${missing.name} at class level ${missing.unlocksAtClassLevel}.`,
        })
      }
    }

    const textOnly = subclass.features.filter((feature) => feature.modifierStatus === "text_only")
    if (textOnly.length > 4) {
      steps.push({
        severity: "info",
        title: `${textOnly.length} ${subclass.name} features are text-only`,
        detail: "Discipline powers and talents may need manual modifier wiring for sheet tracking.",
      })
    }
  }

  return steps
}

function breakdownSpellGap(content: ImportContent): number | null {
  return content.spells?.length ?? null
}

function buildHeadline(
  totalImported: number,
  breakdown: Record<string, number>,
  classReports: ImportReportClass[],
  subclassReports: ImportReportSubclass[],
  autoWiredModifiers: number,
): string {
  const parts = Object.entries(breakdown)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => `${count} ${type}`)
  let base = `Imported ${totalImported} item${totalImported === 1 ? "" : "s"}${parts.length ? `: ${parts.join(", ")}` : ""}`

  const resourceCount = classReports.reduce((sum, row) => sum + row.resourceNames.length, 0)
  const psiLinked =
    classReports.reduce((sum, row) => sum + row.psiLinkedFeatures, 0) +
    subclassReports.reduce(
      (sum, subclass) =>
        sum +
        subclass.features.filter((feature) =>
          feature.notes.some((note) => note.includes("psi point")),
        ).length,
      0,
    )

  if (resourceCount > 0) {
    base += `. Class resources: ${resourceCount} pool${resourceCount === 1 ? "" : "s"} recognized.`
  }
  if (autoWiredModifiers > 0) {
    base += ` ${autoWiredModifiers} auto-wired modifier${autoWiredModifiers === 1 ? "" : "s"}.`
  }
  if (psiLinked > 0) {
    base += ` ${psiLinked} psi-cost feature${psiLinked === 1 ? "" : "s"} linked.`
  }

  return base
}

export function buildImportReport(params: {
  content: ImportContent
  enrichedClasses: Record<string, unknown>[]
  enrichedSubclasses: Record<string, unknown>[]
  classNameById: Map<string, string>
  skippedSubclasses: { name: string; class_name: string }[]
  spellCatalog: { id: string; name: string }[]
  totalImported: number
  breakdown: Record<string, number>
  warnings: string[]
  explicitResources?: ClassResourceImportRow[]
}): ImportReport | undefined {
  const hasDetail =
    (params.content.classes?.length ?? 0) > 0 ||
    (params.content.subclasses?.length ?? 0) > 0 ||
    (params.content.class_resources?.length ?? 0) > 0 ||
    params.skippedSubclasses.length > 0

  if (!hasDetail && params.totalImported === 0) return undefined

  const classes = buildClassReports(
    params.enrichedClasses,
    params.breakdown,
    params.explicitResources,
  )
  const subclasses = buildSubclassReports(
    params.enrichedSubclasses,
    params.classNameById,
    params.skippedSubclasses,
    params.spellCatalog,
  )
  const nextSteps = buildNextSteps(classes, subclasses, params.warnings, params.content)
  const autoWiredModifiers = collectImportModifierPreviews(params.content).length
  const unmatchedFeatures = collectUnmatchedModifierFeatures(params.content)
  const modifierReview = collectImportModifierReview(params.content)

  if (unmatchedFeatures.length > 0) {
    nextSteps.unshift({
      severity: "warning",
      title: `${unmatchedFeatures.length} feature${unmatchedFeatures.length === 1 ? "" : "s"} without modifier links`,
      detail:
        "Open the compendium editor to wire common modifiers for features that stayed text-only.",
    })
  }

  return {
    summary: {
      totalImported: params.totalImported,
      breakdown: params.breakdown,
      autoWiredModifiers,
    },
    warnings: params.warnings,
    classes,
    subclasses,
    nextSteps,
    unmatchedFeatures,
    modifierReview,
    headline: buildHeadline(
      params.totalImported,
      params.breakdown,
      classes,
      subclasses,
      autoWiredModifiers,
    ),
  }
}

export function importReportHasDetail(report: ImportReport): boolean {
  return (
    report.nextSteps.length > 0 ||
    report.classes.length > 0 ||
    report.subclasses.some((subclass) => subclass.features.length > 0) ||
    report.warnings.length > 0 ||
    report.unmatchedFeatures.length > 0
  )
}
