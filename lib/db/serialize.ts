/** Normalize DB rows for JSON API responses (dates → ISO strings). */
export function serializeRow<T extends Record<string, unknown>>(row: T): T {
  const out = { ...row } as unknown as Record<string, unknown>
  for (const [key, value] of Object.entries(out)) {
    if (value instanceof Date) {
      out[key] = value.toISOString()
    }
  }
  return out as T
}

export function serializeRows<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map(serializeRow)
}
