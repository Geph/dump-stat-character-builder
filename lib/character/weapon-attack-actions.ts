import type { SheetActionEntry } from "@/lib/character/sheet-actions"

/**
 * Prose for features that hand the player another swing with a weapon they already wield
 * (Monster Slayer, Silvered Edge). These read as attacks, so the sheet files them beside the
 * equipped weapon cards instead of in the generic ability columns.
 */
const WEAPON_ATTACK_GRANT_PATTERNS: RegExp[] = [
  /\bmake\s+(?:one|two|three|four|a|an|another|\d+)\s+(?:additional\s+|extra\s+)?attacks?\s+with\s+(?:a|an|your|the|one)\b[^.]{0,60}?\b(?:weapon|unarmed strike)\b/i,
  /\bmake\s+(?:one|two|three|four|a|an|another|\d+)\s+(?:additional\s+|extra\s+)?(?:melee\s+|ranged\s+)?(?:weapon|unarmed)\s+attacks?\b/i,
  /\bmake\s+(?:one|two|three|four|a|an|another|\d+)\s+(?:additional|extra)\s+attacks?\b/i,
  /\battack\s+(?:one\s+additional\s+time|one\s+more\s+time)\b/i,
]

/** Phrasings that only look like an extra attack (spell attacks, riders on a hit you already made). */
const NOT_A_WEAPON_ATTACK_PATTERNS: RegExp[] = [
  /\bspell attack\b/i,
  /\bmake\s+(?:one|a|an)\s+attack\s+with\s+(?:a|the|your)\s+spell\b/i,
]

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")
}

/**
 * True when this action's whole point is granting an extra weapon or Unarmed Strike attack.
 * Triggered riders are excluded: they have no button of their own to move.
 */
export function grantsExtraWeaponAttack(action: SheetActionEntry): boolean {
  if (action.trigger) return false
  if (action.specialAttack || action.specialAttacks?.length) return false
  const text = stripHtml(`${action.name} ${action.description ?? ""}`)
  if (NOT_A_WEAPON_ATTACK_PATTERNS.some((pattern) => pattern.test(text))) return false
  return WEAPON_ATTACK_GRANT_PATTERNS.some((pattern) => pattern.test(text))
}
