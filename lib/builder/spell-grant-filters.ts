/** Unique, sorted school names from a spell grant list. */
export function uniqueSpellSchools(spells: Array<{ school?: string | null }>): string[] {
  const seen = new Set<string>()
  for (const spell of spells) {
    const school = spell.school?.trim()
    if (school) seen.add(school)
  }
  return [...seen].sort((a, b) => a.localeCompare(b))
}

/** Narrow a grant list to one school, or return it unchanged for "all". */
export function filterSpellsBySchool<T extends { school?: string | null }>(
  spells: readonly T[],
  schoolFilter: string,
): T[] {
  if (!schoolFilter || schoolFilter === "all") return [...spells]
  return spells.filter((spell) => spell.school?.trim() === schoolFilter)
}
