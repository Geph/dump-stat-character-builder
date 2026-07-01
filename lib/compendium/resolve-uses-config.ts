import type { UsesConfig } from "@/lib/types"
import { totalSpellSlotsForCasterType } from "@/lib/compendium/spell-slots"

export type ResolveUsesContext = {
  proficiencyBonus?: number
  abilityModifiers?: Partial<Record<"STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA", number>>
}

function tierCount(table: { level: number; count: number }[], characterLevel: number): number {
  if (!table.length) return 0
  const sorted = [...table].sort((a, b) => a.level - b.level)
  let count = sorted[0]?.count ?? 0
  for (const row of sorted) {
    if (characterLevel >= row.level) count = row.count
  }
  return count
}

function parseDieSidesFromType(dieType: UsesConfig["dieType"]): number | null {
  if (!dieType) return null
  const match = dieType.match(/^d(\d+)$/i)
  if (!match) return null
  const sides = parseInt(match[1], 10)
  return Number.isFinite(sides) ? sides : null
}

/** Resolve die sides for a level-scaled dice pool (e.g. Exploit Dice d8 at level 5). */
export function resolveDieSidesAtLevel(
  uses: UsesConfig,
  characterLevel: number,
): number | null {
  const table = uses.dieSidesByLevel ?? []
  if (table.length) return tierCount(table, characterLevel) || null
  return parseDieSidesFromType(uses.dieType)
}

/** Human-readable die label for a dice pool resource at a given level. */
export function formatResourceDieLabel(uses: UsesConfig, characterLevel: number): string | null {
  const sides = resolveDieSidesAtLevel(uses, characterLevel)
  return sides != null ? `d${sides}` : uses.dieType ?? null
}

/** Resolve maximum uses for a UsesConfig at a given character level. */
export function resolveUsesAtLevel(
  uses: UsesConfig,
  characterLevel: number,
  ctx: ResolveUsesContext = {},
): number | null {
  switch (uses.type) {
    case "fixed":
      return uses.fixedAmount ?? 1
    case "proficiency":
      return Math.max(1, ctx.proficiencyBonus ?? 2)
    case "ability_modifier": {
      const key = uses.abilityModifier ?? "CHA"
      const mod = ctx.abilityModifiers?.[key] ?? 0
      return Math.max(1, mod)
    }
    case "at_level": {
      const table = uses.atLevelTable ?? []
      if (uses.atLevelMode === "multiply_level") {
        const multiplier = tierCount(table, characterLevel) || table[0]?.count || 1
        return Math.max(0, characterLevel * multiplier)
      }
      return tierCount(table, characterLevel)
    }
    case "spell_slots":
      // Total slots across all spell levels; the per-level breakdown is rendered
      // via the dedicated spell-slot table on the character sheet.
      return totalSpellSlotsForCasterType(uses.casterType ?? "full", characterLevel)
    case "unlimited":
      return null
    case "class_resource":
    case "custom_ability":
      return null
    default:
      return null
  }
}
