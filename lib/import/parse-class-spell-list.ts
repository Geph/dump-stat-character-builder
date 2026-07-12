import { stripHtml } from "@/lib/import/normalize-equipment"
import { DEFAULT_SPELL_SCHOOL_NAMES } from "@/lib/compendium/schools-of-magic"

const SPELL_NAME_SPLIT = /\s*,\s*|\s+and\s+|\s*;\s*/g

/** Fixed SRD set for import parsers that need a stable regex. */
export const SPELL_SCHOOLS = DEFAULT_SPELL_SCHOOL_NAMES

const SPELL_SCHOOL_PATTERN = SPELL_SCHOOLS.join("|")

const SPELL_LIST_HEADING_RE =
  /(?:^|\n)(?:#{1,3}\s*)?([A-Z][^\n]{0,60}?)\s+Spell\s+List[^\n]*\n+/i

const SPELL_TABLE_HEADING_RE =
  /(?:^|\n)(?:#{1,3}\s*)?Spells?\s+(?:Known|Prepared|by\s+Level)[^\n]*\n+/i

const LEVEL_SECTION_RE = /^Level\s+(\d+)\s+(.+?)\s+Spells?\s*$/i
const CANTRIP_SECTION_RE =
  /^Cantrips?\s*\([^)]*Level\s+0\s+(.+?)\s+Spells?[^)]*\)\s*$/i

export type ParsedSpellListEntry = {
  name: string
  level: number
  school: string
  concentration: boolean
  ritual: boolean
  materialComponent: boolean
}

export type ParsedClassSpellListDocument = {
  className: string
  heading: string
  entries: ParsedSpellListEntry[]
  start: number
  end: number
}

export type ParsedClassSpellList = {
  heading: string
  spellNames: string[]
  className?: string | null
  entries?: ParsedSpellListEntry[]
  start: number
  end: number
}

function normalizeSpellName(name: string): string {
  return name
    .trim()
    .replace(/\*+/g, "")
    .replace(/\s+/g, " ")
}

function splitSpellNames(chunk: string): string[] {
  return chunk
    .split(SPELL_NAME_SPLIT)
    .map(normalizeSpellName)
    .filter((name) => name.length > 1 && !/^choose\b/i.test(name) && !/^\d/.test(name))
}

