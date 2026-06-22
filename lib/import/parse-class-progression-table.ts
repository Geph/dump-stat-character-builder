import { stripHtml } from "@/lib/import/normalize-equipment"
import {
  matchThirdPartyResourceHeader,
  THIRD_PARTY_RESOURCE_PATTERNS,
} from "@/lib/import/third-party-resources"
import type { UsesAtLevel, UsesConfig } from "@/lib/types"

export type ClassProgressionColumn = {
  header: string
  resourceKey: string
  resourceName: string
  valuesByLevel: UsesAtLevel[]
}

export type ParsedClassProgressionTable = {
  columns: ClassProgressionColumn[]
}

export type ProgressionTableFeature = {
  level: number
  name: string
}

const LEVEL_CELL_RE = /^(\d{1,2})(?:st|nd|rd|th)?$/i

const RESOURCE_HEADER_RE =
  /^(?:psi\s+points?|psi\s+limit|rage|ki|focus\s+points?|channel\s+divinity|wild\s+shape|bardic\s+inspiration|sorcery\s+points?|pact\s+magic|spell\s+slots?|maneuvers?|superiority\s+dice|invocations?|lay\s+on\s+hands|second\s+wind|action\s+surge|luck\s+points?|arcane\s+recovery|infusions?)$/i

function slugResourceKey(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
}

function parseLevelCell(cell: string): number | null {
  const trimmed = cell.trim()
  const match = trimmed.match(LEVEL_CELL_RE)
  if (!match) return null
  const level = parseInt(match[1], 10)
  return Number.isFinite(level) && level >= 1 && level <= 20 ? level : null
}

function parseCountCell(cell: string): number | null {
  const trimmed = stripHtml(cell).trim()
  if (!trimmed || trimmed === "—" || trimmed === "-" || trimmed === "─") return null
  const digits = trimmed.match(/^(\d+)$/)
  if (digits) return parseInt(digits[1], 10)
  const prof = trimmed.match(/^\+(\d+)$/)
  if (prof) return null
  return null
}

function parseDieSizeCell(cell: string): number | null {
  const trimmed = stripHtml(cell).trim()
  const match = trimmed.match(/^d(\d+)$/i)
  if (!match) return null
  const sides = parseInt(match[1], 10)
  return Number.isFinite(sides) && sides >= 4 ? sides : null
}

function parseResourceCell(header: string, cell: string): number | null {
  if (/exploit\s*die(?!\s*dice)/i.test(header)) return parseDieSizeCell(cell)
  return parseCountCell(cell)
}

function isLevelHeader(cell: string): boolean {
  return /^level$/i.test(cell.trim())
}

function isResourceHeader(cell: string): boolean {
  const normalized = cell.trim()
  if (!normalized) return false
  if (isLevelHeader(normalized)) return false
  if (/^proficiency/i.test(normalized)) return false
  if (/^features?$/i.test(normalized)) return false
  if (/^cantrips?/i.test(normalized)) return false
  if (/^prepared/i.test(normalized)) return false
  if (/^psionic\s+talents?$/i.test(normalized)) return false
  if (/^spell\s+slots?$/i.test(normalized)) return false
  if (/^fighting\s*styles?$/i.test(normalized)) return false
  if (/^exploits?\s*known$/i.test(normalized)) return false

  const thirdParty = matchThirdPartyResourceHeader(normalized)
  if (thirdParty && thirdParty.resourceKey !== "exploits_known") return true

  return RESOURCE_HEADER_RE.test(normalized) || /\bpoints?\b/i.test(normalized)
}

function resourceKeyForHeader(header: string): string {
  const thirdParty = matchThirdPartyResourceHeader(header)
  if (thirdParty && thirdParty.resourceKey !== "exploits_known") return thirdParty.resourceKey
  return slugResourceKey(header)
}

function isFeaturesHeader(cell: string): boolean {
  return /^features?$/i.test(cell.trim())
}

function splitFeatureNames(cell: string): string[] {
  return stripHtml(cell)
    .split(/,|;/)
    .map((part) => part.replace(/\s*\(\d+\)\s*$/, "").trim())
    .filter((part) => part.length > 1 && !/^[-—─]+$/.test(part))
}

