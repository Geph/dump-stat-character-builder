/** @param {unknown} err */
export function isDuplicateColumnError(err) {
  if (!err || typeof err !== "object") return false
  return (
    /** @type {{ code?: string; errno?: number }} */ (err).code === "ER_DUP_FIELDNAME" ||
    /** @type {{ code?: string; errno?: number }} */ (err).errno === 1060
  )
}

/** @param {unknown[]} rows @param {{ alreadyApplied?: (rows: unknown[]) => boolean }} migration */
export function isMigrationApplied(rows, migration) {
  if (migration.alreadyApplied) {
    return migration.alreadyApplied(rows)
  }
  const first = rows[0] ?? {}
  const count = /** @type {Record<string, unknown>} */ (first).n ?? /** @type {Record<string, unknown>} */ (first).N
  return Number(count ?? 0) > 0
}
