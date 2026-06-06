import type { UsesConfig } from "@/lib/types"

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
    case "unlimited":
      return null
    case "class_resource":
    case "custom_ability":
      return null
    default:
      return null
  }
}
