function nameKey(value: unknown): string {
  return String(value ?? "").trim().toLowerCase()
}

function asNamedList(value: unknown): { name?: string }[] {
  return Array.isArray(value) ? (value as { name?: string }[]) : []
}

/** Append incoming named items that do not already exist (case-insensitive). */
export function mergeNamedItems<T extends { name?: string }>(
  existing: T[] | null | undefined,
  incoming: T[] | null | undefined,
): T[] {
  const result = [...(existing ?? [])]
  const seen = new Set(result.map((row) => nameKey(row.name)).filter(Boolean))
  for (const item of incoming ?? []) {
    const key = nameKey(item.name)
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }
  return result
}

function firstFilled(...values: unknown[]): unknown {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value
    if (value != null && value !== "" && typeof value !== "string") return value
  }
  return values[0]
}

/**
 * Keep the existing row; add new named lists (features/traits) and fill empty image/icon fields.
 * Does not replace existing rules text or feature bodies.
 */
export function mergeRowForUpdate(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = {
    ...existing,
    id: existing.id,
  }
  if ("enabled" in existing) next.enabled = existing.enabled
  if ("features" in existing || "features" in incoming) {
    next.features = mergeNamedItems(asNamedList(existing.features), asNamedList(incoming.features))
  }
  if ("traits" in existing || "traits" in incoming) {
    next.traits = mergeNamedItems(asNamedList(existing.traits), asNamedList(incoming.traits))
  }
  next.card_image_url = firstFilled(incoming.card_image_url, existing.card_image_url)
  next.icon = firstFilled(existing.icon, incoming.icon)
  next.card_blurb = firstFilled(existing.card_blurb, incoming.card_blurb)
  return next
}

export function applyUpdateMergesToNamedRows(
  incoming: Record<string, unknown>[],
  existing: Record<string, unknown>[],
  updateNames: ReadonlySet<string> | readonly string[] | undefined,
): Record<string, unknown>[] {
  const names = new Set(
    [...(updateNames ?? [])].map((name) => name.trim().toLowerCase()).filter(Boolean),
  )
  if (!names.size) return incoming
  const existingByName = new Map(
    existing.map((row) => [nameKey(row.name), row] as const).filter(([key]) => Boolean(key)),
  )
  return incoming.map((row) => {
    const key = nameKey(row.name)
    if (!names.has(key)) return row
    const prev = existingByName.get(key)
    return prev ? mergeRowForUpdate(prev, row) : row
  })
}

/**
 * Language catalog Update merges: keep id/enabled, prefer incoming flavor fields
 * (description, speakers, script, pool, source) so setting packs can enrich SRD rows.
 */
export function mergeLanguageRowForUpdate(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const next = mergeRowForUpdate(existing, incoming)
  next.description = firstFilled(incoming.description, existing.description)
  next.typical_speakers = firstFilled(incoming.typical_speakers, existing.typical_speakers)
  next.script = firstFilled(incoming.script, existing.script)
  next.pool = firstFilled(incoming.pool, existing.pool)
  next.source = firstFilled(incoming.source, existing.source)
  return next
}

export function applyUpdateMergesToLanguageRows(
  incoming: Record<string, unknown>[],
  existing: Record<string, unknown>[],
  updateNames: ReadonlySet<string> | readonly string[] | undefined,
): Record<string, unknown>[] {
  const names = new Set(
    [...(updateNames ?? [])].map((name) => name.trim().toLowerCase()).filter(Boolean),
  )
  if (!names.size) return incoming
  const existingByName = new Map(
    existing.map((row) => [nameKey(row.name), row] as const).filter(([key]) => Boolean(key)),
  )
  return incoming.map((row) => {
    const key = nameKey(row.name)
    if (!names.has(key)) return row
    const prev = existingByName.get(key)
    return prev ? mergeLanguageRowForUpdate(prev, row) : row
  })
}

export function shouldMergeClassResources(
  className: string,
  updateClassNames: ReadonlySet<string> | readonly string[] | undefined,
): boolean {
  if (!updateClassNames) return false
  const key = nameKey(className)
  return [...updateClassNames].some((name) => name.trim().toLowerCase() === key)
}

/** Keep existing resource keys; only return incoming rows that are not already stored. */
export function filterNewResourceRows(
  incoming: Record<string, unknown>[],
  existing: Record<string, unknown>[],
): Record<string, unknown>[] {
  const existingKeys = new Set(
    existing.map((row) => String(row.resource_key ?? "").trim().toLowerCase()).filter(Boolean),
  )
  return incoming.filter((row) => {
    const key = String(row.resource_key ?? "").trim().toLowerCase()
    return Boolean(key) && !existingKeys.has(key)
  })
}

export function findExistingSubclassRow(
  existing: Record<string, unknown>[],
  name: unknown,
  classId: unknown,
): Record<string, unknown> | undefined {
  const key = nameKey(name)
  const parentId = String(classId ?? "")
  if (!key || !parentId) return undefined
  return existing.find(
    (row) => nameKey(row.name) === key && String(row.class_id ?? "") === parentId,
  )
}
