/** Read catalog reference ids from a DB row (snake_case or camelCase). */
export function readModifierRefs(row: Record<string, unknown> | null | undefined): string[] {
  if (!row) return []
  if (Array.isArray(row.modifierRefs)) {
    return row.modifierRefs.filter((id): id is string => typeof id === "string" && id.length > 0)
  }
  if (Array.isArray(row.modifier_refs)) {
    return row.modifier_refs.filter((id): id is string => typeof id === "string" && id.length > 0)
  }
  return []
}

export function withModifierRefs<T extends Record<string, unknown>>(
  row: T,
): T & { modifierRefs: string[] } {
  return { ...row, modifierRefs: readModifierRefs(row) }
}

export function enrichRowsWithModifierRefs<T extends Record<string, unknown>>(rows: T[]): (T & { modifierRefs: string[] })[] {
  return rows.map((row) => withModifierRefs(row))
}
