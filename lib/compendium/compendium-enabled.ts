/** Whether a compendium row is available in the builder (default enabled when unset). */
export function isCompendiumItemEnabled(row: { enabled?: boolean | number | null | unknown }): boolean {
  return row.enabled !== false && row.enabled !== 0
}

export function filterEnabled<T extends { enabled?: boolean | number | null }>(rows: T[]): T[] {
  return rows.filter(isCompendiumItemEnabled)
}

export function pickEnabledId<T extends { id: string; enabled?: boolean | number | null }>(
  id: string | null | undefined,
  rows: T[],
): string | null {
  if (!id) return null
  const row = rows.find((entry) => entry.id === id)
  if (!row || !isCompendiumItemEnabled(row)) return null
  return id
}

export function filterEnabledIds<T extends { id: string; enabled?: boolean | number | null }>(
  ids: string[] | null | undefined,
  rows: T[],
): string[] {
  if (!ids?.length) return []
  const enabledIds = new Set(filterEnabled(rows).map((row) => row.id))
  return ids.filter((id) => enabledIds.has(id))
}
