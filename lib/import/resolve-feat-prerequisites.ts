import type { Feat } from "@/lib/types"
import type { PrerequisiteRule } from "@/lib/import/content-schema"

export type ParsedFeatPrerequisite = {
  levelRequirement: number | null
  prerequisiteFeatNames: string[]
}

const LEVEL_ONLY_SEGMENT = /^(?:\d+(?:st|nd|rd|th)?\s+level|level\s*\d+)\+?$/i

/** Parse free-text feat prerequisites into structured fields. */
export function parseFeatPrerequisite(
  prerequisite: string | null | undefined,
): ParsedFeatPrerequisite {
  const text = prerequisite?.trim() ?? ""
  if (!text) {
    return { levelRequirement: null, prerequisiteFeatNames: [] }
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
    prerequisiteFeatNames.push(cleaned)
  }

  return { levelRequirement, prerequisiteFeatNames }
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

function normalizeFeatNameKey(name: string): string {
  return name.trim().toLowerCase()
}

export function resolvePrerequisiteFeatIds(
  names: string[],
  feats: Pick<Feat, "id" | "name">[],
): string[] {
  const byName = new Map(feats.map((feat) => [normalizeFeatNameKey(feat.name), feat.id]))
  const resolved: string[] = []

  for (const name of names) {
    const key = normalizeFeatNameKey(name)
    const id = byName.get(key)
    if (id) {
      resolved.push(id)
      continue
    }
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
>(row: T, feats: Pick<Feat, "id" | "name">[]): T {
  const parsed = parseFeatPrerequisite(row.prerequisite)
  const prerequisiteFeatIds = resolvePrerequisiteFeatIds(parsed.prerequisiteFeatNames, feats)
  const levelRequirement = row.level_requirement ?? parsed.levelRequirement ?? null
  const prerequisiteRules = inferOtherPrerequisiteRules(
    row.prerequisite,
    row.prerequisite_rules,
  )

  return {
    ...row,
    level_requirement: levelRequirement,
    prerequisite_feat_ids: prerequisiteFeatIds.length ? prerequisiteFeatIds : row.prerequisite_feat_ids ?? [],
    prerequisite_rules: prerequisiteRules.length ? prerequisiteRules : row.prerequisite_rules ?? [],
  }
}
