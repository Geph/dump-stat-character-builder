import {
  parseClassProgressionTable,
  parseProgressionTableFeatures,
} from "@/lib/import/parse-class-progression-table"

export type ProgressionTableRegion = {
  start: number
  end: number
}

const PLAIN_LEVEL_ROW_RE = /^\d{1,2}(?:st|nd|rd|th)?\s+\+\d+\s+.+/im

/** True when text contains a parseable class level / feature progression table. */
export function isClassLevelProgressionTable(text: string): boolean {
  if (parseClassProgressionTable(text)?.columns.length) return true
  if (parseProgressionTableFeatures(text).length >= 3) return true
  return false
}

function findProgressionTableHtmlRegions(text: string): ProgressionTableRegion[] {
  const regions: ProgressionTableRegion[] = []
  const re = /<table[\s\S]*?<\/table>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(text))) {
    const table = match[0]
    if (isClassLevelProgressionTable(table)) {
      regions.push({ start: match.index, end: match.index + table.length })
    }
  }
  return regions
}

function findProgressionPlainTextRegions(text: string): ProgressionTableRegion[] {
  const lines = text.split("\n")
  const regions: ProgressionTableRegion[] = []
  let runStart = -1
  let charOffset = 0
  const lineStarts: number[] = []

  for (const line of lines) {
    lineStarts.push(charOffset)
    charOffset += line.length + 1
  }

  for (let i = 0; i < lines.length; i++) {
    const isLevelRow = PLAIN_LEVEL_ROW_RE.test(lines[i].trim())
    if (isLevelRow && runStart < 0) {
      runStart = i
    } else if (!isLevelRow && runStart >= 0) {
      if (i - runStart >= 3) {
        const block = lines.slice(runStart, i).join("\n")
        if (isClassLevelProgressionTable(block)) {
          regions.push({
            start: lineStarts[runStart],
            end: lineStarts[i] ?? text.length,
          })
        }
      }
      runStart = -1
    }
  }

  if (runStart >= 0 && lines.length - runStart >= 3) {
    const block = lines.slice(runStart).join("\n")
    if (isClassLevelProgressionTable(block)) {
      regions.push({
        start: lineStarts[runStart],
        end: text.length,
      })
    }
  }

  return regions
}

export function findClassProgressionTableRegions(text: string): ProgressionTableRegion[] {
  const merged = [...findProgressionTableHtmlRegions(text), ...findProgressionPlainTextRegions(text)]
  return merged.sort((a, b) => a.start - b.start)
}

/** Remove class level progression tables from prose — data belongs in features[] and class_resources[]. */
export function stripClassProgressionTablesFromText(text: string): string {
  if (!text?.trim()) return text

  const regions = findClassProgressionTableRegions(text)
  if (!regions.length) return text

  let next = text
  for (const region of [...regions].sort((a, b) => b.start - a.start)) {
    next = next.slice(0, region.start) + next.slice(region.end)
  }

  return next.replace(/\n{3,}/g, "\n\n").trim()
}