function parseFeatureTableRows(rows: string[][]): ProgressionTableFeature[] {
  if (rows.length < 2) return []

  let headerRowIndex = 0
  for (let i = 0; i < Math.min(rows.length, 4); i++) {
    if (rows[i].some((cell) => isLevelHeader(cell))) {
      headerRowIndex = i
      break
    }
  }

  const headers = rows[headerRowIndex].map((cell) => stripHtml(cell).replace(/\s+/g, " ").trim())
  const levelCol = headers.findIndex((header) => isLevelHeader(header))
  const featuresCol = headers.findIndex((header) => isFeaturesHeader(header))
  if (levelCol < 0 || featuresCol < 0) return []

  const features: ProgressionTableFeature[] = []
  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r]
    const level = parseLevelCell(row[levelCol] ?? "")
    if (level == null) continue
    for (const name of splitFeatureNames(row[featuresCol] ?? "")) {
      features.push({ level, name })
    }
  }
  return features
}

const PLAIN_FEATURE_ROW_RE = /^(\d{1,2}(?:st|nd|rd|th)?)\s+\+\d+\s+(.+?)(?:\t+|$)/i

function parsePlainTextFeatureRows(text: string): ProgressionTableFeature[] {
  const features: ProgressionTableFeature[] = []
  for (const line of text.split(/\n/)) {
    const trimmed = line.trim()
    const match = trimmed.match(PLAIN_FEATURE_ROW_RE)
    if (!match) continue
    const level = parseLevelCell(match[1])
    if (level == null) continue
    const featurePart = (match[2].split(/\t/)[0] ?? match[2]).trim()
    for (const name of splitFeatureNames(featurePart)) {
      features.push({ level, name })
    }
  }
  return features
}

