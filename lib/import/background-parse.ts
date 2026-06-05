import {
  normalizeBackgroundAbilityKey,
  parseBackgroundAbilityScoresLine,
  type BackgroundGrantedSpells,
} from "@/lib/compendium/background-utils"

export type ParsedBackgroundFeature = {
  name: string
  description: string
} | null

/** Extract optional background feature name + description from import HTML/text. */
export function parseBackgroundFeatureFromText(fullText: string): ParsedBackgroundFeature {
  const featureHeading = fullText.match(
    /(?:background\s+)?feature[:\s]*([^\n]+)\n+([\s\S]{20,800}?)(?=\n(?:##|###|\*\*[A-Z])|$)/i,
  )
  if (featureHeading) {
    return {
      name: featureHeading[1].trim().slice(0, 120) || "Background Feature",
      description: featureHeading[2].trim(),
    }
  }

  const namedBlock = fullText.match(
    /\*\*Feature:\*\*\s*([^\n]+)\n+([\s\S]*?)(?=\n\*\*[A-Z]|\n##|$)/i,
  )
  if (namedBlock) {
    return {
      name: namedBlock[1].trim(),
      description: namedBlock[2].trim().replace(/\n+/g, "\n").slice(0, 4000),
    }
  }

  return null
}

const SPELL_NAME_SPLIT = /\s*,\s*|\s+and\s+|\s*;\s*/

/**
 * Parse spell names grouped by level from background import text.
 * Returns level keys ("0" = cantrip) → spell names (resolved to IDs later).
 */
export function parseBackgroundGrantedSpellNames(
  fullText: string,
): { grants_spells: boolean; spells_by_level: Record<string, string[]> } {
  const spells_by_level: Record<string, string[]> = {}
  const addNames = (levelKey: string, chunk: string) => {
    const names = chunk
      .split(SPELL_NAME_SPLIT)
      .map((n) => n.trim().replace(/\*+/g, ""))
      .filter((n) => n.length > 1 && !/^choose\b/i.test(n))
    if (!names.length) return
    spells_by_level[levelKey] = [...(spells_by_level[levelKey] ?? []), ...names]
  }

  const cantripMatch = fullText.match(
    /cantrips?(?:\s+known)?[:\s]+([^\n.]+)/i,
  )
  if (cantripMatch) addNames("0", cantripMatch[1])

  const levelBlockRe =
    /(\d)(?:st|nd|rd|th)?[- ]?level\s+spells?(?:\s+known)?[:\s]+([^\n.]+)/gi
  let levelMatch
  while ((levelMatch = levelBlockRe.exec(fullText))) {
    addNames(levelMatch[1], levelMatch[2])
  }

  const learnSpellRe = /learn(?:\s+the)?\s+([A-Z][^.]+?)\s+spell/gi
  let learnMatch
  while ((learnMatch = learnSpellRe.exec(fullText))) {
    addNames("1", learnMatch[1])
  }

  const magicInitiate = fullText.match(/magic initiate[^.]*\(([^)]+)\)/i)
  if (magicInitiate && /cleric|wizard|druid|warlock|sorcerer|bard|ranger/i.test(magicInitiate[1])) {
    // Spell lists often appear in following paragraphs; scan next 500 chars
    const tail = fullText.slice(fullText.indexOf(magicInitiate[0]), fullText.indexOf(magicInitiate[0]) + 600)
    if (cantripMatch) addNames("0", cantripMatch[1])
    const miLevel1 = tail.match(/1st[- ]level[:\s]+([^\n.]+)/i)
    if (miLevel1) addNames("1", miLevel1[1])
  }

  const grants_spells = Object.keys(spells_by_level).length > 0
  return { grants_spells, spells_by_level }
}

export function resolveGrantedSpellNamesToIds(
  spellsByLevel: Record<string, string[]>,
  catalog: { id: string; name: string }[],
): BackgroundGrantedSpells {
  const byName = new Map(catalog.map((s) => [s.name.toLowerCase(), s.id]))
  const out: BackgroundGrantedSpells = {}

  for (const [level, names] of Object.entries(spellsByLevel)) {
    const ids: string[] = []
    for (const name of names) {
      const id = byName.get(name.toLowerCase())
      if (id && !ids.includes(id)) ids.push(id)
    }
    if (ids.length) out[level] = ids
  }
  return out
}

export function finalizeBackgroundImportRow(
  row: Record<string, unknown>,
  spellCatalog: { id: string; name: string }[],
): Record<string, unknown> {
  const next = { ...row }
  const namesByLevel = next._granted_spell_names as Record<string, string[]> | undefined
  delete next._granted_spell_names

  if (namesByLevel && Object.keys(namesByLevel).length > 0) {
    const resolved = resolveGrantedSpellNamesToIds(namesByLevel, spellCatalog)
    next.granted_spells = resolved
    next.grants_spells = Object.keys(resolved).length > 0
  }

  return next
}

export function parseBackgroundAbilityFromImportText(fullText: string): Record<string, number> | null {
  const abilityMatch = fullText.match(/Ability\s*Scores?[:\s]*([^\n.]+)/i)
  if (abilityMatch) return parseBackgroundAbilityScoresLine(abilityMatch[1])

  const bonuses: Record<string, number> = {}
  const abilities = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]
  for (const ab of abilities) {
    if (fullText.toLowerCase().includes(ab)) {
      const match = fullText.match(new RegExp(`${ab}\\s*\\+?(\\d+)`, "i"))
      if (match) {
        const key = normalizeBackgroundAbilityKey(ab)
        if (key) bonuses[key] = parseInt(match[1], 10)
      }
    }
  }
  return Object.keys(bonuses).length > 0 ? bonuses : null
}
