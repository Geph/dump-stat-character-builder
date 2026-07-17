/**
 * Parse and evaluate freeform choice-item prerequisites (Warmage Tricks, knacks, etc.).
 *
 * Supported patterns (AND across comma-separated clauses; OR within a clause):
 * - Class level: "Level 5+ Warmage", "Level 10+ Warmage", "5th-level Warmage"
 * - Spell/cantrip: "Light Cantrip", "Force Buckler cantrip"
 * - Spell OR group: "Quickstep or Springheel Cantrip",
 *   "Arc Blade, Burning Blade, Frigid Blade, or True Strike Cantrip"
 * - Named ability / subclass: "Slayer I", "House of Bishops"
 */

export type ChoicePrerequisiteContext = {
  classLevel: number
  knownSpellNames?: string[]
  selectedAbilityNames?: string[]
  subclassName?: string | null
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function nameMatches(haystack: string, needle: string): boolean {
  const a = normalizeName(haystack)
  const b = normalizeName(needle)
  if (!a || !b) return false
  return a === b || a.includes(b) || b.includes(a)
}

function listHasName(names: string[] | undefined, required: string): boolean {
  if (!names?.length) return false
  return names.some((name) => nameMatches(name, required))
}

/** Strip HTML tags for prerequisite scraping. */
export function stripHtmlForPrerequisite(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

/**
 * Pull freeform prerequisite text from an ability/option description when the LLM
 * left `prerequisite` empty — e.g. "Prerequisite: Light Cantrip" on Warmage Tricks.
 */
export function extractPrerequisiteFromDescription(
  description: string | null | undefined,
): string | null {
  if (!description?.trim()) return null

  // Match before HTML collapse so "<p>Prerequisite: Light Cantrip</p><p>When…" stays scoped.
  const htmlScoped = description.match(/Prerequisites?:\s*([^<\n]+)/i)
  if (htmlScoped?.[1]?.trim()) {
    return htmlScoped[1].trim().replace(/\.\s*$/, "")
  }

  const plain = stripHtmlForPrerequisite(description)
  const paren = plain.match(/\(Prerequisites?:\s*([^)]+)\)/i)
  if (paren?.[1]?.trim()) return paren[1].trim()

  // Stop before typical rules-body openers when tags were stripped into one line.
  const line = plain.match(
    /\bPrerequisites?:\s*(.+?)(?=\s+(?:When|Once|As |You |While |Whenever |At |If |For )\b|$)/i,
  )
  if (line?.[1]?.trim()) return line[1].trim().replace(/\.\s*$/, "")
  return null
}

/**
 * Minimum class level implied by freeform prerequisite text.
 * Matches "Level 5+ Warmage", "5th-level", "5th level Warmage", etc.
 */
export function parseMinimumLevelFromPrerequisite(
  prerequisite: string | null | undefined,
): number | null {
  if (!prerequisite?.trim()) return null
  const levelPlus = prerequisite.match(/\bLevel\s+(\d+)\s*\+/i)
  if (levelPlus) {
    const level = parseInt(levelPlus[1], 10)
    return Number.isFinite(level) ? level : null
  }
  const ordinal = prerequisite.match(/(\d+)(?:st|nd|rd|th)?\s*[- ]?level/i)
  if (ordinal) {
    const level = parseInt(ordinal[1], 10)
    return Number.isFinite(level) ? level : null
  }
  return null
}

function removeLevelClauses(text: string): string {
  return text
    .replace(/\bLevel\s+\d+\s*\+\s*(?:[A-Za-z][\w']*)?/gi, "")
    .replace(/\b\d+(?:st|nd|rd|th)?\s*[- ]?level(?:\s+[A-Za-z][\w']*)?/gi, "")
    .replace(/^[,;\s]+|[,;\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

type NamedRequirement = {
  name: string
  /** When true, match against known spells/cantrips; otherwise ability names / subclass. */
  kind: "spell" | "named"
}

function stripSpellKindSuffix(token: string): NamedRequirement {
  const match = token.match(/^(.+?)\s+(cantrips?|spells?)$/i)
  if (match) {
    return { name: match[1].trim(), kind: "spell" }
  }
  return { name: token.trim(), kind: "named" }
}

/**
 * Split remaining prerequisite text into AND-groups of OR-alternatives.
 * "A, B" → [[A], [B]] (AND). "A or B" / "A, B, or C" → [[A, B, C]] (OR).
 */
function parseNamedRequirementGroups(remainder: string): NamedRequirement[][] {
  const trimmed = remainder.trim()
  if (!trimmed) return []

  const hasOr = /\bor\b/i.test(trimmed)
  if (hasOr) {
    // One OR group: "Force Weapon or Magic Daggers Cantrip"
    // or "Arc Blade, Burning Blade, Frigid Blade, or True Strike Cantrip"
    const parts = trimmed
      .split(/\s*,\s*|\s+or\s+/i)
      .map((part) => part.trim())
      .filter(Boolean)
    if (!parts.length) return []

    const last = stripSpellKindSuffix(parts[parts.length - 1])
    const group: NamedRequirement[] = parts.map((part, index) => {
      if (index === parts.length - 1) return last
      const parsed = stripSpellKindSuffix(part)
      // Trailing "Cantrip"/"Spell" on the last item applies to the whole OR group
      // when earlier items lack an explicit suffix (Warmage Spellstrike pattern).
      if (last.kind === "spell" && parsed.kind === "named") {
        return { name: parsed.name, kind: "spell" }
      }
      return parsed
    })
    return [group]
  }

  // AND of individual clauses
  return trimmed
    .split(/\s*,\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => [stripSpellKindSuffix(part)])
}

function requirementSatisfied(
  requirement: NamedRequirement,
  context: ChoicePrerequisiteContext,
): boolean {
  if (requirement.kind === "spell") {
    return listHasName(context.knownSpellNames, requirement.name)
  }
  if (context.subclassName && nameMatches(context.subclassName, requirement.name)) {
    return true
  }
  return listHasName(context.selectedAbilityNames, requirement.name)
}

/**
 * Whether a freeform choice prerequisite (and optional numeric level_requirement) is met.
 */
export function isChoicePrerequisiteMet(
  prerequisite: string | null | undefined,
  context: ChoicePrerequisiteContext,
  options?: { levelRequirement?: number | null },
): boolean {
  const minFromField = options?.levelRequirement ?? null
  const minFromText = parseMinimumLevelFromPrerequisite(prerequisite)
  const minLevel =
    minFromField != null && minFromText != null
      ? Math.max(minFromField, minFromText)
      : (minFromField ?? minFromText)
  if (minLevel != null && context.classLevel < minLevel) return false

  if (!prerequisite?.trim()) return true

  const remainder = removeLevelClauses(prerequisite)
  if (!remainder) return true

  const groups = parseNamedRequirementGroups(remainder)
  for (const group of groups) {
    if (!group.some((req) => requirementSatisfied(req, context))) return false
  }
  return true
}

/** True when `prerequisite` mentions `abilityName` as a required named ability (not a spell). */
export function prerequisiteMentionsAbility(
  prerequisite: string | null | undefined,
  abilityName: string,
): boolean {
  if (!prerequisite?.trim() || !abilityName.trim()) return false
  const remainder = removeLevelClauses(prerequisite)
  if (!remainder) return false
  for (const group of parseNamedRequirementGroups(remainder)) {
    for (const req of group) {
      if (req.kind === "named" && nameMatches(req.name, abilityName)) return true
    }
  }
  // Fallback: substring match for simple "Slayer I" style chains that aren't comma-split.
  return nameMatches(remainder, abilityName)
}
