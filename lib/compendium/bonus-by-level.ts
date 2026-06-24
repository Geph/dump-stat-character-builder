import type { RollBonusConfig } from "@/lib/compendium/roll-bonus-config"
import { formatRollBonusSummary } from "@/lib/compendium/roll-bonus-config"

export type BonusByLevelMode = "fixed" | "dice" | "modifier"

export interface BonusByLevelEntry {
  level: number
  mode: BonusByLevelMode
  fixed?: number | null
  dieCount?: number | null
  dieType?: "d4" | "d6" | "d8" | "d10" | "d12" | null
  modifierConfig?: RollBonusConfig | null
  /** @deprecated Legacy text bonus (e.g. "+2", "2d6") */
  bonus?: string
}

export function normalizeBonusByLevel(
  rows: unknown[] | null | undefined,
): BonusByLevelEntry[] {
  if (!Array.isArray(rows)) return []
  return rows.map((row) => {
    if (!row || typeof row !== "object") {
      return { level: 1, mode: "fixed" as const, fixed: 0 }
    }
    const r = row as Record<string, unknown>
    if (r.mode && typeof r.mode === "string") {
      return {
        level: typeof r.level === "number" ? r.level : 1,
        mode: r.mode as BonusByLevelMode,
        fixed: typeof r.fixed === "number" ? r.fixed : null,
        dieCount: typeof r.dieCount === "number" ? r.dieCount : null,
        dieType: (r.dieType as BonusByLevelEntry["dieType"]) ?? null,
        modifierConfig: (r.modifierConfig as RollBonusConfig | null) ?? null,
        bonus: typeof r.bonus === "string" ? r.bonus : undefined,
      }
    }
    const legacy = typeof r.bonus === "string" ? r.bonus : "+0"
    const diceMatch = legacy.match(/^(\d+)d(\d+)$/i)
    const fixedMatch = legacy.match(/^\+?(\d+)$/)
    if (diceMatch) {
      return {
        level: typeof r.level === "number" ? r.level : 1,
        mode: "dice",
        dieCount: parseInt(diceMatch[1], 10),
        dieType: `d${diceMatch[2]}` as BonusByLevelEntry["dieType"],
        bonus: legacy,
      }
    }
    if (fixedMatch) {
      return {
        level: typeof r.level === "number" ? r.level : 1,
        mode: "fixed",
        fixed: parseInt(fixedMatch[1], 10),
        bonus: legacy,
      }
    }
    return {
      level: typeof r.level === "number" ? r.level : 1,
      mode: "fixed",
      fixed: 0,
      bonus: legacy,
    }
  })
}

export function formatBonusByLevelEntry(entry: BonusByLevelEntry): string {
  switch (entry.mode) {
    case "fixed":
      return entry.fixed != null ? `+${entry.fixed}` : "+0"
    case "dice":
      return entry.dieCount && entry.dieType ? `${entry.dieCount}${entry.dieType}` : "—"
    case "modifier":
      return formatRollBonusSummary(entry.modifierConfig)
    default:
      return entry.bonus ?? "—"
  }
}

export function defaultBonusByLevelEntry(level = 1): BonusByLevelEntry {
  return { level, mode: "fixed", fixed: 2 }
}

/** Pick the fixed value from the highest tier at or below character level. */
export function resolveFixedValueAtLevel(
  rows: BonusByLevelEntry[] | null | undefined,
  characterLevel: number,
  base: number | null = null,
): number | null {
  if (!rows?.length) return base
  const sorted = [...rows].filter((row) => row.mode === "fixed").sort((a, b) => a.level - b.level)
  let current = base
  for (const row of sorted) {
    if (row.level > characterLevel) break
    if (row.fixed != null) current = row.fixed
  }
  return current
}

export function defaultCritByLevelEntry(level = 1, minimum = 19): BonusByLevelEntry {
  return { level, mode: "fixed", fixed: minimum }
}
