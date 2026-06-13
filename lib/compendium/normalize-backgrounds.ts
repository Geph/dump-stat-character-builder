import { parseBackgroundAbilityFromImportText } from "@/lib/import/background-parse"
import bundledBackgrounds from "@/lib/srd/seed-data/backgrounds.json"
import { isSrdSource } from "@/lib/srd/source"
import {
  normalizeBackgroundAbilityBonuses,
  parseBackgroundAbilityScoresLine,
} from "@/lib/compendium/background-utils"

const bundledBackgroundByName = new Map(
  (bundledBackgrounds as unknown as { name: string; ability_bonuses?: Record<string, number> }[]).map(
    (background) => [background.name, background],
  ),
)

function parseStoredAbilityBonuses(raw: unknown): Record<string, number> {
  if (typeof raw === "string") {
    try {
      return normalizeBackgroundAbilityBonuses(JSON.parse(raw) as Record<string, number>)
    } catch {
      return {}
    }
  }
  return normalizeBackgroundAbilityBonuses(raw as Record<string, number> | null | undefined)
}

/** Normalize a background row before save or after load. */
export function normalizeBackgroundRow(row: Record<string, unknown>): Record<string, unknown> {
  let ability_bonuses = parseStoredAbilityBonuses(row.ability_bonuses)

  if (!Object.keys(ability_bonuses).length) {
    const abilityLine =
      typeof row.ability_scores === "string"
        ? row.ability_scores
        : typeof row.abilityScores === "string"
          ? row.abilityScores
          : null
    if (abilityLine) {
      ability_bonuses = normalizeBackgroundAbilityBonuses(
        parseBackgroundAbilityScoresLine(abilityLine),
      )
    }
  }

  if (!Object.keys(ability_bonuses).length && typeof row.description === "string") {
    ability_bonuses = normalizeBackgroundAbilityBonuses(
      parseBackgroundAbilityFromImportText(row.description),
    )
  }

  return {
    ...row,
    ability_bonuses: Object.keys(ability_bonuses).length ? ability_bonuses : null,
  }
}

/** Fill missing SRD background ability scores from bundled seed data. */
export function enrichBackgroundList<
  T extends { name: string; ability_bonuses?: unknown; source?: string | null },
>(rows: T[]): T[] {
  return rows.map((row) => {
    const normalized = normalizeBackgroundRow(row as Record<string, unknown>) as T
    const bonuses = parseStoredAbilityBonuses(normalized.ability_bonuses)
    if (Object.keys(bonuses).length) {
      return { ...normalized, ability_bonuses: bonuses }
    }

    if (!isSrdSource(row.source)) return normalized

    const seed = bundledBackgroundByName.get(row.name)
    if (!seed?.ability_bonuses) return normalized

    return {
      ...normalized,
      ability_bonuses: normalizeBackgroundAbilityBonuses(seed.ability_bonuses),
    }
  })
}

export function normalizeBackgroundRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(normalizeBackgroundRow)
}