function parseSpecialColumn(special: string): {
  concentration: boolean
  ritual: boolean
  materialComponent: boolean
} {
  const normalized = special
    .replace(/[—–\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (!normalized) {
    return { concentration: false, ritual: false, materialComponent: false }
  }
  return {
    concentration: /\bC\b/.test(normalized),
    ritual: /\bR\b/.test(normalized),
    materialComponent: /\bM\b/.test(normalized),
  }
}

function parseSpellListTableRow(
  line: string,
  level: number,
): ParsedSpellListEntry | null {
  const trimmed = stripHtml(line).trim()
  if (!trimmed) return null
  if (/^spell\s+school/i.test(trimmed)) return null
  if (/^\*/.test(trimmed)) return null
  if (/^this section presents/i.test(trimmed)) return null
  if (/^in the special column/i.test(trimmed)) return null
  if (LEVEL_SECTION_RE.test(trimmed) || CANTRIP_SECTION_RE.test(trimmed)) return null

  const tabParts = trimmed.split(/\t+/).map((part) => part.trim()).filter(Boolean)
  if (tabParts.length >= 3) {
    const schoolIndex = tabParts.findIndex((part) =>
      SPELL_SCHOOLS.some((school) => school.toLowerCase() === part.toLowerCase()),
    )
    if (schoolIndex > 0 && schoolIndex < tabParts.length - 1) {
      const name = normalizeSpellName(tabParts.slice(0, schoolIndex).join(" "))
      const school = tabParts[schoolIndex]
      const special = tabParts.slice(schoolIndex + 1).join(", ")
      if (!name) return null
      const flags = parseSpecialColumn(special)
      return { name, level, school, ...flags }
    }
  }

  const schoolMatch = trimmed.match(
    new RegExp(`^(.+?)\\s+(${SPELL_SCHOOL_PATTERN})\\s+(.+)$`, "i"),
  )
  if (!schoolMatch) return null

  const name = normalizeSpellName(schoolMatch[1])
  if (!name) return null
  const school =
    SPELL_SCHOOLS.find((entry) => entry.toLowerCase() === schoolMatch[2].toLowerCase()) ??
    schoolMatch[2]
  const flags = parseSpecialColumn(schoolMatch[3])
  return { name, level, school, ...flags }
}

function classNameFromLevelHeader(line: string): string | null {
  const cantrip = line.match(CANTRIP_SECTION_RE)
  if (cantrip?.[1]) return cantrip[1].trim()
  const level = line.match(LEVEL_SECTION_RE)
  if (level?.[2]) return level[2].trim()
  return null
}

/** Parse PHB-style class spell list tables (Spell / School / Special columns). */
export function parseStructuredSpellListBlock(
  block: string,
  classNameHint?: string | null,
): { className: string | null; entries: ParsedSpellListEntry[] } {
  let className = classNameHint?.trim() || null
  let currentLevel: number | null = null
  const entries: ParsedSpellListEntry[] = []
  const seen = new Set<string>()

  for (const rawLine of block.split(/\n+/)) {
    const line = stripHtml(rawLine).trim()
    if (!line) continue

    if (CANTRIP_SECTION_RE.test(line)) {
      currentLevel = 0
      className = className ?? classNameFromLevelHeader(line)
      continue
    }

    const levelHeader = line.match(LEVEL_SECTION_RE)
    if (levelHeader) {
      currentLevel = Number.parseInt(levelHeader[1], 10)
      className = className ?? classNameFromLevelHeader(line)
      continue
    }

    if (currentLevel == null) continue

    const row = parseSpellListTableRow(line, currentLevel)
    if (!row) continue
    const key = `${row.level}:${row.name.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    entries.push(row)
  }

  return { className, entries }
}

/** Detect class name from a dedicated spell list section heading. */
export function detectClassNameFromSpellListText(text: string): string | null {
  const head = text.slice(0, 8000)
  const listMatch = head.match(
    /(?:^|\n)(?:#{1,3}\s*)?([A-Z][A-Za-z'’]+(?:\s+[A-Z][A-Za-z'’]+)?)\s+Spell\s+List\b/,
  )
  if (listMatch?.[1]) return listMatch[1].trim()

  const levelMatch = head.match(
    /Level\s+\d+\s+([A-Z][A-Za-z'’]+(?:\s+[A-Z][A-Za-z'’]+)?)\s+Spells?\b/,
  )
  if (levelMatch?.[1]) return levelMatch[1].trim()

  return null
}

function classNameFromListHeading(heading: string): string | null {
  const match = heading.match(/([A-Z][A-Za-z'’]+(?:\s+[A-Z][A-Za-z'’]+)?)\s+Spell\s+List/i)
  return match?.[1]?.trim() ?? null
}

function parseSpellNamesFromTable(tableHtml: string): string[] {
  const names = new Set<string>()
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let rowMatch
  while ((rowMatch = rowRe.exec(tableHtml))) {
    const cells: string[] = []
    const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
    let cellMatch
    while ((cellMatch = cellRe.exec(rowMatch[1]))) {
      cells.push(stripHtml(cellMatch[1]).replace(/\s+/g, " ").trim())
    }
    if (cells.length < 2) continue
    const maybeSpells = cells[cells.length - 1]
    if (/spell|cantrip|prepared|level/i.test(cells[0]) && /level|spell/i.test(maybeSpells)) {
      continue
    }
    for (const cell of cells) {
      if (/^\d/.test(cell) || /^level$/i.test(cell)) continue
      for (const name of splitSpellNames(cell)) {
        if (name.length > 2) names.add(name)
      }
    }
  }
  return [...names]
}

function parseSpellNamesFromProseBlock(block: string): string[] {
  const structured = parseStructuredSpellListBlock(block)
  if (structured.entries.length >= 3) {
    return structured.entries.map((entry) => entry.name)
  }

  const names = new Set<string>()
  const lines = block.split(/\n+/)
  for (const line of lines) {
    const trimmed = stripHtml(line).replace(/^[-*•]\s*/, "").trim()
    if (!trimmed || /^level\b/i.test(trimmed)) continue
    if (/^\d+(?:st|nd|rd|th)?\s+level/i.test(trimmed)) {
      const afterLevel = trimmed.replace(/^\d+(?:st|nd|rd|th)?\s*[-–]?\s*level[:\s]*/i, "")
      for (const name of splitSpellNames(afterLevel)) names.add(name)
      continue
    }
    for (const name of splitSpellNames(trimmed)) {
      if (name.length > 2 && !/spell\s+list/i.test(name)) names.add(name)
    }
  }
  return [...names]
}

/** Extract a dedicated class spell list section (heading + following names/table). */
export function findClassSpellListRegions(text: string): ParsedClassSpellList[] {
  const source = text ?? ""
  const regions: ParsedClassSpellList[] = []

  for (const headingRe of [SPELL_LIST_HEADING_RE, SPELL_TABLE_HEADING_RE]) {
    let match: RegExpExecArray | null
    const re = new RegExp(headingRe.source, headingRe.flags + "g")
    while ((match = re.exec(source))) {
      const start = match.index
      const heading = match[0].trim()
      const classNameFromHeading =
        headingRe === SPELL_LIST_HEADING_RE ? classNameFromListHeading(heading) : null
      const afterHeading = source.slice(start + match[0].length)
      const nextSection = afterHeading.search(
        /\n(?:#{1,3}\s+[A-Z]|\*\*[A-Z][^*]+\*\*|Class Features|Equipment|Proficiencies|Subclass)/,
      )
      const blockEnd =
        nextSection >= 0 ? start + match[0].length + nextSection : source.length
      const block = source.slice(start + match[0].length, blockEnd)

      const tableMatch = block.match(/<table[\s\S]*?<\/table>/i)
      const structured = parseStructuredSpellListBlock(block, classNameFromHeading)
      const spellNames =
        structured.entries.length >= 3
          ? structured.entries.map((entry) => entry.name)
          : tableMatch
            ? parseSpellNamesFromTable(tableMatch[0])
            : parseSpellNamesFromProseBlock(block)

      if (spellNames.length >= 3) {
        regions.push({
          heading,
          spellNames,
          className: structured.className ?? classNameFromHeading,
          entries: structured.entries.length >= 3 ? structured.entries : undefined,
          start,
          end: blockEnd,
        })
      }
    }
  }

  regions.sort((a, b) => a.start - b.start)
  const deduped: ParsedClassSpellList[] = []
  for (const region of regions) {
    if (deduped.some((existing) => Math.abs(existing.start - region.start) < 20)) continue
    deduped.push(region)
  }
  return deduped
}

/** Parse the first class spell list document in text (structured table format). */
export function parseClassSpellListDocument(text: string): ParsedClassSpellListDocument | null {
  const regions = findClassSpellListRegions(text)
  const region = regions[0]
  if (!region) return null

  const entries =
    region.entries ??
    region.spellNames.map((name) => ({
      name,
      level: 0,
      school: "Evocation",
      concentration: false,
      ritual: false,
      materialComponent: false,
    }))

  const className =
    region.className ??
    detectClassNameFromSpellListText(text) ??
    classNameFromListHeading(region.heading)

  if (!className || entries.length < 3) return null

  return {
    className,
    heading: region.heading,
    entries,
    start: region.start,
    end: region.end,
  }
}

export function parseClassSpellListFromText(text: string): string[] {
  const document = parseClassSpellListDocument(text)
  if (document) {
    return document.entries.map((entry) => entry.name).sort((a, b) => a.localeCompare(b))
  }

  const regions = findClassSpellListRegions(text)
  const names = new Set<string>()
  for (const region of regions) {
    for (const name of region.spellNames) names.add(name)
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}
