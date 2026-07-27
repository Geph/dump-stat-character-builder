import type { ActionEconomyKind } from "@/lib/character/sheet-actions"

export type ActionEconomySpent = Record<ActionEconomyKind, boolean>

export function emptyActionEconomySpent(): ActionEconomySpent {
  return { action: false, bonus: false, reaction: false }
}

/** Infer which turn resource a spell cast spends from casting time / Quickened. */
export function actionEconomyKindFromCastingTime(
  castingTime: string | null | undefined,
  options?: { quickened?: boolean },
): ActionEconomyKind {
  if (options?.quickened) return "bonus"
  const text = (castingTime ?? "").toLowerCase()
  if (/\bbonus\s+action\b/.test(text)) return "bonus"
  if (/\breaction\b/.test(text)) return "reaction"
  return "action"
}

/**
 * Outside short rest, Hit Dice healing is only for feats/features that enable it.
 * Resilient / Durable are the common house-rule gates; spendHitDice on actions still works via Use.
 */
export function characterCanRollHitDiceOutsideShortRest(params: {
  featNames?: readonly string[]
  featureNames?: readonly string[]
}): boolean {
  const names = [...(params.featNames ?? []), ...(params.featureNames ?? [])]
  return names.some((name) => {
    const n = name.trim().toLowerCase()
    return (
      n === "resilient" ||
      n.startsWith("resilient ") ||
      n === "durable" ||
      n.startsWith("durable ") ||
      /\bhit\s*dice?\b.*\b(outside|beyond|without)\b.*\b(short\s*)?rest\b/i.test(name) ||
      /\bspend\s+hit\s*dice?\b.*\b(as\s+an?\s+action|in\s+combat|during\s+combat)\b/i.test(name)
    )
  })
}
