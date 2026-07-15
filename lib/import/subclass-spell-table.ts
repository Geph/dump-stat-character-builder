import { stripHtml } from "@/lib/import/normalize-equipment"

export type SubclassSpellTableRow = {
  unlocksAtClassLevel: number
  spellNames: string[]
}

export type ParsedSubclassSpellTable = {
  rows: SubclassSpellTableRow[]
  /** Spell names flattened across all rows. */
  allSpellNames: string[]
  /**
   * Set when the description contains more than one <table> (e.g. Circle of the Land's
   * "choose one land type, consult that table" pattern — a separate table per subtype
   * option rather than one fixed always-prepared list). Auto-wiring would have to pick
   * one table arbitrarily and silently ignore the rest, which is wrong regardless of
   * which one is picked, so rows are left empty and this is surfaced for manual review
   * instead.
   */
  ambiguousMultiTable?: boolean
  tableCount?: number
}

const SPELL_NAME_SPLIT = /\s*,\s*|\s+and\s+|\s*;\s*/g

const LEVEL_COLUMN_RE =
  /^(?:\d+\s*(?:st|nd|rd|th)?(?:\s*[-–]?\s*level)?|level)$/i

const SPELLS_FEATURE_NAME_RE = /\bspells\b/i

function parseHtmlTableRows(tableHtml: string): string[][] {
  const rows: string[][] = []
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let rowMatch
  while ((rowMatch = rowRe.exec(tableHtml))) {
    const cells: string[] = []
    const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
    let cellMatch
    while ((cellMatch = cellRe.exec(rowMatch[1]))) {
      cells.push(stripHtml(cellMatch[1]).replace(/\s+/g, " ").trim())
    }
    if (cells.length) rows.push(cells)
  }
  return rows
}

function splitSpellNames(chunk: string): string[] {
  return chunk
    .split(SPELL_NAME_SPLIT)
    .map((name) => name.trim().replace(/\*+/g, ""))
    .filter((name) => name.length > 1 && !/^choose\b/i.test(name))
}

function parseLevelCell(cell: string): number | null {
  const trimmed = cell.trim()
  const direct = trimmed.match(/^(\d{1,2})\s*(?:st|nd|rd|th)?(?:\s*[-–]?\s*level)?$/i)
  if (direct) {
    const level = parseInt(direct[1], 10)
    return Number.isFinite(level) && level >= 1 && level <= 20 ? level : null
  }
  const embedded = trimmed.match(/\b(\d{1,2})\s*(?:st|nd|rd|th)\b/i)
  if (embedded) {
    const level = parseInt(embedded[1], 10)
    return Number.isFinite(level) && level >= 1 && level <= 20 ? level : null
  }
  return null
}

function isHeaderRow(row: string[]): boolean {
  if (row.length < 2) return false
  const first = row[0].toLowerCase()
  const second = row[1].toLowerCase()
  return (
    /level/.test(first) ||
    LEVEL_COLUMN_RE.test(first) ||
    /prepared|spell/.test(second)
  )
}

function findLevelColumnIndex(headers: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    if (/level/i.test(headers[i])) return i
  }
  return 0
}

function findSpellsColumnIndex(headers: string[], levelCol: number): number {
  for (let i = 0; i < headers.length; i++) {
    if (i === levelCol) continue
    if (/prepared|spell/i.test(headers[i])) return i
  }
  // Two-column tables: level in col 0, spell names in col 1
  return levelCol === 0 ? 1 : 0
}

function parseTableRows(rows: string[][]): SubclassSpellTableRow[] {
  if (rows.length === 0) return []

  let startIndex = 0
  let levelCol = 0
  let spellsCol = 1

  if (rows.length > 1 && isHeaderRow(rows[0])) {
    levelCol = findLevelColumnIndex(rows[0])
    spellsCol = findSpellsColumnIndex(rows[0], levelCol)
    startIndex = 1
  }

  const parsed: SubclassSpellTableRow[] = []
  for (let r = startIndex; r < rows.length; r++) {
    const row = rows[r]
    if (row.length < 2) continue
    const level = parseLevelCell(row[levelCol] ?? "")
    const spellNames = splitSpellNames(row[spellsCol] ?? "")
    if (level == null || spellNames.length === 0) continue
    parsed.push({ unlocksAtClassLevel: level, spellNames })
  }
  return parsed
}

function parseProseSpellRows(text: string): SubclassSpellTableRow[] {
  const parsed: SubclassSpellTableRow[] = []
  const atLevelRe =
    /(?:at|when you reach)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+\w+\s+level)?[:\s]+([^\n.]+)/gi
  let match
  while ((match = atLevelRe.exec(text))) {
    const level = parseInt(match[1], 10)
    const spellNames = splitSpellNames(match[2])
    if (!Number.isFinite(level) || spellNames.length === 0) continue
    parsed.push({ unlocksAtClassLevel: level, spellNames })
  }
  return parsed
}

