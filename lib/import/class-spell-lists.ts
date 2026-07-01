/** Standard SRD spell list classes (matches spell editor checkboxes). */
export const STANDARD_SPELL_CLASSES = [
  "Bard",
  "Cleric",
  "Druid",
  "Paladin",
  "Ranger",
  "Sorcerer",
  "Warlock",
  "Wizard",
] as const

export function isStandardSpellClass(name: string): boolean {
  const n = name.trim().toLowerCase()
  return STANDARD_SPELL_CLASSES.some((c) => c.toLowerCase() === n)
}

export const CLASS_SPELL_LIST_IMPORT_HINT = `When a class has its own dedicated spell list (e.g. "Artificer Spell List"):
- On the class object, populate spell_list with every spell name from that list (exact names as written).
- For PHB-style tables with Spell / School / Special columns: parse level from section headers (Cantrips = level 0, "Level N … Spells"), school from the School column, concentration when Special includes C, material component when Special includes M.
- For each spell on that list, include the class's exact name in the spell's classes array (e.g. "Artificer").
- Custom/non-SRD classes are not among the standard eight (Bard, Cleric, Druid, Paladin, Ranger, Sorcerer, Warlock, Wizard); use the class name directly — never store the literal word "Other".
- Spells may also appear on standard class lists; include all applicable class names in classes.
- Extract full spell entries (level, school, casting time, etc.) when descriptions are present in the document.`

type ImportedClassWithSpellList = {
  name: string
  spell_list?: string[] | null
  [key: string]: unknown
}

type ImportedSpell = {
  name: string
  classes?: string[] | null
  [key: string]: unknown
}

export type ImportContentWithSpellLists = {
  classes?: ImportedClassWithSpellList[]
  spells?: ImportedSpell[]
}

function normalizeSpellName(name: string): string {
  return name.trim().toLowerCase()
}

function normalizeSpellClassNames(classes: string[] | null | undefined): string[] {
  const merged = new Set<string>()
  for (const raw of classes ?? []) {
    const c = raw.trim()
    if (!c || /^other$/i.test(c)) continue
    merged.add(c)
  }
  return [...merged].sort((a, b) => a.localeCompare(b))
}

/** Merge proprietary class spell lists onto imported spells and strip spell_list from classes. */
export function applyClassSpellListsToImport<T extends ImportContentWithSpellLists>(content: T): T {
  const rawClasses = content.classes ?? []
  if (!rawClasses.length && !content.spells?.length) return content

  const spellToCustomClasses = new Map<string, Set<string>>()
  for (const cls of rawClasses) {
    const className = cls.name?.trim()
    if (!className || !cls.spell_list?.length) continue
    for (const spellName of cls.spell_list) {
      const key = normalizeSpellName(spellName)
      if (!key) continue
      if (!spellToCustomClasses.has(key)) spellToCustomClasses.set(key, new Set())
      spellToCustomClasses.get(key)!.add(className)
    }
  }

  const spells = (content.spells ?? []).map((spell) => {
    const key = normalizeSpellName(spell.name)
    const fromList = spellToCustomClasses.get(key)
    const merged = new Set(normalizeSpellClassNames(spell.classes))
    if (fromList) {
      for (const className of fromList) merged.add(className)
    }
    return {
      ...spell,
      classes: merged.size ? [...merged].sort((a, b) => a.localeCompare(b)) : spell.classes,
    }
  })

  const cleanedClasses = rawClasses.map(({ spell_list: _spellList, ...rest }) => rest)

  return {
    ...content,
    classes: cleanedClasses as T["classes"],
    spells: spells as T["spells"],
  }
}
