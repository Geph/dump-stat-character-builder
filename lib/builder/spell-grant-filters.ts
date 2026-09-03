import { DEFAULT_SPELL_SCHOOL_NAMES } from "@/lib/compendium/schools-of-magic"

/** How a spell is typically used in play, inferred from its description. */
export const SPELL_USAGE_CATEGORIES = [
  { id: "attack_save", label: "Attack / saving throw" },
  { id: "ally_support", label: "Ally support" },
  { id: "defense", label: "Defense" },
  { id: "control", label: "Control" },
  { id: "utility", label: "Utility" },
] as const

export type SpellUsageCategoryId = (typeof SPELL_USAGE_CATEGORIES)[number]["id"]

const USAGE_LABEL_BY_ID = Object.fromEntries(
  SPELL_USAGE_CATEGORIES.map((entry) => [entry.id, entry.label]),
) as Record<SpellUsageCategoryId, string>

export type SpellUsageSource = {
  name?: string | null
  description?: string | null
  higher_levels?: string | null
}

/** Unique, sorted school names from a spell grant list. */
export function uniqueSpellSchools(spells: Array<{ school?: string | null }>): string[] {
  const seen = new Set<string>()
  for (const spell of spells) {
    const school = spell.school?.trim()
    if (school) seen.add(school)
  }
  return [...seen].sort((a, b) => a.localeCompare(b))
}

/**
 * Parse school allowlists from a spells_known label / spellChoiceLabel
 * (e.g. "Divination or Enchantment", "Fey Magic: choose level-1 Illusion or Necromancy spell").
 * Uses the SRD school catalog so labels stay stable without localStorage.
 */
export function spellSchoolsFromChoiceLabel(
  label: string | null | undefined,
  knownSchools: readonly string[] = DEFAULT_SPELL_SCHOOL_NAMES,
): string[] {
  if (!label?.trim()) return []
  const found: string[] = []
  for (const school of knownSchools) {
    const escaped = school.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    if (new RegExp(`\\b${escaped}\\b`, "i").test(label)) {
      found.push(school)
    }
  }
  return found
}

/** Narrow a grant list to one school, or return it unchanged for "all". */
export function filterSpellsBySchool<T extends { school?: string | null }>(
  spells: readonly T[],
  schoolFilter: string,
): T[] {
  if (!schoolFilter || schoolFilter === "all") return [...spells]
  return spells.filter((spell) => spell.school?.trim() === schoolFilter)
}

/** Keep spells whose school is in the allowlist (empty allowlist = no restriction). */
export function filterSpellsByAllowedSchools<T extends { school?: string | null }>(
  spells: readonly T[],
  allowedSchools: readonly string[] | null | undefined,
): T[] {
  if (!allowedSchools?.length) return [...spells]
  const allowed = new Set(allowedSchools.map((school) => school.trim().toLowerCase()).filter(Boolean))
  if (allowed.size === 0) return [...spells]
  return spells.filter((spell) => {
    const school = spell.school?.trim().toLowerCase()
    return Boolean(school && allowed.has(school))
  })
}

export function spellUsageCategoryLabel(id: SpellUsageCategoryId): string {
  return USAGE_LABEL_BY_ID[id]
}

