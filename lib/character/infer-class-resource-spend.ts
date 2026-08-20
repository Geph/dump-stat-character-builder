import {
  detectThirdPartyResourceSpend,
  THIRD_PARTY_RESOURCE_PATTERNS,
} from "@/lib/import/third-party-resources"
import type { UsesConfig } from "@/lib/types"

const PSI_COST_RE =
  /\b(?:expend|spend|costs?|pay|use)\s+(?:up\s+to\s+)?(\d+)\s+psi\s+points?\b/i
const PSI_COST_ALT_RE = /\b(\d+)\s+psi\s+points?\b[^.]{0,40}\b(?:to|when|per)\b/i

function detectPsiPointCost(text: string): number | null {
  const primary = text.match(PSI_COST_RE)
  if (primary) return parseInt(primary[1], 10)
  const alt = text.match(PSI_COST_ALT_RE)
  if (alt) return parseInt(alt[1], 10)
  return null
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

/** Map a class-prefixed key (`captain_battle_dice`) back to the pattern key (`battle_dice`). */
export function canonicalThirdPartyResourceKey(resourceKey: string): string {
  const trimmed = resourceKey.trim()
  if (!trimmed) return trimmed
  if (THIRD_PARTY_RESOURCE_PATTERNS.some((pattern) => pattern.resourceKey === trimmed)) {
    return trimmed
  }
  for (const pattern of THIRD_PARTY_RESOURCE_PATTERNS) {
    if (trimmed.endsWith(`_${pattern.resourceKey}`)) return pattern.resourceKey
  }
  return trimmed
}

export type InferredClassResourceSpend = {
  resourceKey: string
  amount: number
}

/**
 * Detect a class-resource spend from prose / execution lines, using only keys the
 * character actually has (so "expend one Battle Die" does not invent a pool).
 */
export function inferClassResourceSpendFromText(
  text: string,
  availableKeys: readonly string[],
): InferredClassResourceSpend | null {
  const haystack = stripHtml(text)
  if (!haystack || !availableKeys.length) return null

  for (const key of availableKeys) {
    const canonical = canonicalThirdPartyResourceKey(key)
    // "expend a Dance Die" is a roll, not a Dances-use spend.
    if (canonical === "dances" && /\bdance\s+die\b/i.test(haystack)) continue
    const amount = detectThirdPartyResourceSpend(haystack, canonical)
    if (amount != null) return { resourceKey: key, amount }
  }

  const psiCost = detectPsiPointCost(haystack)
  if (psiCost != null) {
    const psiKey = availableKeys.find(
      (key) =>
        canonicalThirdPartyResourceKey(key) === "psi_points" ||
        key === "psi_points" ||
        key.endsWith("_psi_points"),
    )
    if (psiKey) return { resourceKey: psiKey, amount: psiCost }
  }

  return null
}

export function inferredSpendToLimitedUses(spend: InferredClassResourceSpend): UsesConfig {
  return {
    type: "class_resource",
    classResourceKey: spend.resourceKey,
    classResourceAmount: spend.amount,
  }
}

export function hasManeuverSpendText(text: string): boolean {
  return (
    /\bexpend\s+(?:one|an?|1|\d+)\s+(?:battle|risk|exploit|endurance)\s+(?:die|dice)\b/i.test(
      text,
    ) ||
    /\broll\s+(?:an?|one|1)\s+endurance\s+(?:die|dice)\b/i.test(text) ||
    /\bexpend\s+(?:one|an?|1|\d+)\s+(?:arcane\s+surge|dance)s?\b/i.test(text) ||
    /\bexpend\s+\d+\s+charnel\s+touch\s+points?\b/i.test(text) ||
    /\bexpend\s+(?:one|an?|1|\d+)\s+remedy\s+(?:die|dice)\b/i.test(text)
  )
}
