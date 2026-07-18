/** URL search params are always strings — coerce booleans/numbers for SQL filters. */
export function coerceQueryFilterValue(value: string): unknown {
  if (value === "true") return true
  if (value === "false") return false
  if (value === "null") return null
  if (/^-?\d+$/.test(value)) return Number(value)
  if (/^-?\d+\.\d+$/.test(value)) return Number(value)
  return value
}
