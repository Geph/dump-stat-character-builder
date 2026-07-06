import type { ImportConfidenceAssessment } from "@/lib/import/assess-import-confidence"
import { applyClassSpellListsToImport } from "@/lib/import/class-spell-lists"
import type { ImportContent } from "@/lib/import/content-schema"
import { enrichImportContentModifiers } from "@/lib/import/enrich-import-modifiers"
import {
  parseClassSpellListDocument,
  type ParsedClassSpellListDocument,
  type ParsedSpellListEntry,
} from "@/lib/import/parse-class-spell-list"

function spellEntryToImportRow(entry: ParsedSpellListEntry, className: string) {
  const components: string[] = []
  if (entry.materialComponent) components.push("M")

  return {
    name: entry.name,
    level: entry.level,
    school: entry.school,
    casting_time: null,
    range: null,
    components: components.length ? components : null,
    duration: null,
    concentration: entry.concentration,
    description: null,
    classes: [className],
  }
}

export function spellListDocumentToImportContent(
  document: ParsedClassSpellListDocument,
): ImportContent {
  const spellNames = document.entries.map((entry) => entry.name)
  const spells = document.entries.map((entry) => spellEntryToImportRow(entry, document.className))

  return {
    classes: [
      {
        name: document.className,
        description: null,
        hit_die: 8,
        primary_ability: null,
        features: [],
        spell_list: spellNames,
      },
    ],
    spells,
  }
}

export function assessSpellListImportConfidence(
  document: ParsedClassSpellListDocument | null,
): ImportConfidenceAssessment {
  if (!document) {
    return {
      level: "low",
      score: 0,
      reasons: ["no spell list table detected"],
      tableFeatureCount: 0,
      matchedTableFeatures: 0,
      segmentedFeatureCount: 0,
      matchRatio: 0,
    }
  }

  const entryCount = document.entries.length
  let score = 40
  const reasons = [`${entryCount} spells parsed from class list`]

  if (document.className) {
    score += 25
    reasons.push(`class name: ${document.className}`)
  }

  const withSchool = document.entries.filter((entry) => entry.school).length
  if (withSchool >= entryCount * 0.9) {
    score += 20
    reasons.push("school column parsed")
  }

  const withFlags = document.entries.filter(
    (entry) => entry.concentration || entry.ritual || entry.materialComponent,
  ).length
  if (withFlags > 0) {
    score += 10
    reasons.push("special column parsed")
  }

  if (entryCount >= 20) score += 10

  const level: ImportConfidenceAssessment["level"] =
    document.className && entryCount >= 10 && score >= 80 ? "high" : entryCount >= 5 ? "partial" : "low"

  return {
    level,
    score,
    reasons,
    tableFeatureCount: entryCount,
    matchedTableFeatures: entryCount,
    segmentedFeatureCount: 0,
    matchRatio: 1,
  }
}

export function extractSpellListImportDeterministic(rawText: string): {
  content: ImportContent
  confidence: ImportConfidenceAssessment
  className: string | null
} {
  const document = parseClassSpellListDocument(rawText)
  const confidence = assessSpellListImportConfidence(document)
  if (!document) {
    return { content: {}, confidence, className: null }
  }

  const content = enrichImportContentModifiers(
    applyClassSpellListsToImport(spellListDocumentToImportContent(document)),
  )

  return {
    content,
    confidence,
    className: document.className,
  }
}
