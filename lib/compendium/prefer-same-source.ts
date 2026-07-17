import { isSrdSource } from "@/lib/srd/source"
import { normalizeSpellLookupKey } from "@/lib/import/collect-referenced-spell-names"

/** Collision / rename suffixes produced by import-collisions suggestRenamedName. */
const RENAME_SUFFIX = /\s*\((?:Alternate|Imported)\)\s*$/i

export function normalizeSourceKey(source: string | null | undefined): string {
  return (source ?? "").trim().toLowerCase()
}

export function sourcesEqual(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const left = normalizeSourceKey(a)
  const right = normalizeSourceKey(b)
  if (!left || !right) return false
  return left === right
}

/**
 * Strip import rename decorations so "Fireball (Alternate)" / "Archery (Imported)"
 * share a base key with the SRD name they replace.
 */
export function baseCompendiumName(name: string): string {
  return name.replace(RENAME_SUFFIX, "").trim()
}

export function baseCompendiumLookupKey(name: string): string {
  return normalizeSpellLookupKey(baseCompendiumName(name))
}

export type NamedSourceRow = {
  id: string
  name: string
  source?: string | null
}

/**
 * Resolve a bare name (as printed in class features / spell lists) against a catalog,
 * preferring rows from `preferredSource` — including renamed replacements from that source.
 */
export function resolvePreferredNameMatch<T extends NamedSourceRow>(
  lookupName: string,
  catalog: T[],
  preferredSource?: string | null,
): T | undefined {
  const lookupKey = normalizeSpellLookupKey(lookupName)
  const baseLookupKey = baseCompendiumLookupKey(lookupName)
  if (!lookupKey) return undefined

  const exact: T[] = []
  const baseMatches: T[] = []
  for (const row of catalog) {
    const nameKey = normalizeSpellLookupKey(row.name)
    if (nameKey === lookupKey) exact.push(row)
    else if (baseCompendiumLookupKey(row.name) === baseLookupKey) baseMatches.push(row)
  }

  const preferred = preferredSource?.trim() || null
  if (preferred) {
    const fromPreferredExact = exact.find((row) => sourcesEqual(row.source, preferred))
    if (fromPreferredExact) return fromPreferredExact

    const fromPreferredBase = baseMatches.find((row) => sourcesEqual(row.source, preferred))
    if (fromPreferredBase) return fromPreferredBase
  }

  if (exact.length) {
    // Stable fallback: prefer non-SRD only when a preferred source was requested but missed.
    if (preferred) {
      const nonSrd = exact.find((row) => !isSrdSource(row.source))
      if (nonSrd) return nonSrd
    }
    return exact[0]
  }

  if (baseMatches.length) {
    if (preferred) {
      const nonSrd = baseMatches.find((row) => !isSrdSource(row.source))
      if (nonSrd) return nonSrd
    }
    return baseMatches[0]
  }

  return undefined
}

/**
 * When preferred sources are active, drop SRD (or other) items whose base name is
 * covered by a same-base replacement from a preferred source.
 */
export function filterPreferredSourceReplacements<T extends { name: string; source?: string | null }>(
  items: T[],
  preferredSources: string[],
): T[] {
  const preferred = preferredSources
    .map((source) => normalizeSourceKey(source))
    .filter(Boolean)
  if (!preferred.length) return items

  const preferredSet = new Set(preferred)
  const coveredBaseKeys = new Set<string>()
  for (const item of items) {
    if (!preferredSet.has(normalizeSourceKey(item.source))) continue
    coveredBaseKeys.add(baseCompendiumLookupKey(item.name))
  }
  if (!coveredBaseKeys.size) return items

  return items.filter((item) => {
    if (preferredSet.has(normalizeSourceKey(item.source))) return true
    const baseKey = baseCompendiumLookupKey(item.name)
    if (!coveredBaseKeys.has(baseKey)) return true
    // Hide SRD (and other non-preferred) duplicates of a preferred-source replacement.
    return false
  })
}

/** Collect preferred sources from classes that opted into SRD replacements. */
export function preferredSourcesFromClasses(
  classes: { source?: string | null; prefer_same_source_replacements?: boolean | null }[],
): string[] {
  const sources: string[] = []
  const seen = new Set<string>()
  for (const cls of classes) {
    if (!cls.prefer_same_source_replacements) continue
    const source = cls.source?.trim()
    if (!source || isSrdSource(source)) continue
    const key = normalizeSourceKey(source)
    if (seen.has(key)) continue
    seen.add(key)
    sources.push(source)
  }
  return sources
}
