import type { ImportContent } from "@/lib/import/content-schema"

/** Normalize a class name for parent/subclass linking (case, apostrophes, whitespace). */
export function normalizeClassLookupKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\u2019/g, "'")
    .replace(/\s+/g, " ")
}

export function classNamesMatch(a: string, b: string): boolean {
  return normalizeClassLookupKey(a) === normalizeClassLookupKey(b)
}

function lastWord(name: string): string {
  const parts = normalizeClassLookupKey(name).split(" ").filter(Boolean)
  return parts[parts.length - 1] ?? ""
}

function uniqueByKey<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Map<string, T>()
  for (const item of items) {
    const key = keyFn(item)
    if (!seen.has(key)) seen.set(key, item)
  }
  return [...seen.values()]
}

/** True when names are equal or one is a designer-prefixed / extended form of the other. */
export function classNamesFuzzyMatch(requested: string, candidate: string): boolean {
  const requestedKey = normalizeClassLookupKey(requested)
  const candidateKey = normalizeClassLookupKey(candidate)
  if (!requestedKey || !candidateKey) return false
  if (requestedKey === candidateKey) return true
  if (candidateKey.endsWith(` ${requestedKey}`)) return true
  if (requestedKey.endsWith(` ${candidateKey}`)) return true

  const requestedParts = requestedKey.split(" ")
  const candidateParts = candidateKey.split(" ")
  if (requestedParts.length === 1 && lastWord(candidate) === requestedKey) return true
  if (candidateParts.length === 1 && lastWord(requested) === candidateKey) return true
  return false
}

/**
 * Resolve a subclass/resource `class_name` to a canonical class name from candidates.
 * Prefers exact match, then a unique fuzzy match (optionally among preferNames first).
 */
export function resolveParentClassName(
  requested: string,
  candidateNames: readonly string[],
  options?: { preferNames?: readonly string[] },
): string | null {
  const key = normalizeClassLookupKey(requested)
  if (!key) return null

  const exact = candidateNames.find((name) => normalizeClassLookupKey(name) === key)
  if (exact) return exact

  const preferKeys = new Set(
    (options?.preferNames ?? []).map(normalizeClassLookupKey).filter(Boolean),
  )
  const preferred = preferKeys.size
    ? candidateNames.filter((name) => preferKeys.has(normalizeClassLookupKey(name)))
    : []

  const pools = preferred.length ? [preferred, [...candidateNames]] : [[...candidateNames]]
  for (const pool of pools) {
    const hits = uniqueByKey(
      pool.filter((name) => classNamesFuzzyMatch(requested, name)),
      normalizeClassLookupKey,
    )
    if (hits.length === 1) return hits[0]!
  }

  if (options?.preferNames?.length === 1) {
    const only = options.preferNames[0]!
    if (classNamesFuzzyMatch(requested, only)) return only
  }

  return null
}

export function resolveParentClassRow<T extends { id: string; name: string }>(
  requested: string,
  candidates: readonly T[],
  options?: { preferNames?: readonly string[] },
): T | null {
  const resolvedName = resolveParentClassName(
    requested,
    candidates.map((row) => row.name),
    options,
  )
  if (!resolvedName) return null
  return candidates.find((row) => classNamesMatch(row.name, resolvedName)) ?? null
}

/**
 * Rewrite subclass / class_resource parent names so they match `classes[]` in the same batch
 * (e.g. subclass says "Psion" while the imported class is "KibblesTasty Psion").
 */
export function alignImportParentClassNames(content: ImportContent): ImportContent {
  const classNames = (content.classes ?? []).map((row) => row.name).filter(Boolean)
  if (!classNames.length) return content

  let changed = false

  const subclasses = content.subclasses?.map((subclass) => {
    const resolved = resolveParentClassName(subclass.class_name, classNames, {
      preferNames: classNames,
    })
    if (resolved && resolved !== subclass.class_name) {
      changed = true
      return { ...subclass, class_name: resolved }
    }
    return subclass
  })

  const class_resources = content.class_resources?.map((resource) => {
    const resolved = resolveParentClassName(resource.class_name, classNames, {
      preferNames: classNames,
    })
    if (resolved && resolved !== resource.class_name) {
      changed = true
      return { ...resource, class_name: resolved }
    }
    return resource
  })

  if (!changed) return content
  return {
    ...content,
    ...(subclasses ? { subclasses } : {}),
    ...(class_resources ? { class_resources } : {}),
  }
}
