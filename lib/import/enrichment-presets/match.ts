import type { EnrichmentMatch } from "@/lib/import/enrichment-presets/types"

export function matchText(pattern: string | RegExp | undefined, value: string | null | undefined): boolean {
  if (pattern == null) return true
  const text = value ?? ""
  if (typeof pattern === "string") return pattern.toLowerCase() === text.toLowerCase()
  return pattern.test(text)
}

export function matchesEnrichment(match: EnrichmentMatch, ctx: {
  className?: string
  subclassClassName?: string
  name?: string
  abilityRole?: string
  description?: string
  sourceName?: string
  resourceKey?: string
  hasPointPool?: boolean
}): boolean {
  if (match.classNameExcludeExact != null && ctx.className === match.classNameExcludeExact) {
    return false
  }
  if (match.className != null && !matchText(match.className, ctx.className)) return false
  if (match.subclassClassName != null && !matchText(match.subclassClassName, ctx.subclassClassName)) {
    return false
  }
  if (match.name != null && !matchText(match.name, ctx.name)) return false
  if (match.abilityRole != null && !matchText(match.abilityRole, ctx.abilityRole)) return false
  if (match.description != null && !match.description.test(ctx.description ?? "")) return false
  if (match.sourceName != null && !matchText(match.sourceName, ctx.sourceName)) return false
  if (match.resourceKey != null && match.resourceKey !== ctx.resourceKey) return false

  if (match.requiresPointPool != null) {
    const poolOk = Boolean(ctx.hasPointPool)
    if (match.requiresPointPool && !poolOk) {
      if (match.classNameWhenNoPointPool && matchText(match.classNameWhenNoPointPool, ctx.className)) {
        // alternate sorcerer path: treat as matching without pool
      } else {
        return false
      }
    }
    if (!match.requiresPointPool && poolOk && match.classNameWhenNoPointPool) {
      // still allow
    }
  }

  return true
}
