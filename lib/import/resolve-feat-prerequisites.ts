import type { Feat } from "@/lib/types"
import type { PrerequisiteRule } from "@/lib/import/content-schema"
import type { AbilityScoreKey } from "@/lib/compendium/characteristic-modifiers"
import { resolvePreferredNameMatch } from "@/lib/compendium/prefer-same-source"

export type ArmorTrainingValue = Extract<
  PrerequisiteRule,
  { category: "armor_training" }
>["value"]

export type AbilityScorePrerequisite = {
  abilities: AbilityScoreKey[]
  minimum: number
}

export type ParsedFeatPrerequisite = {
  levelRequirement: number | null
  prerequisiteFeatNames: string[]
  armorTraining: ArmorTrainingValue[]
  abilityScoreRequirements: AbilityScorePrerequisite[]
}

const LEVEL_ONLY_SEGMENT = /^(?:\d+(?:st|nd|rd|th)?\s+level|level\s*\d+)\+?$/i

const ABILITY_NAME_TO_KEY: Record<string, AbilityScoreKey> = {
  strength: "strength",
  dexterity: "dexterity",
  constitution: "constitution",
  intelligence: "intelligence",
  wisdom: "wisdom",
  charisma: "charisma",
  str: "strength",
  dex: "dexterity",
  con: "constitution",
  int: "intelligence",
  wis: "wisdom",
  cha: "charisma",
}

const ARMOR_TRAINING_PATTERNS: Array<{
  re: RegExp
  value: ArmorTrainingValue
}> = [
  {
    re: /^(?:proficiency with\s+)?light\s+armou?r(?:\s+training)?$/i,
    value: "Light armor",
  },
  {
    re: /^(?:proficiency with\s+)?medium\s+armou?r(?:\s+training)?$/i,
    value: "Medium armor",
  },
  {
    re: /^(?:proficiency with\s+)?heavy\s+armou?r(?:\s+training)?$/i,
    value: "Heavy armor",
  },
  {
    re: /^training with\s+light\s+armou?r$/i,
    value: "Light armor",
  },
  {
    re: /^training with\s+medium\s+armou?r$/i,
    value: "Medium armor",
  },
  {
    re: /^training with\s+heavy\s+armou?r$/i,
    value: "Heavy armor",
  },
  {
    re: /^(?:proficiency with\s+)?shields?(?:\s+training)?$/i,
    value: "Shields",
  },
]

function parseArmorTrainingSegment(segment: string): ArmorTrainingValue | null {
  const cleaned = segment.trim()
  for (const { re, value } of ARMOR_TRAINING_PATTERNS) {
    if (re.test(cleaned)) return value
  }
  return null
}

function parseAbilityScoreSegment(segment: string): AbilityScorePrerequisite | null {
  const cleaned = segment.trim().replace(/\.$/, "")
  const match = cleaned.match(
    /^((?:strength|dexterity|constitution|intelligence|wisdom|charisma|str|dex|con|int|wis|cha)(?:\s+or\s+(?:strength|dexterity|constitution|intelligence|wisdom|charisma|str|dex|con|int|wis|cha))*)\s+(\d+)\+?$/i,
  )
  if (!match) return null

  const abilities = match[1]
    .split(/\s+or\s+/i)
    .map((part) => ABILITY_NAME_TO_KEY[part.trim().toLowerCase()])
    .filter((key): key is AbilityScoreKey => Boolean(key))
  const minimum = Number.parseInt(match[2], 10)
  if (!abilities.length || !Number.isFinite(minimum)) return null
  return { abilities: [...new Set(abilities)], minimum }
}