/** Strip markup so classification can read imported HTML or markdown. */
export function spellUsageSourceText(spell: SpellUsageSource): string {
  return [spell.description, spell.higher_levels]
    .filter((part): part is string => Boolean(part?.trim()))
    .join("\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[_*`]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function hasOffensiveAttackOrSave(text: string): boolean {
  if (/\b(?:melee|ranged)\s+spell\s+attack\b/i.test(text) || /\bspell attack\b/i.test(text)) {
    return true
  }
  if (/\bdeal an extra \d+d\d+\b/i.test(text) && /\bhit it with an attack\b/i.test(text)) {
    return true
  }
  if (/\b(?:takes|taking)\s+\d+d\d+\b/i.test(text) && /\bdamage\b/i.test(text)) {
    return true
  }
  // Sanctuary-style wards force a save on the attacker, not an offensive check.
  if (/\bward(?:s|ed)?\b/i.test(text) && /\bchoose a new target\b/i.test(text)) {
    return false
  }
  return (
    /\bmust (?:succeed on|(?:each )?make) an? \w+ saving throw\b/i.test(text) ||
    /\bmakes? an? \w+ saving throw\b/i.test(text) ||
    /\bfails? an? \w+ saving throw\b/i.test(text) ||
    /\bon a failed save\b/i.test(text)
  )
}

function hasAllySupport(text: string): boolean {
  if (
    /\bregains?\b/i.test(text) &&
    /\bhit points?\b/i.test(text)
  ) {
    return true
  }
  if (/\bhit point maximum\b/i.test(text) || /\bbecomes stable\b/i.test(text)) {
    return true
  }
  if (/\btemporary hit points?\b/i.test(text)) {
    return true
  }
  if (/\byou bless\b/i.test(text)) {
    return true
  }
  if (/\bwilling creature\b/i.test(text) || /\bward(?:s|ed)? a creature\b/i.test(text)) {
    return true
  }
  if (
    /\b(?:you and each creature you choose|creature of your choice|creature you touch|you touch a creature)\b/i.test(
      text,
    ) &&
    /\b(?:bonus to|adds? \d+d\d+|speed increases|stealth|ac\b|advantage|invisible condition)\b/i.test(
      text,
    )
  ) {
    return true
  }
  return false
}

function hasDefense(text: string): boolean {
  return (
    /\bbonus to ac\b/i.test(text) ||
    /\bbase ac becomes\b/i.test(text) ||
    /\bprotects you\b/i.test(text) ||
    /\bward(?:s|ed)? a creature\b/i.test(text) ||
    /\battack rolls against you\b/i.test(text) ||
    /\bagainst the triggering attack\b/i.test(text) ||
    /\breduces? the total damage\b/i.test(text) ||
    /\btake no damage from\b/i.test(text) ||
    /\bresistance to\b/i.test(text)
  )
}

function hasControl(text: string): boolean {
  if (
    /\b(?:paralyzed|restrained|stunned|frightened|charmed|incapacitated|unconscious|blinded|deafened|petrified|prone)\b/i.test(
      text,
    )
  ) {
    return true
  }
  return (
    /\bdifficult terrain\b/i.test(text) ||
    /\bdisadvantage on (?:ability checks|attack rolls|saving throws)\b/i.test(text) ||
    /\bmust subtract\b/i.test(text) ||
    /\bcan'?t benefit from the invisible condition\b/i.test(text) ||
    /\bspeed (?:is |becomes )?(?:0|halved|reduced)\b/i.test(text) ||
    /\bdrop whatever it is holding\b/i.test(text)
  )
}

function hasUtility(text: string): boolean {
  return (
    /\b(?:detect|sense the presence|locate object|identify|comprehend|understand(?:s)? (?:the )?language)\b/i.test(
      text,
    ) ||
    /\bteleport\b/i.test(text) ||
    /\bfamiliar\b/i.test(text) ||
    /\binvisible condition\b/i.test(text) ||
    /\bmagical effect within range\b/i.test(text) ||
    /\bspectral, floating hand\b/i.test(text) ||
    /\b(?:knock|arcane lock|darkvision|water breathing|speak with)\b/i.test(text)
  )
}

/** One or more usage tags; utility is the fallback when nothing else matches. */
export function classifySpellUsage(spell: SpellUsageSource): SpellUsageCategoryId[] {
  const text = spellUsageSourceText(spell)
  const tags = new Set<SpellUsageCategoryId>()
  if (hasOffensiveAttackOrSave(text)) tags.add("attack_save")
  if (hasAllySupport(text)) tags.add("ally_support")
  if (hasDefense(text)) tags.add("defense")
  if (hasControl(text)) tags.add("control")
  if (hasUtility(text) || tags.size === 0) tags.add("utility")
  return SPELL_USAGE_CATEGORIES.map((entry) => entry.id).filter((id) => tags.has(id))
}

/** Narrow a grant list to one usage category, or return it unchanged for "all". */
export function filterSpellsByUsage<T extends SpellUsageSource>(
  spells: readonly T[],
  usageFilter: string,
): T[] {
  if (!usageFilter || usageFilter === "all") return [...spells]
  return spells.filter((spell) => classifySpellUsage(spell).includes(usageFilter as SpellUsageCategoryId))
}
