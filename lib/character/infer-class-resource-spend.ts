import { HIT_DICE_RESOURCE_KEY, isHitDiceResourceKey } from "@/lib/character/hit-dice-use-effects"
import {
  detectThirdPartyResourceSpend,
  THIRD_PARTY_RESOURCE_PATTERNS,
} from "@/lib/import/third-party-resources"
import type { UsesConfig } from "@/lib/types"

const HIT_DICE_SPEND_RE =
  /\b(?:expend|spend)(?:s|ing)?\s+(?:up\s+to\s+)?(\d+|one|a|an)\s+hit\s+(?:point\s+)?dic?e\b/i

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
  costMode?: UsesConfig["classResourceCostMode"]
}

const UP_TO_PROFICIENCY_SPEND_RE =
  /\bup\s+to\s+(?:a\s+maximum\s+of\s+)?(\d+)\s*(?:×|x|times)\s+(?:your\s+)?proficiency\s+bonus\b/i

function inferScaledProficiencySpend(
  haystack: string,
  availableKeys: readonly string[],
): InferredClassResourceSpend | null {
  const match = haystack.match(UP_TO_PROFICIENCY_SPEND_RE)
  if (!match) return null
  const amount = parseInt(match[1], 10)
  if (!Number.isFinite(amount) || amount < 1) return null
  for (const key of availableKeys) {
    const canonical = canonicalThirdPartyResourceKey(key)
    const pattern = THIRD_PARTY_RESOURCE_PATTERNS.find((entry) => entry.resourceKey === canonical)
    if (pattern?.namePattern.test(haystack)) {
      return { resourceKey: key, amount, costMode: "up_to_proficiency_bonus" }
    }
  }
  return null
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
  // "Expend a spell slot to replenish/restore X" spends a slot, not the named pool.
  if (
    /\bexpend(?:s|ed|ing)?\s+(?:a\s+)?spell\s+slot\b/i.test(haystack) &&
    /\b(?:replenish|restore|regain)\b/i.test(haystack)
  ) {
    return null
  }

  const scaled = inferScaledProficiencySpend(haystack, availableKeys)
  if (scaled) return scaled

  for (const key of availableKeys) {
    const canonical = canonicalThirdPartyResourceKey(key)
    // "expend a Dance Die" is a roll, not a Dances-use spend.
    if (canonical === "dances" && /\bdance\s+die\b/i.test(haystack)) continue
    const amount = detectThirdPartyResourceSpend(haystack, canonical)
    if (amount != null) return { resourceKey: key, amount }
  }

  const hitDiceSpend = haystack.match(HIT_DICE_SPEND_RE)
  if (hitDiceSpend) {
    const raw = hitDiceSpend[1]?.toLowerCase() ?? "1"
    const amount = raw === "one" || raw === "a" || raw === "an" ? 1 : parseInt(raw, 10)
    const hdKey =
      availableKeys.find((key) => isHitDiceResourceKey(key)) ?? HIT_DICE_RESOURCE_KEY
    if (Number.isFinite(amount) && amount > 0 && availableKeys.includes(hdKey)) {
      return { resourceKey: hdKey, amount }
    }
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
    ...(spend.costMode && spend.costMode !== "fixed"
      ? { classResourceCostMode: spend.costMode }
      : {}),
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
    /\bexpend\s+(?:one|an?|1|\d+)\s+remedy\s+(?:die|dice)\b/i.test(text) ||
    HIT_DICE_SPEND_RE.test(text)
  )
}
