/**
 * Spell print-name normalization and alias routing.
 * Kibbles/legacy names resolve to the preferred filled catalog row (usually SRD 5.5).
 */

export function normalizeSpellLookupKey(name: string): string {
  return name
    .replace(/\*+/g, "")
    .trim()
    .toLowerCase()
    .replace(/\u2019/g, "'")
}

/**
 * Alternate / legacy print names → preferred catalog spell name.
 * Used so Kibbles/import stubs like "Feeblemind" resolve to the filled SRD row.
 */
export const SPELL_NAME_ALIAS_TO_CANONICAL: Readonly<Record<string, string>> = {
  "detect good and evil": "Detect Evil and Good",
  "pass without a trace": "Pass without Trace",
  "feeblemind": "Befuddlement",
  // Kibbles Casting rename of SRD Animate Objects
  "animate objects": "Dancing Objects (Animate Object)",
  "animate object": "Dancing Objects (Animate Object)",
  "dancing object (animate object)": "Dancing Objects (Animate Object)",
  "dancing objects": "Dancing Objects (Animate Object)",
}

/** Preferred catalog name for a spell print name (unchanged when not aliased). */
export function canonicalSpellName(name: string): string {
  const key = normalizeSpellLookupKey(name)
  if (!key) return name.trim()
  return SPELL_NAME_ALIAS_TO_CANONICAL[key] ?? name.trim()
}

/** Lookup key after applying spell name aliases. */
export function canonicalSpellLookupKey(name: string): string {
  return normalizeSpellLookupKey(canonicalSpellName(name))
}

/** All normalized keys in the alias group for `name` (alias + canonical). */
export function spellAliasLookupKeys(name: string): string[] {
  const direct = normalizeSpellLookupKey(name)
  const canonical = canonicalSpellLookupKey(name)
  if (!canonical && !direct) return []
  const keys = new Set<string>()
  if (direct) keys.add(direct)
  if (canonical) keys.add(canonical)
  for (const [alias, target] of Object.entries(SPELL_NAME_ALIAS_TO_CANONICAL)) {
    if (normalizeSpellLookupKey(target) === canonical) keys.add(alias)
  }
  return [...keys]
}

/** True when this print name is a known alias that should route to a canonical row. */
export function isAliasRoutableSpellName(name: string): boolean {
  return normalizeSpellLookupKey(name) in SPELL_NAME_ALIAS_TO_CANONICAL
}

/** True when two spell print names are the same spell under alias routing. */
export function spellNamesAliasEqual(a: string, b: string): boolean {
  const left = canonicalSpellLookupKey(a)
  const right = canonicalSpellLookupKey(b)
  if (!left || !right) return false
  return left === right
}