function parsePlainTextTableLines(text: string): SubclassSpellTableRow[] {
  const parsed: SubclassSpellTableRow[] = []
  const lines = text.split(/\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const tabSplit = trimmed.split(/\t+/)
    if (tabSplit.length >= 2) {
      const level = parseLevelCell(tabSplit[0])
      const spellNames = splitSpellNames(tabSplit.slice(1).join(", "))
      if (level != null && spellNames.length > 0) {
        parsed.push({ unlocksAtClassLevel: level, spellNames })
        continue
      }
    }
    const spaced = trimmed.match(/^(\d{1,2})\s{2,}(.+)$/)
    if (spaced) {
      const level = parseLevelCell(spaced[1])
      const spellNames = splitSpellNames(spaced[2])
      if (level != null && spellNames.length > 0) {
        parsed.push({ unlocksAtClassLevel: level, spellNames })
      }
    }
  }
  return parsed
}

/**
 * PDF-to-text extraction commonly drops all whitespace between table cells, so a
 * "Cleric Level / Prepared Spells" table collapses into one run like
 * "...Prepared Spells3Aid, Bless, Cure Wounds, Lesser Restoration5Mass Healing Word...".
 * Recover rows by treating "<= 2 digits immediately followed by a capitalized spell
 * name run>" as a level boundary — spell names never start with a digit, and prose
 * digits (30-foot, 2d10, 9th) are never followed directly by an uppercase letter, so
 * this doesn't false-positive outside genuine glued-together tables.
 */
function parseSquishedInlineTableLines(text: string): SubclassSpellTableRow[] {
  const parsed: SubclassSpellTableRow[] = []
  const re = /(\d{1,2})\s*([A-Z][\s\S]*?)(?=\d{1,2}[A-Z]|$)/g
  let match
  while ((match = re.exec(text))) {
    const level = parseLevelCell(match[1])
    const spellNames = splitSpellNames(match[2])
    if (level == null || spellNames.length === 0) continue
    parsed.push({ unlocksAtClassLevel: level, spellNames })
  }
  return parsed
}

/** Whether a subclass feature likely describes an always-prepared spell table. */
export function isSubclassSpellTableFeature(featureName: string, description: string): boolean {
  if (!SPELLS_FEATURE_NAME_RE.test(featureName)) return false
  const text = description ?? ""
  if (/<table/i.test(text)) return true
  if (parseProseSpellRows(text).length > 0) return true
  if (parsePlainTextTableLines(text).length > 0) return true
  if (parseSquishedInlineTableLines(text).length > 0) return true
  return /\b(?:prepared|always have)\b.*\bspell/i.test(text)
}

/** Parse domain/oath/pact spell tables from feature description (HTML or plain text). */
export function parseSubclassSpellTable(description: string): ParsedSubclassSpellTable | null {
  const text = description ?? ""
  let rows: SubclassSpellTableRow[] = []

  const tableMatches = text.match(/<table[\s\S]*?<\/table>/gi)
  if (tableMatches && tableMatches.length > 1) {
    return {
      rows: [],
      allSpellNames: [],
      ambiguousMultiTable: true,
      tableCount: tableMatches.length,
    }
  }

  if (tableMatches && tableMatches.length === 1) {
    rows = parseTableRows(parseHtmlTableRows(tableMatches[0]))
  }

  if (rows.length === 0) {
    rows = parsePlainTextTableLines(text)
  }

  if (rows.length === 0) {
    rows = parseProseSpellRows(text)
  }

  if (rows.length === 0) {
    rows = parseSquishedInlineTableLines(text)
  }

  if (rows.length === 0) return null

  const allSpellNames = [...new Set(rows.flatMap((row) => row.spellNames))]
  return { rows, allSpellNames }
}

export function resolveSpellNamesToIds(
  spellNames: string[],
  catalog: { id: string; name: string }[],
): { resolved: { name: string; spellId: string }[]; missing: string[] } {
  const byName = new Map(catalog.map((spell) => [spell.name.toLowerCase(), spell]))
  const resolved: { name: string; spellId: string }[] = []
  const missing: string[] = []

  for (const name of spellNames) {
    const match = byName.get(name.toLowerCase())
    if (match) {
      if (!resolved.some((entry) => entry.spellId === match.id)) {
        resolved.push({ name: match.name, spellId: match.id })
      }
    } else if (!missing.some((entry) => entry.toLowerCase() === name.toLowerCase())) {
      missing.push(name)
    }
  }

  return { resolved, missing }
}
