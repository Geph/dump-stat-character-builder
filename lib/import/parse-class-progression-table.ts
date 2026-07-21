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
  /** Die sides (e.g. 8 for d8) when table cells use NdM notation (Risk Dice). */
  dieSidesByLevel?: UsesAtLevel[]
}

export type SpellSlotProgression = {
  casterType: "half" | "full"
  byLevel: { level: number; slots: number[] }[]
}

export type ParsedClassProgressionTable = {
  columns: ClassProgressionColumn[]
  spellSlotProgression?: SpellSlotProgression | null
}

const ORDINAL_SPELL_HEADER_RE = /^(\d+)(?:st|nd|rd|th)$/i

export type ProgressionTableFeature = {
  level: number
  name: string
}

function parseOrdinalSpellLevelHeader(header: string): number | null {
  const match = header.trim().match(ORDINAL_SPELL_HEADER_RE)
  if (!match) return null
  const level = parseInt(match[1], 10)
  return level >= 1 && level <= 9 ? level : null
}

function identifySpellSlotColumns(
  headers: string[],
): { indices: { index: number; spellLevel: number }[]; casterType: "half" | "full" } | null {
  const indices: { index: number; spellLevel: number }[] = []
  for (let index = 0; index < headers.length; index++) {
    const spellLevel = parseOrdinalSpellLevelHeader(headers[index] ?? "")
    if (spellLevel != null) indices.push({ index, spellLevel })
  }
  if (indices.length < 3) return null
  const levels = [...new Set(indices.map((entry) => entry.spellLevel))].sort((a, b) => a - b)
  if (levels[0] !== 1) return null
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] !== levels[i - 1] + 1) return null
  }
  const casterType: "half" | "full" = levels[levels.length - 1] <= 5 ? "half" : "full"
  return { indices, casterType }
}

function isGenericKnownCountHeader(header: string): boolean {
  return /\b\w+\s+known$/i.test(header.trim())
}

function isGenericDieSizeHeader(header: string): boolean {
  const normalized = header.trim()
  if (/risk\s+dice|battle\s+dice|exploit\s+dice|endurance\s+dice/i.test(normalized)) return false
  if (/exploit\s*die(?!\s*dice)/i.test(normalized)) return false
  if (/endurance\s*die\s*size/i.test(normalized)) return false
  if (/\bdice$/i.test(normalized) && !/\bdie\s+size$/i.test(normalized)) return false
  return /\bdie(?:\s+size)?$/i.test(normalized)
}

function columnMostlyDieSizes(rows: string[][], colIndex: number, headerRowIndex: number): boolean {
  let dieCells = 0
  let total = 0
  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const cell = rows[r]?.[colIndex] ?? ""
    if (!stripHtml(cell).trim() || /^[-—─]$/.test(stripHtml(cell).trim())) continue
    total++
    if (parseDieSizeCell(cell) != null) dieCells++
  }
  return total > 0 && dieCells / total >= 0.6
}

function parseSpellSlotProgression(
  rows: string[][],
  headers: string[],
  headerRowIndex: number,
  levelCol: number,
  spellCols: { index: number; spellLevel: number }[],
  casterType: "half" | "full",
): SpellSlotProgression {
  const byLevel: { level: number; slots: number[] }[] = []
  const maxSpellLevel = spellCols[spellCols.length - 1]?.spellLevel ?? 5
  const slotsWidth = maxSpellLevel

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r]
    const level = parseLevelCell(row[levelCol] ?? "")
    if (level == null) continue
    const slots = Array(slotsWidth).fill(0)
    for (const col of spellCols) {
      const count = parseCountCell(row[col.index] ?? "")
      if (count != null && col.spellLevel >= 1 && col.spellLevel <= slotsWidth) {
        slots[col.spellLevel - 1] = count
      }
    }
    if (slots.some((value) => value > 0)) {
      byLevel.push({ level, slots })
    }
  }

  return { casterType, byLevel }
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
  // CR Total style fractions (e.g. 1/4 → 0.25) for thrall caps.
  const fraction = trimmed.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (fraction) {
    const num = parseInt(fraction[1], 10)
    const den = parseInt(fraction[2], 10)
    if (Number.isFinite(num) && Number.isFinite(den) && den > 0) return num / den
  }
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

