/** Parsed attack roll from companion action prose (stat block Actions section). */
export type CompanionActionRoll = {
  actionName: string
  attackBonus: number | null
  /** e.g. "1d8 + 4" or null when not parseable */
  damageFormula: string | null
  reachOrRange: string | null
  usesSpellAttackModifier: boolean
}

const ATTACK_ROLL_RE =
  /(?:melee|ranged)\s+attack\s+roll(?::|\s+)?(?:\s+bonus\s+equals\s+your\s+spell\s+attack\s+modifier|\s*([+-]?\d+))?/i

const HIT_DAMAGE_RE = /hit:\s*([^.<]+(?:\.|$))/i
const REACH_RANGE_RE = /(?:reach|ranged?\s+attack\s+range)\s+([^.;,]+)/i

function stripHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function extractDamageFormula(hitClause: string): string | null {
  const cleaned = hitClause
    .replace(/\s+plus\s+your\s+\w+\s+modifier/gi, "")
    .replace(/\s+\w+\s+damage\.?$/i, "")
    .trim()
  const diceMatch = cleaned.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)/i)
  return diceMatch ? diceMatch[1].replace(/\s+/g, "") : null
}

/**
 * Parse a single companion action block for attack bonus and damage.
 * Returns null when the description does not describe an attack roll.
 */
export function parseCompanionActionRoll(
  actionName: string,
  description: string,
  spellAttackModifier: number | null,
): CompanionActionRoll | null {
  const text = stripHtml(description)
  const attackMatch = text.match(ATTACK_ROLL_RE)
  if (!attackMatch) return null

  const usesSpellAttackModifier = /spell\s+attack\s+modifier/i.test(text)
  let attackBonus: number | null = null
  if (usesSpellAttackModifier) {
    attackBonus = spellAttackModifier
  } else if (attackMatch[1]) {
    attackBonus = parseInt(attackMatch[1], 10)
  }

  const hitMatch = text.match(HIT_DAMAGE_RE)
  const damageFormula = hitMatch ? extractDamageFormula(hitMatch[1]) : null
  const reachMatch = text.match(REACH_RANGE_RE)

  return {
    actionName,
    attackBonus: Number.isFinite(attackBonus ?? NaN) ? attackBonus : null,
    damageFormula,
    reachOrRange: reachMatch ? reachMatch[1].trim() : null,
    usesSpellAttackModifier,
  }
}
