import type { ImportContent } from "@/lib/import/content-schema"
import type { ClassResourceImportRow } from "@/lib/import/enrich-import-classes"
import {
  parseClassProgressionTable,
  usesConfigForProgressionColumn,
} from "@/lib/import/parse-class-progression-table"
import {
  findClassProgressionTableRegions,
} from "@/lib/import/strip-class-progression-tables"
import {
  findClassSpellListRegions,
  parseClassSpellListFromText,
} from "@/lib/import/parse-class-spell-list"
import { stripHtml } from "@/lib/import/normalize-equipment"

export type PreprocessSubtractedRegion = {
  kind: "progression_table" | "spell_list" | "boilerplate"
  label: string
  charCount: number
}

export type ImportPreprocessStats = {
  inputCharsBefore: number
  inputCharsAfter: number
  estimatedTokensBefore: number
  estimatedTokensAfter: number
  estimatedTokensSaved: number
  savedPercent: number
  subtractedRegions: PreprocessSubtractedRegion[]
  detectedClassName: string | null
}

export type PreprocessImportTextOptions = {
  /** When "classes", run class-focused subtraction. Other hints still strip boilerplate. */
  contentTypeHint?: string | null
}

export type PreprocessImportTextResult = {
  aiText: string
  deterministic: ImportContent
  stats: ImportPreprocessStats
}

function estimateTokens(charCount: number): number {
  return Math.ceil(charCount / 4)
}

/** Detect homebrew class name from common PDF title repetition or heading patterns. */
export function detectClassNameFromImportText(text: string): string | null {
  const head = text.slice(0, 4000)
  const repeatedTab = head.match(/^([A-Z][^\t\n]{2,48})\t\1\b/m)
  if (repeatedTab) return repeatedTab[1].trim()

  const markdownHeading = head.match(/^#{1,2}\s+([A-Z][^\n]{2,48})\s*$/m)
  if (markdownHeading) return markdownHeading[1].trim()

  const theClass = head.match(/\bThe\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/)
  if (theClass && !/battlefield|armaments|fighter/i.test(theClass[1])) {
    return theClass[1].trim()
  }

  const classLine = head.match(
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+Level\s+(?:Progression|Table)\b/,
  )
  if (classLine) return classLine[1].trim()

  return null
}

function stripConservativeBoilerplate(text: string): {
  text: string
  removedChars: number
} {
  let next = text
  const before = next.length

  next = next.replace(/^(?:[^\n]+\t){1,3}[^\n]+\n{2,}/gm, "")
  next = next.replace(/\n{4,}/g, "\n\n\n")
  next = next.replace(/([^\n]{3,40})\t\1(?:\t\1)?\n/g, "")

  return { text: next, removedChars: Math.max(0, before - next.length) }
}

function buildClassResourcesFromTable(
  className: string,
  tableText: string,
): ClassResourceImportRow[] {
  const parsed = parseClassProgressionTable(tableText)
  if (!parsed?.columns.length) return []

  return parsed.columns.map((column) => ({
    class_name: className,
    resource_key: column.resourceKey,
    name: column.resourceName,
    description: `${column.resourceName} progression parsed from the class level table.`,
    uses: usesConfigForProgressionColumn(column, className),
  }))
}

function applyReplacements(
  source: string,
  replacements: { start: number; end: number; placeholder: string }[],
): string {
  if (!replacements.length) return source
  const sorted = [...replacements].sort((a, b) => b.start - a.start)
  let next = source
  for (const replacement of sorted) {
    next =
      next.slice(0, replacement.start) +
      replacement.placeholder +
      next.slice(replacement.end)
  }
  return next
}

function shouldRunClassPreprocess(contentTypeHint: string | null | undefined): boolean {
  if (!contentTypeHint || contentTypeHint === "all") return true
  return contentTypeHint === "classes" || contentTypeHint === "subclasses"
}

/**
 * Strip class regions parseable without AI and build a partial ImportContent to merge later.
 * Class-focused for Phase B (background/equipment subtraction deferred).
 */
export function preprocessImportText(
  text: string,
  options?: PreprocessImportTextOptions,
): PreprocessImportTextResult {
  const inputCharsBefore = text.length
  const subtractedRegions: PreprocessSubtractedRegion[] = []
  const replacements: { start: number; end: number; placeholder: string }[] = []
  const deterministic: ImportContent = {}

  let working = text
  const className = detectClassNameFromImportText(working)
  const runClass = shouldRunClassPreprocess(options?.contentTypeHint)

  const boilerplate = stripConservativeBoilerplate(working)
  if (boilerplate.removedChars > 0) {
    working = boilerplate.text
    subtractedRegions.push({
      kind: "boilerplate",
      label: "Repeated headers / excess whitespace",
      charCount: boilerplate.removedChars,
    })
  }

  if (runClass) {
    const tableRegions = findClassProgressionTableRegions(working)
      .map((region) => ({
        start: region.start,
        end: region.end,
        table: working.slice(region.start, region.end),
      }))
      .sort((a, b) => a.start - b.start)

    for (const region of tableRegions) {
      if (replacements.some((entry) => entry.start <= region.start && entry.end >= region.end)) {
        continue
      }
      replacements.push({
        start: region.start,
        end: region.end,
        placeholder: "\n[Class progression table parsed separately — do not re-extract resource columns]\n",
      })
      subtractedRegions.push({
        kind: "progression_table",
        label: "Class level / resource table",
        charCount: region.end - region.start,
      })

      if (className) {
        const resources = buildClassResourcesFromTable(className, region.table)
        if (resources.length) {
          deterministic.class_resources = [
            ...(deterministic.class_resources ?? []),
            ...resources,
          ]
        }
      }
    }

    for (const spellRegion of findClassSpellListRegions(working)) {
      replacements.push({
        start: spellRegion.start,
        end: spellRegion.end,
        placeholder: `\n[Spell list parsed separately (${spellRegion.spellNames.length} spells)]\n`,
      })
      subtractedRegions.push({
        kind: "spell_list",
        label: spellRegion.heading || "Class spell list",
        charCount: spellRegion.end - spellRegion.start,
      })
    }

    const spellNames = parseClassSpellListFromText(text)
    if (spellNames.length && className) {
      deterministic.classes = [
        {
          name: className,
          description: null,
          hit_die: 8,
          features: [],
          spell_list: spellNames,
        },
      ]
    }
  }

  const aiText = applyReplacements(working, replacements).trim()
  const inputCharsAfter = aiText.length
  const estimatedTokensBefore = estimateTokens(inputCharsBefore)
  const estimatedTokensAfter = estimateTokens(inputCharsAfter)
  const estimatedTokensSaved = Math.max(0, estimatedTokensBefore - estimatedTokensAfter)

  return {
    aiText,
    deterministic,
    stats: {
      inputCharsBefore,
      inputCharsAfter,
      estimatedTokensBefore,
      estimatedTokensAfter,
      estimatedTokensSaved,
      savedPercent:
        inputCharsBefore > 0
          ? Math.round((estimatedTokensSaved / estimatedTokensBefore) * 100)
          : 0,
      subtractedRegions,
      detectedClassName: className,
    },
  }
}

/** Plain-text helper for tests — strip HTML from a region label. */
export function summarizePreprocessRegion(label: string): string {
  return stripHtml(label).replace(/\s+/g, " ").trim()
}
