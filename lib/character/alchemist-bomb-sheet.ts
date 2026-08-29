import type { SpecialAttackCharacteristic } from "@/lib/compendium/characteristic-modifiers"
import { resolveSpecialAttackEmpower } from "@/lib/character/special-attack-empower"

export type AlchemistBombAttackVariant = "attack" | "primed" | "explode"

export function isAlchemistBombName(name: string | null | undefined): boolean {
  return /^bombs?$/i.test((name ?? "").trim())
}

export function isPrimeBombName(name: string | null | undefined): boolean {
  return /^(?:prime|empowered) bomb$/i.test((name ?? "").trim())
}

export function isAlchemistBombPair(attacks: readonly SpecialAttackCharacteristic[]): boolean {
  return (
    attacks.some((attack) => attack.attackVariant === "attack") &&
    attacks.some((attack) => attack.attackVariant === "explode")
  )
}

/** Prime Bomb / formula clones that should not get their own combat card. */
export function shouldSuppressStandaloneBombCard(
  name: string,
  attacks: readonly SpecialAttackCharacteristic[],
): boolean {
  if (isPrimeBombName(name)) return true
  if (isAlchemistBombName(name)) return false
  return isAlchemistBombPair(attacks)
}

function stripEmpowerFields(attack: SpecialAttackCharacteristic): SpecialAttackCharacteristic {
  return {
    ...attack,
    resourceScaleKey: null,
    bonusDicePerResource: null,
    maxResourcesSpent: null,
    maxResourcesSpentByLevel: undefined,
    radiusIncreaseFeetPerResource: null,
  }
}

/**
 * Present Bombs as Attack / Primed / Explode. Regular modes never spend Reagents;
 * Primed appears once Prime Bomb scaling is available (Alchemist 2+).
 */
export function expandAlchemistBombProfiles(
  attacks: SpecialAttackCharacteristic[],
  classLevel: number,
): SpecialAttackCharacteristic[] {
  const attack = attacks.find((entry) => entry.attackVariant === "attack")
  const explode = attacks.find((entry) => entry.attackVariant === "explode")
  if (!attack || !explode) return attacks

  const regular = {
    ...stripEmpowerFields(attack),
    id: attack.id || "bomb_attack",
    label: attack.label ?? "Bomb — Attack",
  }
  const explodeRegular = {
    ...stripEmpowerFields(explode),
    id: explode.id || "bomb_explode",
  }

  const empower = resolveSpecialAttackEmpower(attack, classLevel)
  if (!empower) return [regular, explodeRegular]

  const primed: SpecialAttackCharacteristic = {
    ...attack,
    id: `${attack.id || "bomb_attack"}:primed`,
    attackVariant: "primed",
    label: "Primed Bomb — Attack",
    icon: attack.icon ?? "rolling-bomb",
  }
  return [regular, primed, explodeRegular]
}

export function talentAlertAppliesToVariant(
  appliesTo: readonly string[] | null | undefined,
  variant: string | null | undefined,
): boolean {
  if (!appliesTo?.length) return true
  const current = (variant ?? "attack").trim().toLowerCase()
  return appliesTo.some((entry) => entry.trim().toLowerCase() === current)
}

const PRIME_BOMB_RIDER_RE =
  /\bwhen you prime\b|\bwhen priming\b|\bprime(?:s|d|ing)? a bomb\b|\bprimed bomb\b/i

/** "Spend/take 10 minutes" is a rest/downtime activity; "for 10 minutes" is only a duration. */
const SPEND_MINUTES_RE = /\b(?:spend|take)\b(?:\s+\w+){0,6}\s+\d+\s+minutes?\b/i
const DURING_REST_RE = /\bduring a (?:short|long) rest\b/i
/**
 * "When you finish a Short Rest, you can …" — a chosen rest activity (Divine Respite),
 * not a recharge. Same "you can" gate as long-rest activities.
 */
const SHORT_REST_ACTIVITY_RE =
  /\b(?:when|after|whenever) you (?:finish|complete) a short rest,? you can\b/i

export function looksLikePrimeBombRiderText(
  ...parts: Array<string | null | undefined>
): boolean {
  return PRIME_BOMB_RIDER_RE.test(parts.filter(Boolean).join(" "))
}

export function resolveBombRiderAttackVariants(input: {
  name: string
  description?: string | null
  summary?: string | null
  appliesToAttackVariants?: Array<"attack" | "primed" | "explode">
  formulaRider?: boolean
}): Array<"attack" | "primed" | "explode"> | undefined {
  if (input.appliesToAttackVariants?.length) return input.appliesToAttackVariants
  if (looksLikePrimeBombRiderText(input.name, input.summary, input.description)) {
    return ["primed"]
  }
  if (input.formulaRider) return ["attack"]
  return undefined
}

export function looksLikeSelectableBombRider(input: {
  selectable?: boolean
  name: string
  description?: string | null
  summary?: string | null
  formulaRider?: boolean
}): boolean {
  if (input.selectable) return true
  if (input.formulaRider) return true
  return looksLikePrimeBombRiderText(input.name, input.summary, input.description)
}

export function isShortRestActivityText(
  ...parts: Array<string | null | undefined>
): boolean {
  const haystack = parts.filter(Boolean).join(" ")
  if (/^potion brewing$/i.test((parts[0] ?? "").trim())) return true
  return (
    SPEND_MINUTES_RE.test(haystack) ||
    DURING_REST_RE.test(haystack) ||
    SHORT_REST_ACTIVITY_RE.test(haystack)
  )
}

/**
 * "When you finish a Long Rest, you can …" — an activity the player may choose to perform,
 * not a recharge. Recharge wording ("you regain all expended uses") never reaches "you can",
 * which keeps this from firing on every long-rest pool.
 */
const LONG_REST_ACTIVITY_RE =
  /\b(?:when|after|whenever) you (?:finish|complete) a long rest,? you can\b/i

export function isLongRestActivityText(
  ...parts: Array<string | null | undefined>
): boolean {
  return LONG_REST_ACTIVITY_RE.test(parts.filter(Boolean).join(" "))
}
