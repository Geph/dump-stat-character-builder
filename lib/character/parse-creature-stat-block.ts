import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import {
  parseAbilityKey,
  type CompanionAbilityRow,
  type CompanionNamedBlock,
  type CompanionScaledPart,
  type CompanionScaledValue,
  type CompanionStatBlockTemplate,
} from "@/lib/character/companion-stat-block"

const SIZES = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"] as const

export type ParsedCreature = {
  name: string
  creatureType: string | null
  size: string | null
  alignment: string | null
  cr: string | null
  template: CompanionStatBlockTemplate
}

const SECTION_HEADINGS = ["Traits", "Actions", "Bonus Actions", "Reactions", "Legendary Actions"]

const WORD_TO_NUM: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
}

function normalize(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\u2212/g, "-")
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function parseModToken(token: string): number {
  const match = token.trim().match(/^([+-]?\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

function parseMultiplierToken(token: string): number | null {
  const lower = token.toLowerCase()
  if (WORD_TO_NUM[lower] != null) return WORD_TO_NUM[lower]
  const n = parseInt(token, 10)
  return Number.isFinite(n) ? n : null
}

/**
 * Parse AC/HP formulas that may scale with PB or class level:
 * - "12"
 * - "15 plus PB (natural armor)"
 * - "7 + 7 times caregiver's level"
 * - "6 plus six times your Captain level"
 */
export function parseCreatureScaledStat(raw: string): CompanionScaledValue {
  const label = raw.replace(/\s+/g, " ").trim()
  const parts: CompanionScaledPart[] = []

  const fixedPlusPb = label.match(/^(\d+)\s*\+?\s*(?:plus\s+)?PB\b/i)
  if (fixedPlusPb) {
    parts.push({ type: "fixed", value: parseInt(fixedPlusPb[1], 10) })
    parts.push({ type: "scale", ref: { kind: "proficiency_bonus" } })
    return { parts, label }
  }

  const timesLevel = label.match(
    /^(\d+)\s*(?:\+|plus)\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*times?\s+(?:your\s+|the\s+|)?(?:(\w+)(?:['\u2019]?s)?\s+)?(?:caregiver(?:['\u2019]?s)?\s+)?level/i,
  )
  if (timesLevel) {
    const mult = parseMultiplierToken(timesLevel[2])
    if (mult != null) {
      parts.push({ type: "fixed", value: parseInt(timesLevel[1], 10) })
      const className = timesLevel[3]?.trim()
      parts.push({
        type: "scale",
        ref: {
          kind: "class_level",
          ...(className && !/^caregiver$/i.test(className) ? { className } : {}),
          multiplier: mult,
        },
      })
      return { parts, label }
    }
  }

  const fixedMatch = label.match(/^(\d+)/)
  if (fixedMatch) {
    parts.push({ type: "fixed", value: parseInt(fixedMatch[1], 10) })
    return { parts, label }
  }

  return { parts: [{ type: "fixed", value: 10 }], label }
}

/** "Str 14 +2 +2 Dex 15 +2 +2" (score, mod, save) — 2024 MM / Minstrel style. */
function parseInlineAbilityScores(text: string): Partial<Record<AbilityScoreKey, CompanionAbilityRow>> {
  const scores: Partial<Record<AbilityScoreKey, CompanionAbilityRow>> = {}
  const pattern =
    /\b(Str|Dex|Con|Int|Wis|Cha)\b[ \t]+(\d+)[ \t]+([+-]?\d+)[ \t]+([+-]?\d+)/gi
  for (const match of text.matchAll(pattern)) {
    const key = parseAbilityKey(match[1])
    if (!key || scores[key]) continue
    scores[key] = {
      score: parseInt(match[2], 10),
      modifier: parseModToken(match[3]),
      save: parseModToken(match[4]),
    }
  }
  return scores
}

/**
 * Header row + values:
 *   STR DEX CON INT WIS CHA
 *   16 (+3) 10 (+0) 15 (+2) 5 (−3) 12 (+1) 10 (+0)
 */
function parseHeaderAbilityScores(text: string): Partial<Record<AbilityScoreKey, CompanionAbilityRow>> {
  const scores: Partial<Record<AbilityScoreKey, CompanionAbilityRow>> = {}
  const headerMatch = text.match(
    /\bSTR\b[ \t]+\bDEX\b[ \t]+\bCON\b[ \t]+\bINT\b[ \t]+\bWIS\b[ \t]+\bCHA\b/i,
  )
  if (!headerMatch || headerMatch.index == null) return scores

  const after = text.slice(headerMatch.index + headerMatch[0].length)
  const valueRe = /(\d+)\s*\(\s*([+-]?\d+)\s*\)/g
  const keys: AbilityScoreKey[] = [
    "strength",
    "dexterity",
    "constitution",
    "intelligence",
    "wisdom",
    "charisma",
  ]
  let i = 0
  for (const match of after.matchAll(valueRe)) {
    if (i >= keys.length) break
    const modifier = parseInt(match[2], 10)
    scores[keys[i]] = {
      score: parseInt(match[1], 10),
      modifier,
      save: modifier,
    }
    i += 1
  }
  return scores
}

function parseAbilityScores(text: string): Partial<Record<AbilityScoreKey, CompanionAbilityRow>> {
  const inline = parseInlineAbilityScores(text)
  if (Object.keys(inline).length >= 3) return inline
  const header = parseHeaderAbilityScores(text)
  return Object.keys(header).length ? header : inline
}

function findSectionsStart(text: string): number {
  let earliest = -1
  for (const heading of SECTION_HEADINGS) {
    const idx = text.search(new RegExp(`(^|\\n)\\s*${heading}\\b`, "i"))
    if (idx >= 0 && (earliest < 0 || idx < earliest)) earliest = idx
  }
  return earliest
}

function splitNamedBlocks(section: string): CompanionNamedBlock[] {
  const blocks: CompanionNamedBlock[] = []
  // Name. …  OR  1st Level: Name. …  OR  Level 5: Name. …
  const parts = section.split(
    /\n(?=(?:\d+(?:st|nd|rd|th)\s+Level:\s*|Level\s+\d+:\s*)?[A-Z][A-Za-z0-9'’()/ -]*\.\s)/,
  )
  for (const part of parts) {
    const trimmed = part.replace(/\s+/g, " ").trim()
    if (!trimmed) continue
    const dot = trimmed.indexOf(". ")
    if (dot <= 0) continue
    const name = trimmed.slice(0, dot).trim()
    const description = trimmed.slice(dot + 1).trim()
    if (name.length > 1 && name.length <= 80 && description) {
      blocks.push({ name, description })
    }
  }
  return blocks
}

function parseSections(text: string): {
  traits: CompanionNamedBlock[]
  actions: CompanionNamedBlock[]
  bonusActions: CompanionNamedBlock[]
  reactions: CompanionNamedBlock[]
} {
  const result = {
    traits: [] as CompanionNamedBlock[],
    actions: [] as CompanionNamedBlock[],
    bonusActions: [] as CompanionNamedBlock[],
    reactions: [] as CompanionNamedBlock[],
  }

  const found: { heading: string; index: number }[] = []
  for (const heading of SECTION_HEADINGS) {
    const re = new RegExp(`(^|\\n)\\s*${heading}\\b[ \\t]*\\n?`, "i")
    const match = text.match(re)
    if (match && match.index != null) {
      found.push({ heading, index: match.index + match[0].length })
    }
  }
  found.sort((a, b) => a.index - b.index)

  for (let i = 0; i < found.length; i++) {
    const start = found[i].index
    const end =
      i + 1 < found.length ? textIndexOfHeading(text, found[i + 1].heading, start) : text.length
    const body = text.slice(start, end).trim()
    const blocks = splitNamedBlocks(body)
    const key = found[i].heading.toLowerCase()
    if (key === "traits") result.traits = blocks
    else if (key === "actions") result.actions = blocks
    else if (key === "bonus actions") result.bonusActions = blocks
    else if (key === "reactions") result.reactions = blocks
  }

  return result
}

function textIndexOfHeading(text: string, heading: string, from: number): number {
  const re = new RegExp(`(^|\\n)\\s*${heading}\\b`, "i")
  const slice = text.slice(from)
  const idx = slice.search(re)
  return idx >= 0 ? from + idx : text.length
}

function fixedValue(value: number, label?: string): CompanionScaledValue {
  return { parts: [{ type: "fixed", value }], label }
}

function splitImmunities(raw: string): { damage: string[]; conditions: string[] } {
  const damage: string[] = []
  const conditions: string[] = []
  const parts = raw.split(";").map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) {
    damage.push(...parts[0].split(",").map((s) => s.trim()).filter(Boolean))
    conditions.push(...parts.slice(1).join(";").split(",").map((s) => s.trim()).filter(Boolean))
  } else {
    for (const item of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
      if (
        /^(charmed|frightened|exhaustion|poisoned|incapacitated|paralyzed|petrified|restrained|stunned|blinded|deafened|prone|grappled|unconscious)$/i.test(
          item,
        )
      ) {
        conditions.push(item)
      } else {
        damage.push(item)
      }
    }
  }
  return { damage, conditions }
}

/** Parse "Medium or Small Humanoid, Neutral" / "MEDIUM UNDEAD, LAWFUL EVIL". */
function parseSizeTypeAlignment(line: string): {
  size: string | null
  creatureType: string | null
  alignment: string | null
} | null {
  const sizeAlt = SIZES.join("|")
  const match = line.match(
    new RegExp(
      `^(${sizeAlt})(?:\\s+or\\s+(${sizeAlt}))?\\s+(.+?),\\s*(.+)$`,
      "i",
    ),
  )
  if (!match) return null
  const sizeA = titleCase(match[1])
  const sizeB = match[2] ? titleCase(match[2]) : null
  return {
    size: sizeB ? `${sizeA} or ${sizeB}` : sizeA,
    creatureType: titleCaseWords(match[3].trim()),
    alignment: titleCaseWords(match[4].trim()),
  }
}

/**
 * Parse a pasted creature stat block (D&D 2024 MM, companion scaling, and
 * homebrew captain/caregiver layouts) into a structured template.
 */
export function parseCreatureStatBlock(raw: string, fallbackName = ""): ParsedCreature | null {
  const text = normalize(raw)
  if (!text) return null

  const sectionsStart = findSectionsStart(text)
  const header = sectionsStart >= 0 ? text.slice(0, sectionsStart) : text
  const headerLines = header.split("\n").map((l) => l.trim()).filter(Boolean)

  let name = fallbackName.trim()
  let size: string | null = null
  let creatureType: string | null = null
  let alignment: string | null = null
  let ac = fixedValue(10)
  let hp = fixedValue(1)
  let hitDiceNote: string | null = null
  let initiative: string | null = null
  let speed: string | null = null
  let senses: string | null = null
  let languages: string | null = null
  let skills: string | null = null
  let savingThrows: string | null = null
  let proficiencies: string | null = null
  let gear: string | null = null
  let resistances: string[] = []
  let vulnerabilities: string[] = []
  let damageImmunities: string[] = []
  let conditionImmunities: string[] = []
  let cr: string | null = null

  for (let i = 0; i < headerLines.length; i++) {
    const line = headerLines[i]

    const sizeParsed = parseSizeTypeAlignment(line)
    if (sizeParsed && !size) {
      size = sizeParsed.size
      creatureType = sizeParsed.creatureType
      alignment = sizeParsed.alignment
      continue
    }

    if (/^ac\b/i.test(line) || /^armor class\b/i.test(line)) {
      const afterLabel = line.replace(/^(?:ac|armor class)\s*:?\s*/i, "")
      const beforeInit = afterLabel.split(/\binitiative\b/i)[0].trim()
      ac = parseCreatureScaledStat(beforeInit)
      const initMatch = line.match(/initiative\s+([+-]?\d+(?:\s*\(\d+\))?)/i)
      if (initMatch) initiative = initMatch[1].trim()
      continue
    }

    if (/^hp\b/i.test(line) || /^hit points\b/i.test(line)) {
      const afterLabel = line.replace(/^(?:hp|hit points)\s*:?\s*/i, "")
      // Join continuation lines that don't start a new known field.
      let full = afterLabel
      while (i + 1 < headerLines.length && !/^(?:ac|armor class|hp|hit points|speed|str|dex|con|int|wis|cha|mod|skills|senses|languages|cr|challenge|saving|vulnerabilit|immunit|resist|gear|proficienc)/i.test(headerLines[i + 1])) {
        i += 1
        full += " " + headerLines[i]
      }
      const paren = full.match(/^([^(]+)(?:\(([^)]+)\))?/)
      if (paren) {
        hp = parseCreatureScaledStat(paren[1].trim())
        hitDiceNote = paren[2]?.trim() ?? null
        if (!hitDiceNote) {
          const diceNote = full.match(/\(the .+?\)/i)
          if (diceNote) hitDiceNote = diceNote[0].replace(/^\(|\)$/g, "").trim()
        }
      } else {
        hp = parseCreatureScaledStat(full)
      }
      continue
    }

    if (/^speed\b/i.test(line)) {
      speed = line.replace(/^speed\s*:?\s*/i, "").trim()
      continue
    }

    if (/^skills\b/i.test(line)) {
      skills = line.replace(/^skills\s*:?\s*/i, "").trim()
      continue
    }

    if (/^saving throws?\b/i.test(line)) {
      savingThrows = line.replace(/^saving throws?\s*:?\s*/i, "").trim()
      continue
    }

    if (/^proficienc(?:y|ies)\b/i.test(line)) {
      // Skip "Proficiency Bonus (PB) equals…" — capture gear/tool lines only.
      if (/proficiency bonus/i.test(line)) continue
      proficiencies = line.replace(/^proficienc(?:y|ies)\s*:?\s*/i, "").trim()
      continue
    }

    if (/^gear\b/i.test(line)) {
      gear = line.replace(/^gear\s*:?\s*/i, "").trim()
      continue
    }

    if (/^senses\b/i.test(line)) {
      senses = line.replace(/^senses\s*:?\s*/i, "").trim()
      continue
    }

    if (/^languages?\b/i.test(line)) {
      languages = line.replace(/^languages?\s*:?\s*/i, "").trim()
      continue
    }

    if (/^vulnerabilit(?:y|ies)\b/i.test(line)) {
      vulnerabilities = line
        .replace(/^vulnerabilit(?:y|ies)\s*:?\s*/i, "")
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean)
      continue
    }

    if (/^resistances?\b/i.test(line)) {
      resistances = line
        .replace(/^resistances?\s*:?\s*/i, "")
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean)
      continue
    }

    if (/^immunit(?:y|ies)\b/i.test(line)) {
      const rawImm = line.replace(/^immunit(?:y|ies)\s*:?\s*/i, "").trim()
      const split = splitImmunities(rawImm)
      damageImmunities = split.damage
      conditionImmunities = split.conditions
      continue
    }

    if (/^cr\b/i.test(line) || /^challenge\b/i.test(line)) {
      const crMatch = line.match(/^(?:cr|challenge)\s*:?\s*([0-9/]+|None)/i)
      if (crMatch) cr = crMatch[1].trim()
      continue
    }

    // First non-keyword line is the name when not supplied.
    if (!name && !parseSizeTypeAlignment(line) && i === 0) {
      name = line.trim()
    }
  }

  const abilityScores = parseAbilityScores(header)
  const sections = parseSections(sectionsStart >= 0 ? text.slice(sectionsStart) : "")

  if (!name) name = fallbackName.trim() || "Creature"

  const template: CompanionStatBlockTemplate = {
    name,
    sizeTypeAlignment:
      size || creatureType || alignment
        ? [size, creatureType].filter(Boolean).join(" ") + (alignment ? `, ${alignment}` : "")
        : null,
    ac,
    hp,
    hitDiceNote,
    initiative,
    speed,
    abilityScores: Object.keys(abilityScores).length ? abilityScores : undefined,
    resistances: resistances.length ? resistances : undefined,
    vulnerabilities: vulnerabilities.length ? vulnerabilities : undefined,
    damageImmunities: damageImmunities.length ? damageImmunities : undefined,
    conditionImmunities: conditionImmunities.length ? conditionImmunities : undefined,
    senses,
    languages,
    skills,
    savingThrows,
    proficiencies,
    gear,
    cr,
    traits: sections.traits,
    actions: sections.actions,
    bonusActions: sections.bonusActions.length ? sections.bonusActions : undefined,
    reactions: sections.reactions.length ? sections.reactions : undefined,
  }

  return {
    name,
    creatureType,
    size,
    alignment,
    cr,
    template,
  }
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

function titleCaseWords(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => {
      if (/^(or|and|of|the)$/i.test(word)) return word.toLowerCase()
      return titleCase(word)
    })
    .join(" ")
}
