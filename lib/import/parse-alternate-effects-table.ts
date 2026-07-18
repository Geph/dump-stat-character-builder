import { stripHtml } from "@/lib/import/normalize-equipment"
import { spellNamePlaceholder } from "@/lib/import/resolve-linked-modifier-spells"
import {
  characteristicCatalogRefId,
} from "@/lib/compendium/modifier-catalog-refs"
import { charInstance, modId } from "@/lib/compendium/modifier-instance-builders"
import { createModifierInstanceId, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"
import type { FeatureChoice } from "@/lib/types"

const SPELL_NAME_SPLIT = /\s*,\s*|\s+and\s+|\s*;\s*/gi

/** Strip Kibbles-style trailing homebrew markers (superscript K → "K"). */
export function stripHomebrewSpellMarker(name: string): string {
  return name.replace(/K$/i, "").trim()
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

function isAlternateEffectsHeader(row: string[]): boolean {
  if (row.length < 2) return false
  const joined = row.join(" ").toLowerCase()
  return (
    /point\s*cost|psi\s*cost|cost/.test(row[0].toLowerCase()) &&
    /alternate\s*effects?|spells?/.test(joined)
  )
}

function looksLikeSpellName(name: string): boolean {
  const trimmed = stripHomebrewSpellMarker(name.trim())
  if (trimmed.length < 2) return false
  if (/^\d+$/.test(trimmed)) return false
  if (/^(point|cost|alternate|effects?|spell)$/i.test(trimmed)) return false
  if (/^(one|two|three|four|five|six|a|an|any|the)\b/i.test(trimmed)) return false
  return true
}

function splitSpellNames(chunk: string): string[] {
  return chunk
    .split(SPELL_NAME_SPLIT)
    .map((name) =>
      stripHomebrewSpellMarker(name.trim().replace(/\*+/g, "").replace(/^(?:and|or)\s+/i, "")),
    )
    .filter(looksLikeSpellName)
}

export type AlternateEffectsCostRow = {
  pointCost: number
  spellNames: string[]
}

/** Parse Point Cost | Alternate Effects rows from an HTML table fragment. */
export function parseAlternateEffectsCostRowsFromTable(tableHtml: string): AlternateEffectsCostRow[] {
  const rows = parseHtmlTableRows(tableHtml)
  if (rows.length < 2 || !isAlternateEffectsHeader(rows[0])) return []
  const out: AlternateEffectsCostRow[] = []
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    const cost = parseInt(row[0], 10)
    if (!Number.isFinite(cost)) continue
    const spellNames = splitSpellNames(row.slice(1).join(", "))
    if (!spellNames.length) continue
    out.push({ pointCost: cost, spellNames })
  }
  return out
}

/**
 * Parse mashed prose lists:
 *   "1—arctic breath, entomb; 2—cold snap; 3—flash freeze, sleet storm"
 */
export function parseAlternateEffectsCostRowsFromProse(text: string): AlternateEffectsCostRow[] {
  const plain = stripHtml(text).replace(/\s+/g, " ").trim()
  if (!plain) return []
  const out: AlternateEffectsCostRow[] = []
  const re = /(\d+)\s*[—–\-:=]\s*([^;]+?)(?=;\s*\d+\s*[—–\-:=]|$)/g
  let match
  while ((match = re.exec(plain))) {
    const pointCost = parseInt(match[1], 10)
    const spellNames = splitSpellNames(match[2])
    if (!Number.isFinite(pointCost) || !spellNames.length) continue
    out.push({ pointCost, spellNames })
  }
  return out
}

function costRowsToHtmlTable(rows: AlternateEffectsCostRow[]): string {
  const body = rows
    .map(
      (row) =>
        `<tr><td>${row.pointCost}</td><td>${row.spellNames.join(", ")}</td></tr>`,
    )
    .join("")
  return `<table><tbody><tr><td>Point Cost</td><td>Alternate Effects</td></tr>${body}</tbody></table>`
}

function uniqueSpellNames(rows: AlternateEffectsCostRow[]): string[] {
  const names: string[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    for (const name of row.spellNames) {
      const key = name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      names.push(name)
    }
  }
  return names
}

/** Description text before any Specializations heading (default AE table lives here). */
export function baseAlternateEffectsSection(description: string): string {
  const split = description.split(/\bSpecializations?\b/i)
  return split[0] ?? description
}

/**
 * Parse Kibbles-style Alternate Effects HTML tables from the default/base section only
 * (specialization replacement tables are handled separately).
 */
export function parseAlternateEffectsSpellNames(
  description: string | null | undefined,
): string[] {
  if (!description || !/<table/i.test(description)) return []

  const section = baseAlternateEffectsSection(description)
  const names: string[] = []
  const seen = new Set<string>()
  const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi
  let tableMatch
  while ((tableMatch = tableRe.exec(section))) {
    for (const row of parseAlternateEffectsCostRowsFromTable(tableMatch[1])) {
      for (const name of row.spellNames) {
        const key = name.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        names.push(name)
      }
    }
  }
  return names
}

export type ParsedSpecializationAlternateEffects = {
  name: string
  bodyHtml: string
  costRows: AlternateEffectsCostRow[]
  descriptionHtml: string
}

function extractSpecializationBlocks(description: string): { name: string; body: string }[] {
  const specsIdx = description.search(/\bSpecializations?\b/i)
  if (specsIdx < 0) return []
  const specsSection = description.slice(specsIdx)

  const blocks: { name: string; body: string }[] = []
  const headingRe =
    /(?:<strong>\s*([A-Z][A-Za-z' -]{1,40}?)\.?\s*<\/strong>|\*\*\s*([A-Z][A-Za-z' -]{1,40}?)\.?\s*\*\*)/g
  const headings: { name: string; index: number; end: number }[] = []
  let headingMatch
  while ((headingMatch = headingRe.exec(specsSection))) {
    const name = (headingMatch[1] ?? headingMatch[2] ?? "").replace(/\.$/, "").trim()
    if (!name || /^(specializations?|alternate effects)$/i.test(name)) continue
    headings.push({
      name,
      index: headingMatch.index,
      end: headingMatch.index + headingMatch[0].length,
    })
  }

  for (let i = 0; i < headings.length; i++) {
    const current = headings[i]
    const next = headings[i + 1]
    const body = specsSection.slice(current.end, next ? next.index : specsSection.length).trim()
    if (!body) continue
    blocks.push({ name: current.name, body })
  }
  return blocks
}

function costRowsFromSpecializationBody(body: string): AlternateEffectsCostRow[] {
  const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi
  let tableMatch
  while ((tableMatch = tableRe.exec(body))) {
    const rows = parseAlternateEffectsCostRowsFromTable(tableMatch[1])
    if (rows.length) return rows
  }
  const replaceClause =
    body.match(
      /(?:replace(?:s|d)?\s+(?:your\s+)?(?:default\s+)?Alternate\s+Effects(?:\s+list)?|replace(?:s|d)?\s+the\s+default\s+table)\s*:?\s*([\s\S]+)/i,
    )?.[1] ?? body
  return parseAlternateEffectsCostRowsFromProse(replaceClause)
}

/**
 * Parse Psychokinesis-style specializations that each replace the Alternate Effects list.
 * Works with HTML tables or mashed prose cost lists.
 */
export function parseSpecializationAlternateEffects(
  description: string | null | undefined,
): ParsedSpecializationAlternateEffects[] {
  if (!description || !/\bSpecializations?\b/i.test(description)) return []

  const out: ParsedSpecializationAlternateEffects[] = []
  for (const block of extractSpecializationBlocks(description)) {
    const costRows = costRowsFromSpecializationBody(block.body)
    if (!costRows.length) continue
    const bodyWithoutTable = block.body
      .replace(/<table[\s\S]*?<\/table>/gi, "")
      .replace(
        /(?:The\s+following\s+list\s+of\s+spells\s+replace[sd]?\s+your\s+Alternate\s+Effects\s+list|Its\s+Alternate\s+Effects\s+replace\s+the\s+default\s+table)\s*:?\s*[\s\S]*$/i,
        "",
      )
      .trim()
    const bodyHtml = bodyWithoutTable.startsWith("<")
      ? bodyWithoutTable
      : `<p>${bodyWithoutTable}</p>`
    const descriptionHtml = `${bodyHtml}${costRowsToHtmlTable(costRows)}`
    out.push({
      name: block.name,
      bodyHtml,
      costRows,
      descriptionHtml,
    })
  }
  return out
}

/** Build a spells_known modifier for Alternate Effects table spells (cast via psi points). */
export function alternateEffectsSpellsKnownModifier(
  spellNames: string[],
  instanceKeyBase: string,
  labelSuffix = "Alternate Effects",
): LinkedModifierInstance | null {
  if (!spellNames.length) return null
  const label =
    spellNames.length <= 4
      ? `${spellNames.join(", ")} (${labelSuffix})`
      : `${labelSuffix} (${spellNames.length} spells, cast with psi points)`
  return charInstance(createModifierInstanceId(), characteristicCatalogRefId("spells_known"), [
    {
      id: modId(`${instanceKeyBase}_alt_effects`),
      type: "spells_known",
      spells: spellNames.map((name) => ({
        spellId: spellNamePlaceholder(name),
        alwaysPrepared: true,
      })),
      alwaysPrepared: true,
      label,
    },
  ])
}

function spellsKnownOnOption(
  spellNames: string[],
  instanceKeyBase: string,
  label: string,
): LinkedModifierInstance[] {
  const mod = alternateEffectsSpellsKnownModifier(spellNames, instanceKeyBase, label)
  return mod ? [mod] : []
}

/**
 * Build a one-time Specialization FeatureChoice from description specializations
 * that replace Alternate Effects lists.
 */
export function specializationChoiceFromDescription(
  description: string | null | undefined,
  instanceKeyBase: string,
): FeatureChoice | null {
  const specs = parseSpecializationAlternateEffects(description)
  if (specs.length < 2) return null
  return {
    category: "Specialization",
    count: 1,
    options: specs.map((spec) => ({
      name: spec.name,
      description: spec.descriptionHtml,
      linkedModifiers: spellsKnownOnOption(
        uniqueSpellNames(spec.costRows),
        `${instanceKeyBase}_${spec.name.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`,
        `${spec.name} Alternate Effects`,
      ),
    })),
  }
}

/**
 * Attach specialization choices without clobbering Discipline Talents.
 * - Empty / already-Specialization choices → write to `choices`
 * - Discipline Talents (or other) present → write to `specialization_choices`
 */
export function applySpecializationAlternateEffectsChoice(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const description = typeof row.description === "string" ? row.description : ""
  const keyBase = String(row.name ?? "discipline")
    .replace(/[^a-z0-9]+/gi, "_")
    .toLowerCase()
  const specialization = specializationChoiceFromDescription(description, keyBase)
  if (!specialization) return row

  const existing = row.choices as FeatureChoice | null | undefined
  const category = existing?.category ?? ""
  const isTalentPool = /talent/i.test(category)
  const isAlreadySpecialization = /specialization/i.test(category)

  if (!existing?.options?.length || isAlreadySpecialization) {
    return {
      ...row,
      isChoice: true,
      is_choice: true,
      choices: specialization,
      specialization_choices: null,
    }
  }

  return {
    ...row,
    specialization_choices: specialization,
  }
}
