import { spellNameMatchKeys } from "@/lib/compendium/spell-name-match"
import { getSrdSeedData } from "@/lib/srd/load-seed"

const WRITEUP_KEYS = [
  "description",
  "casting_time",
  "range",
  "components",
  "duration",
  "material",
  "higher_levels",
] as const

let writeupIndex: Map<string, Record<string, unknown>> | null = null

function isEmptyWriteupField(value: unknown): boolean {
  if (value == null) return true
  if (typeof value === "string") return !value.trim()
  if (Array.isArray(value)) return value.length === 0
  return false
}

function srdWriteupIndex(): Map<string, Record<string, unknown>> {
  if (writeupIndex) return writeupIndex
  writeupIndex = new Map()
  for (const row of getSrdSeedData().spells) {
    const record = row as Record<string, unknown>
    for (const key of spellNameMatchKeys(String(record.name ?? ""))) {
      if (key && !writeupIndex.has(key)) writeupIndex.set(key, record)
    }
  }
  return writeupIndex
}

export function lookupSrdSpellWriteup(name: string | null | undefined): Record<string, unknown> | null {
  if (!name?.trim()) return null
  const index = srdWriteupIndex()
  for (const key of spellNameMatchKeys(name)) {
    const row = index.get(key)
    if (row) return row
  }
  return null
}

/**
 * Copy SRD casting details / prose onto a catalog stub without changing id,
 * classes, source, or card art. Used when a class-list import wiped write-ups.
 */
export function fillEmptySpellWriteup<T extends Record<string, unknown>>(row: T): T {
  const srd = lookupSrdSpellWriteup(String(row.name ?? ""))
  if (!srd) return row

  let changed = false
  const next: Record<string, unknown> = { ...row }
  for (const key of WRITEUP_KEYS) {
    if (!isEmptyWriteupField(next[key]) || isEmptyWriteupField(srd[key])) continue
    next[key] = srd[key]
    changed = true
  }

  const looksLikeStub =
    isEmptyWriteupField(row.description) && isEmptyWriteupField(row.casting_time)
  if (looksLikeStub) {
    if (typeof srd.concentration === "boolean" && next.concentration !== srd.concentration) {
      next.concentration = srd.concentration
      changed = true
    }
    if (typeof srd.ritual === "boolean" && next.ritual !== srd.ritual) {
      next.ritual = srd.ritual
      changed = true
    }
    const school = typeof srd.school === "string" ? srd.school.trim() : ""
    const currentSchool = typeof next.school === "string" ? next.school.trim() : ""
    if (school && (!currentSchool || currentSchool.toLowerCase() === "unknown")) {
      next.school = school
      changed = true
    }
  }

  return changed ? (next as T) : row
}

export function fillEmptySpellWriteups<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map((row) => fillEmptySpellWriteup(row))
}
