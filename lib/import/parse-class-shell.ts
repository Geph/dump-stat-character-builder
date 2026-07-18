import { stripHtml } from "@/lib/import/normalize-equipment"

export type ParsedClassSkillChoices = {
  count: number
  options: string[]
  /** Always-granted skills (e.g. Psionics) that are not part of the player pick. */
  fixed?: string[]
}

export type ParsedClassShell = {
  hit_die: number | null
  saving_throws: string[] | null
  armor_proficiencies: string[] | null
  weapon_proficiencies: string[] | null
  skill_choices: ParsedClassSkillChoices | null
  primary_ability: string[] | null
  description: string | null
}

const ABILITY_NAMES = [
  "Strength",
  "Dexterity",
  "Constitution",
  "Intelligence",
  "Wisdom",
  "Charisma",
] as const

const COUNT_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
}

/** Section headers that end a Skills: proficiency clause. */
const SKILLS_CLAUSE_END =
  /\n\s*(?:Armor|Weapons|Tools?|Equipment|Saving Throws|Languages|Hit Dice|Hit Points|Starting Equipment|Class Features)\b/i

function normalizeText(text: string): string {
  return stripHtml(text).replace(/\s+/g, " ").trim()
}

function parseHitDie(text: string): number | null {
  const match = text.match(/Hit Dice:\s*1d(\d{1,2})/i)
  if (!match) return null
  const value = parseInt(match[1], 10)
  return Number.isFinite(value) && value >= 4 && value <= 12 ? value : null
}

function parseSavingThrows(text: string): string[] | null {
  const match = text.match(/Saving Throws:\s*([^\n]+)/i)
  if (!match) return null
  const found = ABILITY_NAMES.filter((ability) =>
    new RegExp(`\\b${ability}\\b`, "i").test(match[1]),
  )
  return found.length ? [...found] : null
}

function splitProficiencyList(raw: string): string[] {
  return raw
    .split(/,|\band\b/gi)
    .map((entry) => entry.replace(/\.$/, "").trim())
    .filter((entry) => entry.length > 0 && !/^none$/i.test(entry))
}

function parseArmorProficiencies(text: string): string[] | null {
  const match = text.match(/Armor:\s*([^\n]+)/i)
  if (!match) return null
  const items = splitProficiencyList(normalizeText(match[1]))
  return items.length ? items : null
}

function parseWeaponProficiencies(text: string): string[] | null {
  const match = text.match(/Weapons:\s*([^\n]+)/i)
  if (!match) return null
  const items = splitProficiencyList(normalizeText(match[1]))
  return items.length ? items : null
}

function parseCountToken(token: string): number | null {
  const key = token.trim().toLowerCase()
  if (COUNT_WORDS[key] != null) return COUNT_WORDS[key]!
  const value = parseInt(key, 10)
  return Number.isFinite(value) && value >= 1 ? value : null
}

function splitSkillOptions(raw: string): string[] {
  return raw
    .replace(/\bor\b/gi, ",")
    .replace(/\band\b/gi, ",")
    .split(",")
    .map((entry) => entry.replace(/^[.\s]+|[.\s]+$/g, "").trim())
    .filter(
      (entry) =>
        entry.length > 1 &&
        !/^the following$/i.test(entry) &&
        !/^choose\b/i.test(entry),
    )
}

/**
 * Pull the Skills: clause, allowing wrapped lines until the next proficiency/equipment header.
 */
export function extractSkillsClause(text: string): string | null {
  const start = text.search(/\bSkills:\s*/i)
  if (start < 0) return null
  const afterLabel = text.slice(start).replace(/^Skills:\s*/i, "")
  const endMatch = afterLabel.search(SKILLS_CLAUSE_END)
  const clause = endMatch >= 0 ? afterLabel.slice(0, endMatch) : afterLabel
  const normalized = normalizeText(clause)
  // Truncate at a sentence-ending period that closes the skill list (Religion.).
  const period = normalized.search(/\.\s+[A-Z]/)
  return period >= 0 ? normalized.slice(0, period + 1).replace(/\.$/, "").trim() : normalized.replace(/\.$/, "").trim()
}

