import { stripHtml } from "@/lib/import/normalize-equipment"

const SPELL_NAME_SPLIT = /\s*,\s*|\s+and\s+|\s*;\s*/g

const SPELL_LIST_HEADING_RE =
  /(?:^|\n)(?:#{1,3}\s*)?(?:[A-Z][^\n]{0,60}\s+)?Spell\s+List[^\n]*\n+/i

const SPELL_TABLE_HEADING_RE =
  /(?:^|\n)(?:#{1,3}\s*)?Spells?\s+(?:Known|Prepared|by\s+Level)[^\n]*\n+/i

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

export type ParsedClassSpellList = {
  heading: string
  spellNames: string[]
  start: number
  end: number
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
      const afterHeading = source.slice(start + match[0].length)
      const nextSection = afterHeading.search(
        /\n(?:#{1,3}\s+[A-Z]|\*\*[A-Z][^*]+\*\*|Class Features|Equipment|Proficiencies|Subclass)/,
      )
      const blockEnd =
        nextSection >= 0 ? start + match[0].length + nextSection : source.length
      const block = source.slice(start + match[0].length, blockEnd)

      const tableMatch = block.match(/<table[\s\S]*?<\/table>/i)
      const spellNames = tableMatch
        ? parseSpellNamesFromTable(tableMatch[0])
        : parseSpellNamesFromProseBlock(block)

      if (spellNames.length >= 3) {
        regions.push({
          heading,
          spellNames,
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

export function parseClassSpellListFromText(text: string): string[] {
  const regions = findClassSpellListRegions(text)
  const names = new Set<string>()
  for (const region of regions) {
    for (const name of region.spellNames) names.add(name)
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}
