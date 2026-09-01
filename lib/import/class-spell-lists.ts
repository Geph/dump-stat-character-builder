import { spellNameMatchKeys, spellNameOnClassList } from "@/lib/compendium/spell-name-match"

export { spellNameMatchKeys, spellNameOnClassList }

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
- Also emit spells[] rows for each list entry with at least: name, level, school, concentration, components (or null), classes: ["<ClassName>"]. Full casting_time/range/duration/description when the document has them; otherwise null is fine for list-only stubs. This is one row per list entry — a spell_list of 80 names must produce 80 spells[] rows, not just the handful with full write-ups.
- For each spell on that list, include the class's exact name in the spell's classes array (e.g. "Artificer").
- Custom/non-SRD classes are not among the standard eight (Bard, Cleric, Druid, Paladin, Ranger, Sorcerer, Warlock, Wizard); use the class name directly — never store the literal word "Other".
- Spells may also appear on standard class lists; include all applicable class names in classes.
- A class chapter may include its spell list in the same extract: keep the full class features[] and still populate spell_list + spells[] stubs from the list tables.
- Persist keeps spell_list on the class and stamps those names onto matching catalog rows even when the user links/skips existing spells (so a later SRD overwrite cannot drop the class tag).`

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

function cleanSpellListName(name: string): string {
  return name.replace(/\*+$/g, "").trim()
}

export function unionSpellClassNames(
  ...groups: Array<string[] | null | undefined>
): string[] {
  const merged = new Set<string>()
  for (const group of groups) {
    for (const raw of group ?? []) {
      const name = raw.trim()
      if (!name || /^other$/i.test(name)) continue
      if ([...merged].some((have) => have.toLowerCase() === name.toLowerCase())) continue
      merged.add(name)
    }
  }
  return [...merged].sort((a, b) => a.localeCompare(b))
}

export type ClassSpellListGrant = {
  className: string
  names: string[]
}

export function cleanedSpellListNames(names: readonly string[] | null | undefined): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of names ?? []) {
    const display = cleanSpellListName(String(raw ?? ""))
    if (!display) continue
    const key = spellNameMatchKeys(display)[0]
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(display)
  }
  return out
}

export function collectClassSpellLists(
  classes: Array<{ name?: string | null; spell_list?: string[] | null } | Record<string, unknown>>,
): ClassSpellListGrant[] {
  const byClass = new Map<string, { className: string; names: string[] }>()
  for (const row of classes) {
    const className = String((row as { name?: unknown }).name ?? "").trim()
    const names = cleanedSpellListNames(
      (row as { spell_list?: string[] | null }).spell_list,
    )
    if (!className || !names.length) continue
    const key = className.toLowerCase()
    const existing = byClass.get(key)
    if (!existing) {
      byClass.set(key, { className, names })
      continue
    }
    existing.names = cleanedSpellListNames([...existing.names, ...names])
  }
  return [...byClass.values()]
}

function grantsFromClassLists(lists: ClassSpellListGrant[]): Map<string, Set<string>> {
  const grants = new Map<string, Set<string>>()
  for (const list of lists) {
    for (const name of list.names) {
      for (const key of spellNameMatchKeys(name)) {
        if (!grants.has(key)) grants.set(key, new Set())
        grants.get(key)!.add(list.className)
      }
    }
  }
  return grants
}

/** Union class tags from stored/import spell lists onto catalog or incoming spell rows. */
export function stampClassSpellListsOntoSpellRows<T extends Record<string, unknown>>(
  spells: T[],
  lists: ClassSpellListGrant[],
): { all: T[]; changed: T[] } {
  if (!spells.length || !lists.length) return { all: spells, changed: [] }
  const grants = grantsFromClassLists(lists)
  const changed: T[] = []
  const all = spells.map((spell) => {
    const fromList = classNamesForSpell(String(spell.name ?? ""), grants)
    if (!fromList.size) return spell
    const nextClasses = unionSpellClassNames(
      Array.isArray(spell.classes) ? (spell.classes as string[]) : null,
      [...fromList],
    )
    const prev = unionSpellClassNames(
      Array.isArray(spell.classes) ? (spell.classes as string[]) : null,
    )
    if (
      nextClasses.length === prev.length &&
      nextClasses.every((name, index) => name === prev[index])
    ) {
      return spell
    }
    const next = { ...spell, classes: nextClasses }
    changed.push(next)
    return next
  })
  return { all, changed }
}

function classNamesForSpell(
  name: string,
  grants: Map<string, Set<string>>,
): Set<string> {
  const found = new Set<string>()
  for (const key of spellNameMatchKeys(name)) {
    const classes = grants.get(key)
    if (!classes) continue
    for (const className of classes) found.add(className)
  }
  return found
}

/**
 * Stamp each class `spell_list` onto matching `spells[]` rows, emit a class-tag stub
 * for list names that are not in the batch (so persist can union onto existing SRD
 * catalog rows), and keep a cleaned `spell_list` on the class for later catalog stamps.
 */
export function applyClassSpellListsToImport<T extends ImportContentWithSpellLists>(content: T): T {
  const rawClasses = content.classes ?? []
  if (!rawClasses.length && !content.spells?.length) return content

  const lists = collectClassSpellLists(rawClasses)
  const grants = grantsFromClassLists(lists)
  const listEntries: { name: string; classes: Set<string> }[] = []
  for (const list of lists) {
    for (const display of list.names) {
      const keys = spellNameMatchKeys(display)
      const existing = listEntries.find((entry) =>
        spellNameMatchKeys(entry.name).some((key) => keys.includes(key)),
      )
      if (existing) existing.classes.add(list.className)
      else listEntries.push({ name: display, classes: new Set([list.className]) })
    }
  }

  const spells = (content.spells ?? []).map((spell) => {
    const fromList = classNamesForSpell(spell.name, grants)
    const merged = unionSpellClassNames(spell.classes, [...fromList])
    return {
      ...spell,
      classes: merged.length ? merged : spell.classes,
    }
  })

  const presentKeys = new Set(
    spells.flatMap((spell) => spellNameMatchKeys(String(spell.name ?? ""))),
  )
  const stubs: ImportedSpell[] = []
  for (const entry of listEntries) {
    if (spellNameMatchKeys(entry.name).some((key) => presentKeys.has(key))) continue
    stubs.push({
      name: entry.name,
      classes: [...entry.classes].sort((a, b) => a.localeCompare(b)),
      description: null,
    })
    for (const key of spellNameMatchKeys(entry.name)) presentKeys.add(key)
  }

  const cleanedClasses = rawClasses.map((cls) => {
    const names = cleanedSpellListNames(cls.spell_list)
    return names.length ? { ...cls, spell_list: names } : cls
  })

  return {
    ...content,
    classes: cleanedClasses as T["classes"],
    spells: [...spells, ...stubs] as T["spells"],
  }
}
