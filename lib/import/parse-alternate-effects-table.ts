import { stripHtml } from "@/lib/import/normalize-equipment"
import { spellNamePlaceholder } from "@/lib/import/resolve-linked-modifier-spells"
import {
  characteristicCatalogRefId,
} from "@/lib/compendium/modifier-catalog-refs"
import { charInstance, modId } from "@/lib/compendium/modifier-instance-builders"
import { createModifierInstanceId, type LinkedModifierInstance } from "@/lib/compendium/linked-modifiers"

const SPELL_NAME_SPLIT = /\s*,\s*|\s+and\s+|\s*;\s*/gi

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
  const trimmed = name.trim()
  if (trimmed.length < 2) return false
  if (/^\d+$/.test(trimmed)) return false
  if (/^(point|cost|alternate|effects?|spell)$/i.test(trimmed)) return false
  if (/^(one|two|three|four|five|six|a|an|any|the)\b/i.test(trimmed)) return false
  return true
}

function splitSpellNames(chunk: string): string[] {
  return chunk
    .split(SPELL_NAME_SPLIT)
    .map((name) => name.trim().replace(/\*+/g, "").replace(/^(?:and|or)\s+/i, ""))
    .filter(looksLikeSpellName)
}

/**
 * Parse Kibbles-style Alternate Effects HTML tables:
 *   Point Cost | Alternate Effects
 *   1          | heroism, longstrider, unlocked potential
 *
 * Returns unique spell names across all cost rows (base/default table only —
 * specialization replacement prose is not HTML and is intentionally ignored).
 */
export function parseAlternateEffectsSpellNames(
  description: string | null | undefined,
): string[] {
  if (!description || !/<table/i.test(description)) return []

  const names: string[] = []
  const seen = new Set<string>()
  const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/gi
  let tableMatch
  while ((tableMatch = tableRe.exec(description))) {
    const rows = parseHtmlTableRows(tableMatch[1])
    if (rows.length < 2) continue
    if (!isAlternateEffectsHeader(rows[0])) continue

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]
      // Cost in col 0, spell list in the remaining cells (usually col 1).
      const spellCell = row.slice(1).join(", ")
      for (const name of splitSpellNames(spellCell)) {
        const key = name.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        names.push(name)
      }
    }
  }
  return names
}

/** Build a spells_known modifier for Alternate Effects table spells (cast via psi points). */
export function alternateEffectsSpellsKnownModifier(
  spellNames: string[],
  instanceKeyBase: string,
): LinkedModifierInstance | null {
  if (!spellNames.length) return null
  const label =
    spellNames.length <= 4
      ? `${spellNames.join(", ")} (Alternate Effects)`
      : `Alternate Effects (${spellNames.length} spells, cast with psi points)`
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