/** Parse free-text feat prerequisites into structured fields. */
export function parseFeatPrerequisite(
  prerequisite: string | null | undefined,
): ParsedFeatPrerequisite {
  const text = prerequisite?.trim() ?? ""
  if (!text) {
    return {
      levelRequirement: null,
      prerequisiteFeatNames: [],
      armorTraining: [],
      abilityScoreRequirements: [],
    }
  }

  let levelRequirement: number | null = null
  const levelMatch = text.match(/\blevel\s*(\d+)\+?/i)
  if (levelMatch) {
    levelRequirement = Number.parseInt(levelMatch[1], 10)
  }
  const ordinalLevelMatch = text.match(/\b(\d+)(?:st|nd|rd|th)?\s+level\b/i)
  if (!levelRequirement && ordinalLevelMatch) {
    levelRequirement = Number.parseInt(ordinalLevelMatch[1], 10)
  }
  const classLevelMatch = text.match(/(\d+)(?:st|nd|rd|th)?-level\s+[A-Za-z\s]+/i)
  if (!levelRequirement && classLevelMatch) {
    levelRequirement = Number.parseInt(classLevelMatch[1], 10)
  }

  const prerequisiteFeatNames: string[] = []
  const armorTraining: ArmorTrainingValue[] = []
  const abilityScoreRequirements: AbilityScorePrerequisite[] = []
  const segments = text.split(/[,;]/).map((segment) => segment.trim()).filter(Boolean)
  for (const segment of segments) {
    if (LEVEL_ONLY_SEGMENT.test(segment)) continue
    if (/^level\s*\d+/i.test(segment)) continue
    if (/can'?t have another/i.test(segment)) continue
    if (/\bcampaign\b/i.test(segment)) continue
    if (/^prerequisite:?$/i.test(segment.trim())) continue

    const cleaned = segment
      .replace(/^prerequisite:\s*/i, "")
      .replace(/\s+feat$/i, "")
      // "Scion of the Outer Planes (Lawful Outer Plane)" → base feat name for resolve
      .replace(/\s*\([^)]*\)\s*$/g, "")
      .trim()
    if (!cleaned || LEVEL_ONLY_SEGMENT.test(cleaned) || /^level\b/i.test(cleaned)) continue

    const armor = parseArmorTrainingSegment(cleaned)
    if (armor) {
      if (!armorTraining.includes(armor)) armorTraining.push(armor)
      continue
    }

    const ability = parseAbilityScoreSegment(cleaned)
    if (ability) {
      abilityScoreRequirements.push(ability)
      continue
    }

    prerequisiteFeatNames.push(cleaned)
  }

  return {
    levelRequirement,
    prerequisiteFeatNames,
    armorTraining,
    abilityScoreRequirements,
  }
}

export function inferOtherPrerequisiteRules(
  prerequisite: string | null | undefined,
  existing: PrerequisiteRule[] | null | undefined = [],
): PrerequisiteRule[] {
  const rules = [...(existing ?? [])]
  const text = prerequisite?.trim() ?? ""
  if (text && /\bcampaign\b/i.test(text)) {
    const value = text.replace(/^prerequisite:\s*/i, "").trim()
    if (
      value &&
      !rules.some(
        (rule) =>
          rule.category === "other" && rule.value.toLowerCase() === value.toLowerCase(),
      )
    ) {
      rules.push({ category: "other", value })
    }
  }
  return rules
}

/** Merge campaign + mechanical rules inferred from freeform prerequisite text. */
export function inferFeatPrerequisiteRules(
  prerequisite: string | null | undefined,
  existing: PrerequisiteRule[] | null | undefined = [],
): PrerequisiteRule[] {
  const parsed = parseFeatPrerequisite(prerequisite)
  const rules = inferOtherPrerequisiteRules(prerequisite, existing)

  for (const armor of parsed.armorTraining) {
    if (
      !rules.some(
        (rule) => rule.category === "armor_training" && rule.value === armor,
      )
    ) {
      rules.push({ category: "armor_training", value: armor })
    }
  }

  for (const ability of parsed.abilityScoreRequirements) {
    const key = [...ability.abilities].sort().join("|")
    if (
      !rules.some((rule) => {
        if (rule.category !== "ability_score") return false
        if (rule.minimum !== ability.minimum) return false
        return [...rule.abilities].sort().join("|") === key
      })
    ) {
      rules.push({
        category: "ability_score",
        abilities: ability.abilities,
        minimum: ability.minimum,
      })
    }
  }

  return rules
}

function normalizeFeatNameKey(name: string): string {
  return name.trim().toLowerCase()
}

