import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import {
  parseAbilityKey,
  type CompanionAbilityRow,
  type CompanionNamedBlock,
  type CompanionScaledPart,
  type CompanionScaledValue,
  type CompanionStatBlockTemplate,
} from "@/lib/character/companion-stat-block"

const ABILITY_ORDER: AbilityScoreKey[] = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
]

function stripHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    // Table rows become lines so "<td>Armor Class</td><td>20 …</td>" parses as a stat line.
    .replace(/<\/tr>/gi, "\n")
    .replace(/<em>([^<]+)\.<\/em>/gi, "\n$1. ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\u2212/g, "-")
    .replace(/\u2013|\u2014/g, "-")
}

function normalizeText(text: string): string {
  return stripHtml(text)
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \u00a0]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function parseModifierToken(token: string): number {
  const trimmed = token.trim()
  if (!trimmed || trimmed === "—" || trimmed === "-") return 0
  const match = trimmed.match(/^([+-]?\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

function parseScaledLine(label: string, line: string): CompanionScaledValue | null {
  const normalized = line.replace(/\s+/g, " ").trim()
  const lower = normalized.toLowerCase()

  const parts: CompanionScaledPart[] = []
  let consumed = false

  const fixedMatch = lower.match(/^(\d+)\s+plus\s+/)
  if (fixedMatch) {
    parts.push({ type: "fixed", value: parseInt(fixedMatch[1], 10) })
    consumed = true
  }

  if (/your\s+(\w+)\s+modifier/i.test(normalized)) {
    const abilityMatch = normalized.match(/your\s+(\w+)\s+modifier/i)
    const ability = abilityMatch ? parseAbilityKey(abilityMatch[1]) : null
    if (ability) {
      parts.push({ type: "scale", ref: { kind: "ability_modifier", ability } })
      consumed = true
    }
  }

  const classLevelMatch = lower.match(
    /(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+times?\s+your\s+(\w+)\s+level/i,
  )
  if (classLevelMatch) {
    const wordToNum: Record<string, number> = {
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
    const multRaw = classLevelMatch[1]
    const mult = wordToNum[multRaw] ?? parseInt(multRaw, 10)
    const className = classLevelMatch[2]
    if (Number.isFinite(mult)) {
      parts.push({
        type: "scale",
        ref: { kind: "class_level", className, multiplier: mult },
      })
      consumed = true
    }
  }

  if (!consumed) {
    const single = normalized.match(/^(\d+)\s*$/)
    if (single) {
      parts.push({ type: "fixed", value: parseInt(single[1], 10) })
      consumed = true
    }
  }

  // "20 (natural armor)" — fixed value with a parenthetical note.
  if (!consumed) {
    const withNote = normalized.match(/^(\d+)\s*\(/)
    if (withNote) {
      parts.push({ type: "fixed", value: parseInt(withNote[1], 10) })
      consumed = true
    }
  }

  if (!parts.length) return null
  return { parts, label: normalized }
}

function parseAbilityScoresBlock(text: string): Partial<Record<AbilityScoreKey, CompanionAbilityRow>> {
  const scores: Partial<Record<AbilityScoreKey, CompanionAbilityRow>> = {}
  const lines = text.split("\n")
  for (const line of lines) {
    const match = line.match(
      /^(STR|DEX|CON|INT|WIS|CHA)\s+(\d+)\s+([+-]?\d+|−\d+|\u2212\d+|-)\s+([+-]?\d+|−\d+|\u2212\d+|-)/i,
    )
    if (!match) continue
    const key = parseAbilityKey(match[1])
    if (!key) continue
    scores[key] = {
      score: parseInt(match[2], 10),
      modifier: parseModifierToken(match[3]),
      save: parseModifierToken(match[4]),
    }
  }

  const compactPattern =
    /\b(STR|DEX|CON|INT|WIS|CHA)\s+(\d+)\s*(?:\(([+-]?\d+)\)|([+-]?\d+|−\d+|\u2212\d+|-))/gi
  for (const match of text.matchAll(compactPattern)) {
    const key = parseAbilityKey(match[1])
    if (!key || scores[key]) continue
    const modifier = match[3]
      ? parseInt(match[3], 10)
      : parseModifierToken(match[4] ?? "")
    scores[key] = {
      score: parseInt(match[2], 10),
      modifier,
      save: modifier,
    }
  }

  return scores
}

function parseStatField(label: string, line: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = line.match(new RegExp(`^${escaped}\\s*:?\\s*(.+)$`, "i"))
  return match?.[1]?.trim() ?? line.replace(new RegExp(`^${escaped}\\s*:?\\s*`, "i"), "").trim()
}

function parseHtmlActionBlocks(text: string, heading: string): CompanionNamedBlock[] {
  const re = new RegExp(`\\b${heading}\\s*:`, "i")
  const start = text.search(re)
  if (start < 0) return []

  const afterHeading = text.slice(start).replace(re, "").trim()
  const nextHeading = afterHeading.search(
    /\n(?:Bonus Actions|Actions|Reactions|Traits)\s*:/i,
  )
  const section = nextHeading >= 0 ? afterHeading.slice(0, nextHeading) : afterHeading

  const blocks: CompanionNamedBlock[] = []
  const parts = section.split(/\n(?=[A-Z][A-Za-z' ]+\.\s)|(?<=\.)\s*(?=[A-Z][A-Za-z' ]+\.)/)
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const dot = trimmed.indexOf(".")
    if (dot <= 0) continue
    const name = trimmed.slice(0, dot).trim()
    const description = trimmed.slice(dot + 1).trim()
    if (name.length > 1 && description) {
      blocks.push({ name, description })
    }
  }
  return blocks
}
function splitNamedSections(text: string, heading: string): CompanionNamedBlock[] {
  const htmlBlocks = parseHtmlActionBlocks(text, heading)

  const re = new RegExp(`\\b${heading}\\b`, "i")
  const start = text.search(re)
  if (start < 0) return htmlBlocks

  const afterHeading = text.slice(start + heading.length).trim().replace(/^:\s*/, "")
  const nextHeading = afterHeading.search(/\n(?:Bonus Actions|Actions|Reactions|Traits)\b/i)
  const section = nextHeading >= 0 ? afterHeading.slice(0, nextHeading) : afterHeading

  const proseBlocks: CompanionNamedBlock[] = []
  const parts = section.split(/\n(?=[A-Z][A-Za-z' ]+\.\s)/)
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const dot = trimmed.indexOf(".")
    if (dot <= 0) continue
    const name = trimmed.slice(0, dot).trim()
    const description = trimmed.slice(dot + 1).trim()
    if (name.length > 1 && description) {
      proseBlocks.push({ name, description })
    }
  }

  return proseBlocks.length >= htmlBlocks.length ? proseBlocks : htmlBlocks
}

function parseListField(label: string, text: string): string[] {
  const re = new RegExp(`\\b${label}\\b\\s*([^\\n]+)`, "i")
  const match = text.match(re)
  if (!match) return []
  return match[1]
    .split(/[,;]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function splitImmunities(text: string): { damage: string[]; conditions: string[] } {
  const parts = text.split(";").map((p) => p.trim())
  const damage: string[] = []
  const conditions: string[] = []
  for (const part of parts) {
    const items = part.split(",").map((s) => s.trim()).filter(Boolean)
    for (const item of items) {
      if (/^(charmed|frightened|exhaustion|poisoned|incapacitated|etc)/i.test(item) || item.endsWith("ed")) {
        conditions.push(item.replace(/\.$/, ""))
      } else {
        damage.push(item.replace(/\.$/, ""))
      }
    }
  }
  return { damage, conditions }
}

/**
 * Parse companion stat-block prose into a structured template.
 * Falls back to minimal template when parsing is partial.
 */
export function parseCompanionStatBlock(
  featureName: string,
  description: string,
): CompanionStatBlockTemplate | null {
  const text = normalizeText(description)
  if (!text) return null

  const traitsIdx = text.search(/\bTraits\b/i)
  const header = traitsIdx >= 0 ? text.slice(0, traitsIdx).trim() : text

  const lines = header.split("\n").map((l) => l.trim()).filter(Boolean)
  let sizeTypeAlignment: string | null = null
  let ac: CompanionScaledValue = { parts: [{ type: "fixed", value: 10 }] }
  let hp: CompanionScaledValue = { parts: [{ type: "fixed", value: 1 }] }
  let hitDiceNote: string | null = null
  let speed: string | null = null
  let senses: string | null = null
  let languages: string | null = null
  let cr: string | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lower = line.toLowerCase()

    if (
      !sizeTypeAlignment &&
      !/^ac\b/i.test(line) &&
      !/^armor class\b/i.test(line) &&
      !/^hp\b/i.test(line) &&
      !/^hit points\b/i.test(line) &&
      !/^speed\b/i.test(line) &&
      /medium|small|large|tiny|undead|construct|beast|monstrosity/i.test(line) &&
      /,/.test(line)
    ) {
      sizeTypeAlignment = line
      continue
    }

    if (/^ac\b/i.test(line) || /^armor class\b/i.test(line)) {
      const acText = parseStatField(/^ac\b/i.test(line) ? "AC" : "Armor Class", line)
      ac = parseScaledLine("AC", acText) ?? ac
      continue
    }

    if (/^hp\b/i.test(line) || /^hit points\b/i.test(line)) {
      const hpText = parseStatField(/^hp\b/i.test(line) ? "HP" : "Hit Points", line)
      const paren = hpText.match(/^([^(]+)(?:\(([^)]+)\))?/)
      if (paren) {
        hp = parseScaledLine("HP", paren[1].trim()) ?? hp
        hitDiceNote = paren[2]?.trim() ?? null
      } else {
        hp = parseScaledLine("HP", hpText) ?? hp
      }
      continue
    }

    if (/^speed\b/i.test(line)) {
      speed = parseStatField("Speed", line)
      continue
    }

    if (/^senses\b/i.test(line)) {
      senses = parseStatField("Senses", line)
      continue
    }

    if (/^languages?\b/i.test(line)) {
      languages = parseStatField("Languages", line)
      continue
    }

    if (/^cr\b/i.test(line)) {
      cr = parseStatField("CR", line)
    }
  }

  if (!sizeTypeAlignment) {
    const sizeMatch = header.match(
      /\b(Tiny|Small|Medium|Large|Huge|Gargantuan)\s+[^,\n]+,\s*[^,\n]+/i,
    )
    if (sizeMatch) sizeTypeAlignment = sizeMatch[0].trim()
  }

  if (ac.parts.length === 1 && ac.parts[0]?.type === "fixed" && ac.parts[0].value === 10) {
    const acMatch = header.match(/\bArmor Class:\s*([^\n]+)/i)
    if (acMatch) {
      ac = parseScaledLine("AC", acMatch[1].trim()) ?? ac
    }
  }

  if (hp.parts.length === 1 && hp.parts[0]?.type === "fixed" && hp.parts[0].value === 1) {
    const hpMatch = header.match(/\bHit Points:\s*([^\n]+)/i)
    if (hpMatch) {
      const paren = hpMatch[1].match(/^([^(]+)(?:\(([^)]+)\))?/)
      if (paren) {
        hp = parseScaledLine("HP", paren[1].trim()) ?? hp
        hitDiceNote = paren[2]?.trim() ?? null
      } else {
        hp = parseScaledLine("HP", hpMatch[1].trim()) ?? hp
      }
    }
  }

  if (!speed) {
    speed = header.match(/\bSpeed:\s*([^\n]+)/i)?.[1]?.trim() ?? null
  }

  const abilityScores = parseAbilityScoresBlock(header)

  const resistances = parseListField("Resistances", header)
  const immunitiesRaw = header.match(/\bImmunities?\s*([^\n]+)/i)?.[1] ?? ""
  const { damage: damageImmunities, conditions: conditionImmunities } = splitImmunities(immunitiesRaw)

  const traits = splitNamedSections(text, "Traits")
  const actions = splitNamedSections(text, "Actions")
  const bonusActions = splitNamedSections(text, "Bonus Actions")
  const reactions = splitNamedSections(text, "Reactions")

  const hasStructure =
    traits.length > 0 ||
    actions.length > 0 ||
    bonusActions.length > 0 ||
    Object.keys(abilityScores).length > 0 ||
    ac.parts.some((p) => p.type === "scale") ||
    hp.parts.some((p) => p.type === "scale")

  if (!hasStructure && !isCompanionFeatureName(featureName)) {
    return null
  }

  return {
    name: featureName,
    sizeTypeAlignment,
    ac,
    hp,
    hitDiceNote,
    speed,
    abilityScores: Object.keys(abilityScores).length ? abilityScores : undefined,
    resistances,
    damageImmunities,
    conditionImmunities,
    senses,
    languages,
    cr,
    traits,
    actions,
    bonusActions: bonusActions.length ? bonusActions : undefined,
    reactions: reactions.length ? reactions : undefined,
  }
}

function isCompanionFeatureName(name: string): boolean {
  return /companion|defender|cannon|familiar|homunculus|mount|pet|creature form|golem|cohort/i.test(name)
}

export function templateFromFeature(feature: {
  name: string
  description: string
  companion_stat_block?: CompanionStatBlockTemplate | null
}): CompanionStatBlockTemplate | null {
  if (feature.companion_stat_block) return feature.companion_stat_block
  return parseCompanionStatBlock(feature.name, feature.description)
}

export { ABILITY_ORDER }
