import { stripHtml } from "@/lib/import/normalize-equipment"

export type ParsedClassShell = {
  hit_die: number | null
  saving_throws: string[] | null
  armor_proficiencies: string[] | null
  weapon_proficiencies: string[] | null
  skill_choices: { count: number; options: string[] } | null
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

function parseSkillChoices(text: string): { count: number; options: string[] } | null {
  const match = text.match(/Skills:\s*Choose\s+(\w+|\d+):\s*([^\n]+)/i)
  if (!match) return null

  const countToken = match[1].toLowerCase()
  const count =
    countToken === "one"
      ? 1
      : countToken === "two"
        ? 2
        : countToken === "three"
          ? 3
          : parseInt(countToken, 10)

  if (!Number.isFinite(count) || count < 1) return null

  const options = match[2]
    .replace(/\band\b/gi, ",")
    .split(",")
    .map((entry) => entry.replace(/\.$/, "").trim())
    .filter((entry) => entry.length > 1)

  return options.length ? { count, options } : null
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