function parseDicePoolCell(cell: string): { count: number; dieSides: number } | null {
  const trimmed = stripHtml(cell).trim()
  const match = trimmed.match(/^(\d+)d(\d+)$/i)
  if (!match) return null
  const count = parseInt(match[1], 10)
  const dieSides = parseInt(match[2], 10)
  if (!Number.isFinite(count) || !Number.isFinite(dieSides) || dieSides < 4) return null
  return { count, dieSides }
}

function headerUsesDicePool(header: string): boolean {
  return (
    /risk\s*dice/i.test(header) ||
    /battle\s*dice/i.test(header) ||
    /dance\s*die/i.test(header) ||
    /\bfinisher\b/i.test(header)
  )
}

function parseResourceCell(header: string, cell: string): number | null {
  if (headerUsesDicePool(header)) {
    const pool = parseDicePoolCell(cell)
    if (pool) return pool.count
  }
  if (/exploit\s*die(?!\s*dice)/i.test(header)) return parseDieSizeCell(cell)
  if (/endurance\s*die\s*size/i.test(header)) {
    const pool = parseDicePoolCell(cell)
    if (pool) return pool.dieSides
    return parseDieSizeCell(cell)
  }
  if (isGenericDieSizeHeader(header)) return parseDieSizeCell(cell)
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
  if (/^weapon\s+mastery$/i.test(normalized)) return true
  if (/^risk\s+dice$/i.test(normalized)) return true
  if (/^battle\s+dice$/i.test(normalized)) return true
  if (/^spell\s+uses$/i.test(normalized)) return true
  if (/^interrupts?$/i.test(normalized)) return true
  if (/^thralls$/i.test(normalized)) return true
  if (/^cr\s+total$/i.test(normalized)) return true
  if (/^dances?$/i.test(normalized)) return true
  if (/^dance\s+die$/i.test(normalized)) return true
  if (/^tricks?(?:\s+known)?$/i.test(normalized)) return true
  if (/^cantrip\s+bonus\s+dice$/i.test(normalized)) return true
  if (/^arcane\s+surge$/i.test(normalized)) return true
  if (isGenericKnownCountHeader(normalized)) return true
  if (isGenericDieSizeHeader(normalized)) return true

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

  const spellSlotInfo = identifySpellSlotColumns(headers)
  const spellSlotIndexSet = new Set(spellSlotInfo?.indices.map((entry) => entry.index) ?? [])

  const resourceCols: { index: number; header: string }[] = []
  headers.forEach((header, index) => {
    if (index === levelCol) return
    if (spellSlotIndexSet.has(index)) return
    if (parseOrdinalSpellLevelHeader(header) != null) return
    if (isResourceHeader(header)) {
      resourceCols.push({ index, header })
    }
  })

  const columnData = resourceCols.map((col) => ({
    header: col.header,
    resourceKey: resourceKeyForHeader(col.header),
    resourceName: col.header,
    valuesByLevel: [] as UsesAtLevel[],
    dieSidesByLevel: [] as UsesAtLevel[],
  }))

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r]
    const level = parseLevelCell(row[levelCol] ?? "")
    if (level == null) continue

    resourceCols.forEach((col, colIndex) => {
      const cell = row[col.index] ?? ""
      const useDieOnlyColumn =
        !/exploit\s*die(?!\s*dice)/i.test(col.header) &&
        !/endurance\s*die\s*size/i.test(col.header) &&
        (isGenericDieSizeHeader(col.header) || columnMostlyDieSizes(rows, col.index, headerRowIndex))
      if (useDieOnlyColumn) {
        const sides = parseDieSizeCell(cell)
        if (sides == null) return
        const existingDie = columnData[colIndex].dieSidesByLevel.find((entry) => entry.level === level)
        if (!existingDie) {
          columnData[colIndex].dieSidesByLevel.push({ level, count: sides })
        }
        return
      }
      const dicePool = headerUsesDicePool(col.header) ? parseDicePoolCell(cell) : null
      const count = dicePool?.count ?? parseResourceCell(col.header, cell)
      if (count == null) return
      const existing = columnData[colIndex].valuesByLevel.find((entry) => entry.level === level)
      if (!existing) {
        columnData[colIndex].valuesByLevel.push({ level, count })
      }
      if (dicePool) {
        const existingDie = columnData[colIndex].dieSidesByLevel.find((entry) => entry.level === level)
        if (!existingDie) {
          columnData[colIndex].dieSidesByLevel.push({ level, count: dicePool.dieSides })
        }
      }
    })
  }

  const columns = mergeExploitDiceColumns(
    columnData.filter((col) => col.valuesByLevel.length > 0 || (col.dieSidesByLevel?.length ?? 0) > 0),
  )

  const spellSlotProgression =
    spellSlotInfo && spellSlotInfo.indices.length
      ? parseSpellSlotProgression(
          rows,
          headers,
          headerRowIndex,
          levelCol,
          spellSlotInfo.indices,
          spellSlotInfo.casterType,
        )
      : null

  if (columns.length === 0 && !spellSlotProgression?.byLevel.length) return null
  return { columns, spellSlotProgression }
}

