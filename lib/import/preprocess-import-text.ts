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
  detectClassNameFromSpellListText,
  findClassSpellListRegions,
  parseClassSpellListDocument,
} from "@/lib/import/parse-class-spell-list"
import { spellListDocumentToImportContent } from "@/lib/import/extract-spell-list-import"
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

/** Strip running heads, page furniture, nav ribbons, and personality d6 tables from background PDF text. */
export function stripBackgroundPdfBoilerplate(text: string): {
  text: string
  removedChars: number
} {
  let next = text
  const before = next.length

  next = next.replace(/Chapter\s+\d+\s*\|\s*[^\n]+/gi, "")
  next = next.replace(/^\s*\d{2,4}\s*$/gm, "")
  next = next.replace(
    /Feats\s*\|\s*Spells\s*\|\s*Races\s*\|\s*Monsters\s*\|\s*NPCs\s*\|\s*Crafting/gi,
    "",
  )
  next = next.replace(
    /(?:^|\n)\s*(?:\*\*)?(?:d6|D6)\s+(Ideals|Bonds|Flaws|Personality Trait)(?:\*\*)?\s*\n[\s\S]*?(?=\n(?:\*\*)?[A-Z][^\n]{2,40}(?:\*\*)?(?:\n|:)|$)/gi,
    "\n",
  )

  return { text: next.trim(), removedChars: Math.max(0, before - next.length) }
}

function shouldRunBackgroundPreprocess(contentTypeHint: string | null | undefined): boolean {
  if (!contentTypeHint || contentTypeHint === "all") return true
  return contentTypeHint === "backgrounds"
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

function shouldRunClassTablePreprocess(contentTypeHint: string | null | undefined): boolean {
  if (!contentTypeHint || contentTypeHint === "all") return true
  return contentTypeHint === "classes" || contentTypeHint === "subclasses"
}

function shouldRunSpellListPreprocess(contentTypeHint: string | null | undefined): boolean {
  if (!contentTypeHint || contentTypeHint === "all") return true
  return (
    contentTypeHint === "classes" ||
    contentTypeHint === "subclasses" ||
    contentTypeHint === "spell_lists"
  )
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
  const runClassTables = shouldRunClassTablePreprocess(options?.contentTypeHint)
  const runSpellLists = shouldRunSpellListPreprocess(options?.contentTypeHint)
  const runBackgroundStrip = shouldRunBackgroundPreprocess(options?.contentTypeHint)

  const boilerplate = stripConservativeBoilerplate(working)
  if (boilerplate.removedChars > 0) {
    working = boilerplate.text
    subtractedRegions.push({
      kind: "boilerplate",
      label: "Repeated headers / excess whitespace",
      charCount: boilerplate.removedChars,
    })
  }

  if (runBackgroundStrip) {
    const backgroundNoise = stripBackgroundPdfBoilerplate(working)
    if (backgroundNoise.removedChars > 0) {
      working = backgroundNoise.text
      subtractedRegions.push({
        kind: "boilerplate",
        label: "Background PDF running heads / personality tables",
        charCount: backgroundNoise.removedChars,
      })
    }
  }

  if (runClassTables) {
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

  }

  if (runSpellLists) {
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

    const document = parseClassSpellListDocument(text)
    if (document) {
      const effectiveClassName =
        options?.contentTypeHint === "spell_lists"
          ? document.className
          : className ?? document.className
      const spellListContent = spellListDocumentToImportContent({
        ...document,
        className: effectiveClassName,
      })
      deterministic.classes = spellListContent.classes
      deterministic.spells = spellListContent.spells
    } else {
      const namesFromRegions = findClassSpellListRegions(text).flatMap((r) => r.spellNames)
      const mergedNames = [...new Set(namesFromRegions)]
      const resolvedClassName = className ?? detectClassNameFromSpellListText(text)
      if (mergedNames.length && resolvedClassName) {
        deterministic.classes = [
          {
            name: resolvedClassName,
            description: null,
            hit_die: 8,
            features: [],
            spell_list: mergedNames,
          },
        ]
      }
    }
  }

  const resolvedClassName =
    deterministic.classes?.[0]?.name ??
    className ??
    (options?.contentTypeHint === "spell_lists" ? detectClassNameFromSpellListText(text) : null)

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
      detectedClassName: resolvedClassName,
    },
  }
}

/** Plain-text helper for tests — strip HTML from a region label. */
export function summarizePreprocessRegion(label: string): string {
  return stripHtml(label).replace(/\s+/g, " ").trim()
}
