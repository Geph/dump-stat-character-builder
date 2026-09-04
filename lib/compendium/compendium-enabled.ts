type CompendiumEnabledFlag = { enabled?: boolean | number | null | unknown }

function asEnabledRow(row: unknown): CompendiumEnabledFlag {
  return row as CompendiumEnabledFlag
}

/** Whether a compendium row is available in the builder (default enabled when unset). */
export function isCompendiumItemEnabled(row: CompendiumEnabledFlag): boolean {
  return row.enabled !== false && row.enabled !== 0
}

export function filterEnabled<T>(rows: T[]): T[] {
  return rows.filter((row) => isCompendiumItemEnabled(asEnabledRow(row)))
}

export function pickEnabledId<T extends { id: string }>(
  id: string | null | undefined,
  rows: T[],
): string | null {
  if (!id) return null
  const row = rows.find((entry) => entry.id === id)
  if (!row || !isCompendiumItemEnabled(asEnabledRow(row))) return null
  return id
}

export function filterEnabledIds<T extends { id: string }>(
  ids: string[] | null | undefined,
  rows: T[],
): string[] {
  if (!ids?.length) return []
  const enabledIds = new Set(filterEnabled(rows).map((row) => row.id))
  return ids.filter((id) => enabledIds.has(id))
}