/** Merge separate Exploit Die (size) and Exploit Dice (pool) columns into one resource. */
function mergeExploitDiceColumns(columns: ClassProgressionColumn[]): ClassProgressionColumn[] {
  const dieSizeIdx = columns.findIndex(
    (col) =>
      col.resourceKey === "exploit_die_size" || /exploit\s*die(?!\s*dice)/i.test(col.header),
  )
  if (dieSizeIdx < 0) return columns

  const dieSizeCol = columns[dieSizeIdx]
  const diceIdx = columns.findIndex(
    (col, index) =>
      index !== dieSizeIdx &&
      (col.resourceKey === "exploit_dice" || /exploit\s*dice/i.test(col.header)),
  )

  if (diceIdx < 0) {
    return columns
      .filter((_, index) => index !== dieSizeIdx)
      .map((col) =>
        col.resourceKey === "exploit_die_size"
          ? {
              ...col,
              resourceKey: "exploit_dice",
              resourceName: /exploit/i.test(col.resourceName) ? "Exploit Dice" : col.resourceName,
              dieSidesByLevel: dieSizeCol.valuesByLevel.map((row) => ({
                level: row.level,
                count: row.count,
              })),
              valuesByLevel: [],
            }
          : col,
      )
      .filter((col) => col.valuesByLevel.length > 0 || (col.dieSidesByLevel?.length ?? 0) > 0)
  }

  const next = columns.filter((_, index) => index !== dieSizeIdx)
  const adjustedDiceIdx = diceIdx > dieSizeIdx ? diceIdx - 1 : diceIdx
  const diceCol = next[adjustedDiceIdx]
  diceCol.dieSidesByLevel = [
    ...(diceCol.dieSidesByLevel ?? []),
    ...dieSizeCol.valuesByLevel.map((row) => ({ level: row.level, count: row.count })),
  ]
  diceCol.resourceKey = "exploit_dice"
  if (/exploit/i.test(diceCol.resourceName)) diceCol.resourceName = "Exploit Dice"
  return next
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

  if (/risk\s*dice/i.test(column.header) || column.resourceKey === "risk_dice") {
    const dieSides = column.dieSidesByLevel?.length
      ? [...column.dieSidesByLevel].sort((a, b) => a.level - b.level)
      : []
    const latestDie = dieSides[dieSides.length - 1]
    const dieLabel = latestDie ? (`d${latestDie.count}` as unknown as unknown as unknown as UsesConfig["dieType"]) : "d8"
    return {
      type: "at_level",
      atLevelMode: "tier",
      atLevelTable: sorted,
      dieType: dieLabel,
      recharges: shortAndLong,
    }
  }

  if (/^spell\s*uses$/i.test(column.header) || column.resourceKey === "spell_uses") {
    return {
      type: "at_level",
      atLevelMode: "tier",
      atLevelTable: sorted,
      recharges: [{ rest: "long_rest" }],
    }
  }

  if (/^interrupts?$/i.test(column.header) || column.resourceKey === "interrupt") {
    return {
      type: "at_level",
      atLevelMode: "tier",
      atLevelTable: sorted,
      recharges: [{ rest: "short_rest", amount: 1 }, { rest: "long_rest" }],
    }
  }

  if (/^thralls$/i.test(column.header) || column.resourceKey === "thralls") {
    const latest = sorted[sorted.length - 1]
    return {
      type: "special",
      specialDescription: `Maximum thralls under your control at each ${className} level${
        latest ? ` (up to ${latest.count})` : ""
      }. A count cap, not a spendable pool.`,
      atLevelTable: sorted,
      atLevelMode: "tier",
    }
  }

  if (/cr\s*total/i.test(column.header) || column.resourceKey === "thrall_cr_total") {
    const latest = sorted[sorted.length - 1]
    return {
      type: "special",
      specialDescription: `Combined thrall Challenge Rating cap at each ${className} level${
        latest != null ? ` (up to ${latest.count})` : ""
      }. A cap, not a spendable pool.`,
      atLevelTable: sorted,
      atLevelMode: "tier",
    }
  }

  if (/battle\s*dice/i.test(column.header) || column.resourceKey === "battle_dice") {
    const dieSides = column.dieSidesByLevel?.length
      ? [...column.dieSidesByLevel].sort((a, b) => a.level - b.level)
      : []
    const latestDie = dieSides[dieSides.length - 1]
    const dieLabel = latestDie ? (`d${latestDie.count}` as unknown as unknown as unknown as UsesConfig["dieType"]) : "d6"
    return {
      type: "at_level",
      atLevelMode: "tier",
      atLevelTable: sorted,
      dieType: dieLabel,
      dieSidesByLevel: dieSides.length ? dieSides : undefined,
      recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
      rechargeOnInitiative: true,
    }
  }

  if (/^dances?$/i.test(column.header) || column.resourceKey === "dances") {
    return {
      type: "at_level",
      atLevelMode: "tier",
      atLevelTable: sorted,
      recharges: [{ rest: "short_rest", amount: 1 }, { rest: "long_rest" }],
    }
  }

  if (/dance\s*die/i.test(column.header) || column.resourceKey === "dance_die") {
    const dieSides = column.dieSidesByLevel?.length
      ? [...column.dieSidesByLevel].sort((a, b) => a.level - b.level)
      : sorted.map((row) => ({ level: row.level, count: row.count }))
    const latestDie = dieSides[dieSides.length - 1]
    const dieLabel = latestDie ? (`d${latestDie.count}` as UsesConfig["dieType"]) : "d4"
    return {
      type: "special",
      specialDescription: `Dance Die size at each ${className} level (e.g. ${dieLabel}). Rolled by Graceful Dodge and Dance Styles — not a depleting pool (see Dances).`,
      atLevelTable: dieSides,
      atLevelMode: "tier",
      dieType: dieLabel,
      dieSidesByLevel: dieSides,
    }
  }

  if (/cantrip\s*bonus\s*dice/i.test(column.header) || column.resourceKey === "cantrip_bonus_dice") {
    return {
      type: "special",
      specialDescription: `Bonus damage dice Warmage Edge adds to a cantrip damage roll at each ${className} level. A scaling rider, not a depleting pool.`,
      atLevelTable: sorted,
      atLevelMode: "tier",
    }
  }

  if (/^tricks?(?:\s*known)?$/i.test(column.header) || column.resourceKey === "tricks_known") {
    const latest = sorted[sorted.length - 1]
    return {
      type: "special",
      specialDescription: `Number of Warmage Tricks known at each ${className} level${
        latest ? ` (up to ${latest.count})` : ""
      }. A choice count, not a spendable pool.`,
      atLevelTable: sorted,
      atLevelMode: "tier",
    }
  }

  if (/arcane\s*surge/i.test(column.header) || column.resourceKey === "arcane_surge") {
    return {
      type: "at_level",
      atLevelMode: "tier",
      atLevelTable: sorted,
      recharges: [{ rest: "short_rest", amount: 1 }, { rest: "long_rest" }],
    }
  }

  if (column.resourceKey === "ritual_level" || /ritual\s*level/i.test(column.header)) {
    const latest = sorted[sorted.length - 1]
    return {
      type: "special",
      specialDescription: `Maximum spell level you can add to your grimoire and cast as a Ritual at each ${className} level${
        latest ? ` (up to level ${latest.count})` : ""
      }. This is a cap, not a spendable pool.`,
      atLevelTable: sorted,
      atLevelMode: "tier",
    }
  }

  if (column.resourceKey === "finisher" || /\bfinisher\b/i.test(column.header)) {
    const dieSides = column.dieSidesByLevel?.length
      ? [...column.dieSidesByLevel].sort((a, b) => a.level - b.level)
      : []
    const latestDie = dieSides[dieSides.length - 1]
    const dieLabel = latestDie ? (`d${latestDie.count}` as unknown as unknown as unknown as UsesConfig["dieType"]) : "d8"
    const latestCount = sorted[sorted.length - 1]?.count ?? 1
    return {
      type: "special",
      specialDescription: `Bonus damage dealt by your Finisher: ${latestCount}${dieLabel} at the highest tier. The die count scales on the ${className} level table; this is a damage rider, not a spendable pool.`,
      atLevelTable: sorted,
      atLevelMode: "tier",
      dieType: dieLabel,
    }
  }

  if (column.resourceKey === "endurance_die_size" || /endurance\s*die\s*size/i.test(column.header)) {
    const dieLabel = sorted.length ? `d${sorted[sorted.length - 1].count}` : "d8"
    return {
      type: "special",
      specialDescription: `Endurance die size at each ${className} level (e.g. ${dieLabel}). Not a spendable pool — pairs with Endurance Dice.`,
      atLevelTable: sorted,
      atLevelMode: "tier",
      dieType: dieLabel as unknown as unknown as unknown as UsesConfig["dieType"],
    }
  }

  if (column.resourceKey === "primal_manifestations" || /primal\s*manifestations?/i.test(column.header)) {
    const latest = sorted[sorted.length - 1]
    return {
      type: "special",
      specialDescription: `Number of Primal Manifestations known at each ${className} level${
        latest ? ` (up to ${latest.count})` : ""
      }. A choice count, not a spendable pool.`,
      atLevelTable: sorted,
      atLevelMode: "tier",
    }
  }

  if (/_known$/.test(column.resourceKey) || isGenericKnownCountHeader(column.header)) {
    const latest = sorted[sorted.length - 1]
    return {
      type: "special",
      specialDescription: `Number of ${column.resourceName} at each ${className} level${
        latest ? ` (up to ${latest.count})` : ""
      }. A choice count, not a spendable pool.`,
      atLevelTable: sorted,
      atLevelMode: "tier",
    }
  }

  if (
    (column.dieSidesByLevel?.length ?? 0) > 0 &&
    column.valuesByLevel.length === 0 &&
    !/exploit/i.test(column.header)
  ) {
    const dieSides = [...(column.dieSidesByLevel ?? [])].sort((a, b) => a.level - b.level)
    const latestDie = dieSides[dieSides.length - 1]
    const dieLabel = latestDie ? (`d${latestDie.count}` as unknown as unknown as unknown as UsesConfig["dieType"]) : "d6"
    return {
      type: "special",
      specialDescription: `${column.resourceName} die size at each ${className} level (e.g. ${dieLabel}). Pairs with on-hit or spend riders — not a spendable pool count.`,
      atLevelTable: dieSides,
      atLevelMode: "tier",
      dieType: dieLabel,
      dieSidesByLevel: dieSides,
    }
  }

  if (column.resourceKey === "exploit_dice" || /exploit\s*dice/i.test(column.header)) {
    const dieSides = column.dieSidesByLevel?.length
      ? [...column.dieSidesByLevel].sort((a, b) => a.level - b.level)
      : []
    const latestDie = dieSides[dieSides.length - 1]
    const dieLabel = latestDie ? (`d${latestDie.count}` as unknown as unknown as unknown as UsesConfig["dieType"]) : "d6"
    return {
      type: "at_level",
      atLevelMode: "tier",
      atLevelTable: sorted,
      dieSidesByLevel: dieSides.length ? dieSides : undefined,
      dieType: dieLabel,
      recharges: pattern?.defaultUses?.recharges ?? [{ rest: "short_rest" }, { rest: "long_rest" }],
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
