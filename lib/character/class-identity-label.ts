/**
 * Class / subclass / level label for sheet banner pills and share summaries.
 * Always includes the subclass when present (e.g. "Investigator (Exterminator) 7").
 */
export function formatClassIdentityLabel(params: {
  className: string | null | undefined
  subclassName?: string | null | undefined
  level: number
  /** "banner" → "Class (Subclass) 7"; "share" → "Class (Subclass) Level 7". */
  style?: "banner" | "share"
}): string {
  const className = params.className?.trim() || "Class"
  const subclass = params.subclassName?.trim()
  const withSubclass = subclass ? `${className} (${subclass})` : className
  if (params.style === "share") return `${withSubclass} Level ${params.level}`
  return `${withSubclass} ${params.level}`
}
