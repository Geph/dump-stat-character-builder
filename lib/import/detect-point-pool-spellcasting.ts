import {
  DEFAULT_ALTERNATE_SORCERER_COST_BY_LEVEL,
} from "@/lib/character/point-pool-spellcasting"
import { prefixedResourceKey, slugClassPrefix } from "@/lib/import/third-party-resources"
import type { DndClass } from "@/lib/types"

const POINT_POOL_PROSE =
  /\b(?:expend|spend)\s+(?:the\s+)?(?:amount\s+of\s+)?sorcery\s+points?\b/i
const NO_SLOTS_PROSE = /\bdoes\s+not\s+use\s+spell\s+slots\b/i

function parseCostTable(text: string): Record<number, number> | null {
  const table: Record<number, number> = { ...DEFAULT_ALTERNATE_SORCERER_COST_BY_LEVEL }
  let matched = false
  for (const row of text.matchAll(
    /\b(?:cantrip|(\d)(?:st|nd|rd|th))\s*[=:–-]\s*(\d+)\b/gi,
  )) {
    matched = true
    const level = row[1] ? parseInt(row[1], 10) : 0
    table[level] = parseInt(row[2], 10)
  }
  return matched ? table : null
}

/** Detect point-pool spellcasting from class prose (Alternate Sorcerer pattern). */
export function detectPointPoolSpellcastingFromText(
  className: string,
  description: string | null | undefined,
  featuresText: string,
): NonNullable<DndClass["spellcasting"]>["point_pool"] | null {
  const haystack = `${description ?? ""}\n${featuresText}`
  if (!POINT_POOL_PROSE.test(haystack) && !NO_SLOTS_PROSE.test(haystack)) return null

  const prefix = slugClassPrefix(className)
  const costByLevel = parseCostTable(haystack) ?? DEFAULT_ALTERNATE_SORCERER_COST_BY_LEVEL

  return {
    resource_key: prefixedResourceKey(prefix, "sorcery_points"),
    cost_by_level: costByLevel,
    base_cost_cap_resource_key: prefixedResourceKey(prefix, "spell_limit"),
    metamagic_cost_cap: "proficiency_bonus",
    replaces_spell_slots: true,
  }
}