function dedupeProgressionFeatures(features: ProgressionTableFeature[]): ProgressionTableFeature[] {
  const seen = new Set<string>()
  return features.filter((feature) => {
    const key = `${feature.level}::${feature.name.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Read feature names + levels from class progression tables (HTML or plain PDF rows). */
export function parseProgressionTableFeatures(text: string): ProgressionTableFeature[] {
  const source = text ?? ""
  const tableMatch = source.match(/<table[\s\S]*?<\/table>/i)
  if (tableMatch) {
    const fromTable = parseFeatureTableRows(parseHtmlTableRows(tableMatch[0]))
    if (fromTable.length) return dedupeProgressionFeatures(fromTable)
  }
  return dedupeProgressionFeatures(parsePlainTextFeatureRows(source))
}

function parseTableRows(rows: string[][]): ParsedClassProgressionTable | null {
  if (rows.length < 2) return null

  let headerRowIndex = 0
  for (let i = 0; i < Math.min(rows.length, 4); i++) {
    if (rows[i].some((cell) => isLevelHeader(cell))) {
      headerRowIndex = i
      break
    }
  }

  const headers = rows[headerRowIndex].map((cell) => stripHtml(cell).replace(/\s+/g, " ").trim())
  const levelCol = headers.findIndex((header) => isLevelHeader(header))
  if (levelCol < 0) return null

  const resourceCols: { index: number; header: string }[] = []
  headers.forEach((header, index) => {
    if (index === levelCol) return
    if (isResourceHeader(header)) {
      resourceCols.push({ index, header })
    }
  })
  if (resourceCols.length === 0) return null

  const columnData = resourceCols.map((col) => ({
    header: col.header,
    resourceKey: resourceKeyForHeader(col.header),
    resourceName: col.header,
    valuesByLevel: [] as UsesAtLevel[],
  }))

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r]
    const level = parseLevelCell(row[levelCol] ?? "")
    if (level == null) continue

    resourceCols.forEach((col, colIndex) => {
      const count = parseResourceCell(col.header, row[col.index] ?? "")
      if (count == null) return
      const existing = columnData[colIndex].valuesByLevel.find((entry) => entry.level === level)
      if (!existing) {
        columnData[colIndex].valuesByLevel.push({ level, count })
      }
    })
  }

  const columns = columnData.filter((col) => col.valuesByLevel.length > 0)
  if (columns.length === 0) return null
  return { columns }
}

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

function parsePlainTextRows(text: string): string[][] {
  const rows: string[][] = []
  for (const line of text.split(/\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const tabSplit = trimmed.split(/\t+/).map((cell) => cell.trim())
    if (tabSplit.length >= 3 && parseLevelCell(tabSplit[0])) {
      rows.push(tabSplit)
    }
  }
  return rows
}

function parseNumericResourceDataRows(rows: string[][]): ParsedClassProgressionTable | null {
  const psiPoints: UsesAtLevel[] = []
  const psiLimit: UsesAtLevel[] = []

  for (const row of rows) {
    if (row.length < 4) continue
    const level = parseLevelCell(row[0] ?? "")
    if (level == null) continue
    const points = parseCountCell(row[2] ?? "")
    const limit = parseCountCell(row[3] ?? "")
    if (points != null) psiPoints.push({ level, count: points })
    if (limit != null) psiLimit.push({ level, count: limit })
  }

  const columns: ClassProgressionColumn[] = []
  if (psiPoints.length) {
    columns.push({
      header: "Psi Points",
      resourceKey: "psi_points",
      resourceName: "Psi Points",
      valuesByLevel: psiPoints,
    })
  }
  if (psiLimit.length) {
    columns.push({
      header: "Psi Limit",
      resourceKey: "psi_limit",
      resourceName: "Psi Limit",
      valuesByLevel: psiLimit,
    })
  }
  return columns.length ? { columns } : null
}

/** Parse class level tables that include custom resource columns (Psi Points, etc.). */
export function parseClassProgressionTable(text: string): ParsedClassProgressionTable | null {
  const source = text ?? ""
  const tableMatch = source.match(/<table[\s\S]*?<\/table>/i)
  if (tableMatch) {
    const parsed = parseTableRows(parseHtmlTableRows(tableMatch[0]))
    if (parsed) return parsed
  }

  const plainRows = parsePlainTextRows(source)
  if (plainRows.length >= 2) {
    const parsedWithHeader = parseTableRows([
      ["Level", "Proficiency Bonus", "Psi Points", "Psi Limit", "Features"],
      ...plainRows,
    ])
    if (parsedWithHeader) return parsedWithHeader

    const parsedPlain = parseTableRows(plainRows)
    if (parsedPlain) return parsedPlain

    const numeric = parseNumericResourceDataRows(plainRows)
    if (numeric) return numeric
  }

  return null
}

export function usesConfigForProgressionColumn(
  column: ClassProgressionColumn,
  className: string,
): UsesConfig {
  const sorted = [...column.valuesByLevel].sort((a, b) => a.level - b.level)
  const shortAndLong = [{ rest: "short_rest" as const }, { rest: "long_rest" as const }]
  const pattern = THIRD_PARTY_RESOURCE_PATTERNS.find((entry) => entry.resourceKey === column.resourceKey)

  if (/psi\s+limit/i.test(column.header) || column.resourceKey === "psi_limit") {
    return {
      type: "special",
      specialDescription: `Maximum ${column.resourceName.toLowerCase()} spendable on a single psionic power or spell at each ${className} level (see class table).`,
      atLevelTable: sorted,
      atLevelMode: "tier",
    }
  }

  if (column.resourceKey === "exploit_die_size" || /exploit\s*die(?!\s*dice)/i.test(column.header)) {
    const dieLabel = sorted.length
      ? `d${sorted[sorted.length - 1].count}`
      : "d6"
    return {
      type: "special",
      specialDescription: `Exploit die size at each ${className} level (e.g. ${dieLabel}). Not a spendable pool — pairs with Exploit Dice.`,
      atLevelTable: sorted,
      atLevelMode: "tier",
      dieType: dieLabel as UsesConfig["dieType"],
    }
  }

  if (column.resourceKey === "exploit_dice" || /exploit\s*dice/i.test(column.header)) {
    return {
      type: "at_level",
      atLevelMode: "tier",
      atLevelTable: sorted,
      recharges: [{ rest: "short_rest" }],
      ...(pattern?.defaultUses ?? {}),
    }
  }

  if (pattern?.defaultUses) {
    return {
      type: "at_level",
      atLevelMode: "tier",
      atLevelTable: sorted,
      recharges: pattern.defaultUses.recharges ?? shortAndLong,
      ...pattern.defaultUses,
    }
  }

  return {
    type: "at_level",
    atLevelMode: "tier",
    atLevelTable: sorted,
    recharges: shortAndLong,
  }
}
