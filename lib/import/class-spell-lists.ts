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
- On the class object, populate spell_list with every spell name from that list (exact names as written — strip trailing * footnote markers from names).
- PHB-style tables often have Spell / School / Special columns (not name-only). Treat extra columns as metadata; the spell name is still only the Spell column.
  - Level: from section headers — "Cantrips (Level 0 … Spells)" → 0; "Level N … Spells" → N. Ignore repeated "Spell School Special" header rows.
  - School: copy the School column exactly (preserve novel schools).
  - Special column legend (often explained in the intro prose): C = Concentration, R = Ritual, M = specific Material component. Values may be "—"/en-dash (none), a single letter, or comma-separated (e.g. "C, R", "R, M").
  - Map Special → JSON: concentration true when C is present; include "M" in components when M is present (V/S unknown → omit or null). There is no separate ritual field — do not invent one; R does not change concentration.
  - Skip footnote-only lines (e.g. "*Appears in this chapter.") and intro paragraphs about the Special column.
- Also emit spells[] rows for each list entry with at least: name, level, school, concentration, components (or null), classes: ["<ClassName>"]. Full casting_time/range/duration/description when the document has them; otherwise null is fine for list-only stubs.
- For each spell on that list, include the class's exact name in the spell's classes array (e.g. "Artificer").
- Custom/non-SRD classes are not among the standard eight (Bard, Cleric, Druid, Paladin, Ranger, Sorcerer, Warlock, Wizard); use the class name directly — never store the literal word "Other".
- Spells may also appear on standard class lists; include all applicable class names in classes.
- A class chapter may include its spell list in the same extract: keep the full class features[] and still populate spell_list + spells[] stubs from the list tables.`

export const SPELL_SCHOOL_IMPORT_HINT = `Spell schools (school field on spells[]):
- Use the school name exactly as written in the source.
- Standard SRD schools: Abjuration, Conjuration, Divination, Enchantment, Evocation, Illusion, Necromancy, Transmutation.
- When the source names a novel or homebrew school of magic, preserve it on school — examples: Duromancy, Chronomancy, Void Magic, Blood Magic, Sangromancy. Do not remap novel schools to the nearest SRD school.
- Do not invent novel school names for ordinary SRD spells; use the school's listed school when that is what the source says.`

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