/**
 * Parse PHB / Kibbles / LaserLlama skill proficiency lines into skill_choices.
 *
 * Examples:
 * - Skills: Choose two: Acrobatics, Athletics, Perception, and Stealth
 * - Skills: Choose three from Arcana, Deception, History, …
 * - Skills: Choose two of the following: Animal Handling, Athletics, …
 * - Skills: Psionics, and choose two from Deception, History, …
 */
export function parseSkillChoices(text: string): ParsedClassSkillChoices | null {
  const body = extractSkillsClause(text)
  if (!body) return null

  const fixedChoose = body.match(
    /^(.+?),\s*and\s+choose\s+(\w+|\d+)\s+(?:from|of(?:\s+the\s+following)?)\s*:?\s*(.+)$/i,
  )
  if (fixedChoose) {
    const fixed = splitSkillOptions(fixedChoose[1])
    const count = parseCountToken(fixedChoose[2])
    const options = splitSkillOptions(fixedChoose[3])
    if (count && options.length) {
      return fixed.length ? { count, options, fixed } : { count, options }
    }
  }

  const choose = body.match(
    /^Choose\s+(\w+|\d+)\s*(?::|(?:\s+from)|(?:\s+of(?:\s+the\s+following)?))\s*:?\s*(.+)$/i,
  )
  if (choose) {
    const count = parseCountToken(choose[1])
    const options = splitSkillOptions(choose[2])
    if (count && options.length) return { count, options }
  }

  return null
}

/**
 * Prefer an existing structured skill_choices row; otherwise parse Skills: prose.
 * Merges `fixed` from prose when the structured row omitted it.
 */
export function resolveClassSkillChoices(
  existing: ParsedClassSkillChoices | null | undefined,
  textSources: Array<string | null | undefined>,
): ParsedClassSkillChoices | null {
  const haystack = textSources.filter(Boolean).join("\n\n")
  const parsed = haystack ? parseSkillChoices(haystack) : null

  if (existing?.options?.length && (existing.count ?? 0) > 0) {
    const fixed = existing.fixed?.length
      ? existing.fixed
      : parsed?.fixed?.length
        ? parsed.fixed
        : undefined
    return fixed?.length ? { ...existing, fixed } : existing
  }

  return parsed
}

function parsePrimaryAbility(text: string): string[] | null {
  const multiclass = text.match(
    /minimum\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)(?:\s*\(or\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\))?/i,
  )
  if (multiclass) {
    const abilities = [multiclass[1], multiclass[2]].filter(Boolean) as string[]
    return abilities.map(
      (ability) => ability.charAt(0).toUpperCase() + ability.slice(1).toLowerCase(),
    )
  }

  const quickBuild = text.match(
    /make either\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+or\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+your highest ability score/i,
  )
  if (quickBuild) {
    return [
      quickBuild[1].charAt(0).toUpperCase() + quickBuild[1].slice(1).toLowerCase(),
      quickBuild[2].charAt(0).toUpperCase() + quickBuild[2].slice(1).toLowerCase(),
    ]
  }

  return null
}

function parseClassDescription(text: string, className: string | null): string | null {
  const intro = text.match(
    new RegExp(
      `All three of the warriors[\\s\\S]{0,1200}?true\\s+${className ? className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "[A-Z][a-z]+"}[\\s\\S]{0,400}`,
      "i",
    ),
  )
  if (intro) return normalizeText(intro[0])

  const theClass = text.match(
    /\bThe\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b[\s\S]{0,600}?(?=Creating|Class Features|Hit Dice:|Level PB)/i,
  )
  if (theClass) return normalizeText(theClass[0])

  return null
}

/** Parse class metadata from standard PHB-style prose blocks. */
export function parseClassShellFromText(
  text: string,
  className: string | null = null,
): ParsedClassShell {
  return {
    hit_die: parseHitDie(text),
    saving_throws: parseSavingThrows(text),
    armor_proficiencies: parseArmorProficiencies(text),
    weapon_proficiencies: parseWeaponProficiencies(text),
    skill_choices: parseSkillChoices(text),
    primary_ability: parsePrimaryAbility(text),
    description: parseClassDescription(text, className),
  }
}
