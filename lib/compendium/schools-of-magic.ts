/**
 * Configurable spell school labels (SRD defaults + homebrew).
 * Stored in localStorage — reset to SRD when the Spells compendium section is cleared.
 */

export const SPELL_SCHOOLS_STORAGE_KEY = "dump-stat-spell-schools"
export const SPELL_SCHOOLS_CHANGE_EVENT = "dumpstat:spell-schools-change"

/** SRD 5.2.1 school names in display order. */
export const DEFAULT_SPELL_SCHOOL_NAMES = [
  "Abjuration",
  "Conjuration",
  "Divination",
  "Enchantment",
  "Evocation",
  "Illusion",
  "Necromancy",
  "Transmutation",
] as const

/** @deprecated Prefer DEFAULT_SPELL_SCHOOL_NAMES */
export const SRD_SPELL_SCHOOL_NAMES = DEFAULT_SPELL_SCHOOL_NAMES

export function normalizeSpellSchoolList(value: unknown): string[] {
  if (!Array.isArray(value)) return [...DEFAULT_SPELL_SCHOOL_NAMES]
  const seen = new Set<string>()
  const next: string[] = []
  for (const entry of value) {
    if (typeof entry !== "string") continue
    const name = entry.trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    next.push(name)
  }
  return next.length > 0 ? next : [...DEFAULT_SPELL_SCHOOL_NAMES]
}

export function getSpellSchools(): string[] {
  if (typeof localStorage === "undefined") return [...DEFAULT_SPELL_SCHOOL_NAMES]
  try {
    const raw = localStorage.getItem(SPELL_SCHOOLS_STORAGE_KEY)
    if (!raw) return [...DEFAULT_SPELL_SCHOOL_NAMES]
    return normalizeSpellSchoolList(JSON.parse(raw) as unknown)
  } catch {
    return [...DEFAULT_SPELL_SCHOOL_NAMES]
  }
}

export function setSpellSchools(schools: string[]): void {
  if (typeof localStorage === "undefined") return
  const next = normalizeSpellSchoolList(schools)
  localStorage.setItem(SPELL_SCHOOLS_STORAGE_KEY, JSON.stringify(next))
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SPELL_SCHOOLS_CHANGE_EVENT))
  }
}

/** Restore the SRD eight-school list (e.g. after clearing Spells in the compendium). */
export function resetSpellSchoolsToDefault(): void {
  setSpellSchools([...DEFAULT_SPELL_SCHOOL_NAMES])
}

export type SpellSchoolListDiff = {
  removed: string[]
  renamed: Array<{ from: string; to: string }>
}

/**
 * Diff school rows from the editor.
 * Each draft row may carry `originalName` (null for newly added schools).
 */
export function diffSpellSchoolEditorRows(
  rows: Array<{ originalName: string | null; name: string }>,
): { schools: string[]; diff: SpellSchoolListDiff } {
  const schools = normalizeSpellSchoolList(rows.map((row) => row.name))
  const keptOriginals = new Set<string>()
  const renamed: Array<{ from: string; to: string }> = []

  for (const row of rows) {
    const next = row.name.trim()
    const original = row.originalName?.trim() ?? ""
    if (!original || !next) continue
    keptOriginals.add(original.toLowerCase())
    if (original.toLowerCase() !== next.toLowerCase()) {
      renamed.push({ from: original, to: next })
    } else if (original !== next) {
      // Case-only / whitespace normalize still counts as rename for spell rows.
      renamed.push({ from: original, to: next })
    }
  }

  const previous = getSpellSchools()
  const removed = previous.filter((name) => !keptOriginals.has(name.trim().toLowerCase()))

  return { schools, diff: { removed, renamed } }
}

/** @deprecated Prefer diffSpellSchoolEditorRows */
export function diffSpellSchoolLists(
  previous: string[],
  next: string[],
): SpellSchoolListDiff {
  const nextKeys = new Set(next.map((name) => name.trim().toLowerCase()))
  return {
    removed: previous.filter((name) => !nextKeys.has(name.trim().toLowerCase())),
    renamed: [],
  }
}

/** Placeholder labels that should never be registered as filter schools. */
const IGNORED_IMPORT_SCHOOL_LABELS = new Set(["unknown", "other"])

/**
 * Unique school names from imported spell rows (skips blank / Unknown / Other).
 * Pure — safe on server; does not touch localStorage.
 */
export function collectSpellSchoolsFromSpells(
  spells: Array<{ school?: string | null }> | null | undefined,
): string[] {
  if (!spells?.length) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const spell of spells) {
    if (typeof spell.school !== "string") continue
    const name = spell.school.trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (IGNORED_IMPORT_SCHOOL_LABELS.has(key)) continue
    if (seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}

export function collectSpellSchoolsFromImportContent(content: {
  spells?: Array<{ school?: string | null }> | null
}): string[] {
  return collectSpellSchoolsFromSpells(content.spells)
}

/**
 * Append imported school names to the persisted Spells filter list.
 * Returns schools that were newly added (already-known names are skipped).
 */
export function mergeImportedSpellSchools(candidates: string[]): string[] {
  const cleaned = collectSpellSchoolsFromSpells(candidates.map((school) => ({ school })))
  if (cleaned.length === 0) return []

  const existing = getSpellSchools()
  const existingKeys = new Set(existing.map((name) => name.trim().toLowerCase()))
  const added: string[] = []
  for (const name of cleaned) {
    const key = name.toLowerCase()
    if (existingKeys.has(key)) continue
    existingKeys.add(key)
    existing.push(name)
    added.push(name)
  }
  if (added.length > 0) {
    setSpellSchools(existing)
  }
  return added
}

/** Collect schools from import content and merge into the Spells filter list. */
export function registerSpellSchoolsFromImportContent(content: {
  spells?: Array<{ school?: string | null }> | null
}): string[] {
  return mergeImportedSpellSchools(collectSpellSchoolsFromImportContent(content))
}