export function resolvePrerequisiteFeatIds(
  names: string[],
  feats: Pick<Feat, "id" | "name">[] | Pick<Feat, "id" | "name" | "source">[],
  preferredSource?: string | null,
): string[] {
  const catalog = feats.map((feat) => ({
    id: feat.id,
    name: feat.name,
    source: "source" in feat ? feat.source : null,
  }))
  const resolved: string[] = []

  for (const name of names) {
    const match = resolvePreferredNameMatch(name, catalog, preferredSource)
    if (match) {
      resolved.push(match.id)
      continue
    }
    const key = normalizeFeatNameKey(name)
    const fuzzy = feats.find(
      (feat) =>
        normalizeFeatNameKey(feat.name) === key ||
        key.startsWith(normalizeFeatNameKey(feat.name)),
    )
    if (fuzzy) resolved.push(fuzzy.id)
  }

  return [...new Set(resolved)]
}

export function enrichFeatRowWithPrerequisites<
  T extends {
    name: string
    prerequisite?: string | null
    level_requirement?: number | null
    prerequisite_feat_ids?: string[] | null
    prerequisite_rules?: PrerequisiteRule[] | null
    category?: string | null
  },
>(
  row: T,
  feats: Pick<Feat, "id" | "name">[] | Pick<Feat, "id" | "name" | "source">[],
  preferredSource?: string | null,
): T {
  const parsed = parseFeatPrerequisite(row.prerequisite)
  const prerequisiteFeatIds = resolvePrerequisiteFeatIds(
    parsed.prerequisiteFeatNames,
    feats,
    preferredSource,
  )
  const levelRequirement = row.level_requirement ?? parsed.levelRequirement ?? null
  const prerequisiteRules = inferFeatPrerequisiteRules(
    row.prerequisite,
    row.prerequisite_rules,
  )

  return {
    ...row,
    level_requirement: levelRequirement,
    prerequisite_feat_ids: prerequisiteFeatIds.length
      ? prerequisiteFeatIds
      : (row.prerequisite_feat_ids ?? []),
    prerequisite_rules: prerequisiteRules.length
      ? prerequisiteRules
      : (row.prerequisite_rules ?? []),
  }
}

function normalizeArmorProficiencyToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

/** Whether the character's armor list includes the required training/proficiency. */
export function hasArmorTraining(
  armorProficiencies: string[] | null | undefined,
  required: ArmorTrainingValue,
): boolean {
  const list = (armorProficiencies ?? []).map(normalizeArmorProficiencyToken)
  if (!list.length) return false

  const hasAllArmor = list.some(
    (entry) =>
      entry === "all armor" ||
      entry === "all armours" ||
      entry === "all armors" ||
      entry.includes("all armor"),
  )

  if (required === "Shields") {
    return list.some(
      (entry) => entry === "shields" || entry === "shield" || entry.includes("shield"),
    )
  }

  if (hasAllArmor) return true

  const needle =
    required === "Light armor"
      ? "light"
      : required === "Medium armor"
        ? "medium"
        : "heavy"

  return list.some((entry) => {
    if (entry === needle) return true
    if (entry.includes(`${needle} armor`) || entry.includes(`${needle} armour`)) return true
    // Values like "Medium" from feat presets
    if (entry === `${needle} armors` || entry === `${needle} armours`) return true
    return false
  })
}

export function meetsAbilityScorePrerequisite(
  scores: Partial<Record<AbilityScoreKey, number>> | null | undefined,
  requirement: AbilityScorePrerequisite,
): boolean {
  if (!scores) return false
  return requirement.abilities.some((ability) => {
    const score = scores[ability]
    return typeof score === "number" && score >= requirement.minimum
  })
}

/**
 * Collect mechanical prerequisite rules from structured rules and/or freeform text.
 * Freeform fallback covers feats imported before armor/ability rules were persisted.
 */
export function collectMechanicalFeatPrerequisiteRules(
  feat: Pick<Feat, "prerequisite" | "prerequisite_rules">,
): Extract<PrerequisiteRule, { category: "armor_training" | "ability_score" }>[] {
  const fromRules = (feat.prerequisite_rules ?? []).filter(
    (
      rule,
    ): rule is Extract<PrerequisiteRule, { category: "armor_training" | "ability_score" }> =>
      rule.category === "armor_training" || rule.category === "ability_score",
  )
  if (fromRules.length) return fromRules

  const inferred = inferFeatPrerequisiteRules(feat.prerequisite, [])
  return inferred.filter(
    (
      rule,
    ): rule is Extract<PrerequisiteRule, { category: "armor_training" | "ability_score" }> =>
      rule.category === "armor_training" || rule.category === "ability_score",
  )
}
