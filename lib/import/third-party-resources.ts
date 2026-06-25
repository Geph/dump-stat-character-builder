import type { UsesConfig } from "@/lib/types"

/** Known third-party / homebrew resource patterns — used at import time only, not seeded into SRD defaults. */
export type ThirdPartyResourcePattern = {
  resourceKey: string
  namePattern: RegExp
  displayName: string
  definition: string
  /** Default uses shape when parsed from a level table without explicit AI data */
  defaultUses?: Partial<UsesConfig>
  /** Text patterns that spend this resource (for feature linking) */
  spendPatterns: RegExp[]
}

export const THIRD_PARTY_RESOURCE_PATTERNS: ThirdPartyResourcePattern[] = [
  {
    resourceKey: "psi_points",
    namePattern: /psi\s*points?/i,
    displayName: "Psi Points",
    definition:
      "Psionic energy pool spent to activate disciplines, talents, and psi-cost features. Typically recharges on short and long rests.",
    spendPatterns: [
      /\b(?:expend|spend|costs?|pay|use)\s+(?:up\s+to\s+)?(\d+)\s+psi\s+points?\b/i,
      /\b(\d+)\s+psi\s+points?\b[^.]{0,40}\b(?:to|when|per)\b/i,
    ],
  },
  {
    resourceKey: "psi_limit",
    namePattern: /psi\s*limit/i,
    displayName: "Psi Limit",
    definition:
      "Maximum psi points that can be spent on a single psionic activation at your level (per-activation cap).",
    spendPatterns: [],
  },
  {
    resourceKey: "battle_dice",
    namePattern: /battle\s*dice/i,
    displayName: "Battle Dice",
    definition:
      "Pool of dice spent on Captain maneuvers and battle tactics. Regain all expended Battle Dice when you roll Initiative or finish a Short or Long Rest.",
    defaultUses: {
      type: "at_level",
      atLevelMode: "tier",
      recharges: [{ rest: "short_rest" }, { rest: "long_rest" }],
    },
    spendPatterns: [
      /\bexpend\s+(?:one|an?|1)\s+battle\s+die\b/i,
      /\bexpend\s+(?:up\s+to\s+)?(\d+)\s+battle\s+dice\b/i,
      /\bexpend\s+a\s+battle\s+die\b/i,
    ],
  },
  {
    resourceKey: "exploit_dice",
    namePattern: /exploit\s*dice/i,
    displayName: "Exploit Dice",
    definition:
      "Pool of dice spent to fuel Martial Exploits and similar techniques. Die size scales by level; pool recharges on a short rest.",
    defaultUses: {
      type: "at_level",
      atLevelMode: "tier",
      recharges: [{ rest: "short_rest" }],
    },
    spendPatterns: [
      /\bexpend\s+(?:one|an?|up\s+to\s+(\d+))\s+exploit\s+die\b/i,
      /\bexpend\s+(?:up\s+to\s+)?(\d+)\s+exploit\s+dice\b/i,
      /\bexpend\s+exploit\s+dice\b/i,
      /\bspend\s+(?:one|an?)\s+exploit\s+die\b/i,
    ],
  },
  {
    resourceKey: "exploit_die_size",
    namePattern: /exploit\s*die(?!\s*dice)/i,
    displayName: "Exploit Die",
    definition:
      "Die type (d6, d8, d10, d12) rolled when spending Exploit Dice — scales on the class level table, not a spendable pool.",
    spendPatterns: [],
  },
  {
    resourceKey: "hexes_known",
    namePattern: /hexes?\s*known/i,
    displayName: "Hexes Known",
    definition: "Number of Hexes the Witch knows — chosen from the Hex list; count scales on the class table.",
    spendPatterns: [],
  },
  {
    resourceKey: "grand_hexes",
    namePattern: /grand\s*hexes?/i,
    displayName: "Grand Hexes",
    definition: "Powerful Witch options chosen at level 11+; typically one Grand Hex known at a time.",
    spendPatterns: [],
  },
  {
    resourceKey: "hexmaster_uses",
    namePattern: /hexmaster|insidious spell uses/i,
    displayName: "Insidious Spell Uses",
    definition: "Uses of Insidious Spell / Hexmaster — force a failed save on a Hex (Charisma modifier per long rest).",
    spendPatterns: [
      /\buse this feature a number of times equal to your \w+ modifier\b/i,
      /\brestore one use of it by expending a spell slot\b/i,
    ],
  },
  {
    resourceKey: "alchemy_points",
    namePattern: /alchemy\s*points?/i,
    displayName: "Alchemy Points",
    definition: "Pool spent to brew potions (typically equal to Witch level); recharges on a long rest.",
    spendPatterns: [/\bexpend\s+(\d+)\s+alchemy\s+points?\b/i],
  },
  {
    resourceKey: "upgrades",
    namePattern: /upgrades?/i,
    displayName: "Upgrades",
    definition:
      "Inventor subclass upgrades chosen from your specialization list; count scales on the class level table.",
    spendPatterns: [],
  },
]

export function matchThirdPartyResourceHeader(header: string): ThirdPartyResourcePattern | null {
  const normalized = header.trim()
  for (const pattern of THIRD_PARTY_RESOURCE_PATTERNS) {
    if (pattern.namePattern.test(normalized)) return pattern
  }
  if (/exploits?\s*known/i.test(normalized)) {
    return {
      resourceKey: "exploits_known",
      namePattern: /exploits?\s*known/i,
      displayName: "Exploits Known",
      definition:
        "Number of Martial Exploits (or similar techniques) the character knows — a choice count, not a spendable pool.",
      spendPatterns: [],
    }
  }
  return null
}

export function detectThirdPartyResourceSpend(
  text: string,
  resourceKey: string,
): number | null {
  const pattern = THIRD_PARTY_RESOURCE_PATTERNS.find((entry) => entry.resourceKey === resourceKey)
  if (!pattern) return null
  for (const spendPattern of pattern.spendPatterns) {
    const match = text.match(spendPattern)
    if (match) {
      const amount = match[1] ? parseInt(match[1], 10) : 1
      return Number.isFinite(amount) && amount > 0 ? amount : 1
    }
  }
  return null
}

export function slugClassPrefix(className: string): string {
  return className
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
}

/** Prefix resource keys for renamed/homebrew classes to avoid colliding with SRD keys. */
export function prefixedResourceKey(classPrefix: string, baseKey: string): string {
  if (!classPrefix || baseKey.startsWith(`${classPrefix}_`)) return baseKey
  return `${classPrefix}_${baseKey}`
}
