import type { ParsedClassShell } from "@/lib/import/parse-class-shell"
import type { ProgressionTableFeature } from "@/lib/import/parse-class-progression-table"
import type { SegmentedClassFeature } from "@/lib/import/segment-class-features"
import { countMatchedTableFeatures } from "@/lib/import/segment-class-features"

export type ImportConfidenceLevel = "high" | "partial" | "low"

export type ImportConfidenceAssessment = {
  level: ImportConfidenceLevel
  score: number
  reasons: string[]
  tableFeatureCount: number
  matchedTableFeatures: number
  segmentedFeatureCount: number
  matchRatio: number
}

export function shouldAttemptDeterministicImport(contentTypeHint?: string | null): boolean {
  if (!contentTypeHint || contentTypeHint === "all") return true
  return contentTypeHint === "classes" || contentTypeHint === "subclasses"
}

export function assessDeterministicImportConfidence(input: {
  className: string | null
  shell: ParsedClassShell
  tableFeatures: ProgressionTableFeature[]
  segmentedFeatures: SegmentedClassFeature[]
  hasClassResources: boolean
  hasSpellList: boolean
}): ImportConfidenceAssessment {
  let score = 0
  const reasons: string[] = []

  if (input.className) {
    score += 15
    reasons.push("class name detected")
  }

  if (input.shell.hit_die) {
    score += 20
    reasons.push("hit die parsed")
  }

  if (input.shell.saving_throws?.length) {
    score += 10
    reasons.push("saving throws parsed")
  }

  if (input.tableFeatures.length >= 5) {
    score += 20
    reasons.push(`${input.tableFeatures.length} table features`)
  } else if (input.tableFeatures.length >= 3) {
    score += 10
    reasons.push(`${input.tableFeatures.length} table features`)
  }

  const matchedTableFeatures = countMatchedTableFeatures(
    input.tableFeatures,
    input.segmentedFeatures,
  )
  const matchRatio =
    input.tableFeatures.length > 0 ? matchedTableFeatures / input.tableFeatures.length : 0

  if (matchRatio >= 0.8) {
    score += 30
    reasons.push(`${Math.round(matchRatio * 100)}% table features matched to prose`)
  } else if (matchRatio >= 0.5) {
    score += 15
    reasons.push(`${Math.round(matchRatio * 100)}% table features matched to prose`)
  }

  const proseFeatures = input.segmentedFeatures.filter(
    (feature) => feature.description.trim().length >= 20,
  )
  if (proseFeatures.length >= 8) {
    score += 10
    reasons.push(`${proseFeatures.length} prose feature blocks`)
  } else if (proseFeatures.length >= 4) {
    score += 5
  }

  if (input.hasClassResources) {
    score += 5
    reasons.push("resource columns parsed")
  }

  if (input.hasSpellList) {
    score += 5
  }

  let level: ImportConfidenceLevel = "low"
  if (score >= 80 && input.className && input.shell.hit_die && matchRatio >= 0.8) {
    level = "high"
  } else if (score >= 50) {
    level = "partial"
  }

  return {
    level,
    score,
    reasons,
    tableFeatureCount: input.tableFeatures.length,
    matchedTableFeatures,
    segmentedFeatureCount: input.segmentedFeatures.length,
    matchRatio,
  }
}
