import { parseBackgroundAbilityFromImportText } from "@/lib/import/background-parse"
import bundledBackgrounds from "@/lib/srd/seed-data/backgrounds.json"
import { applySrdFlavorDescription } from "@/lib/compendium/srd-flavor-descriptions"
import { isSrdSource } from "@/lib/srd/source"
import {
  normalizeBackgroundAbilityBonuses,
  parseBackgroundAbilityScoresLine,
} from "@/lib/compendium/background-utils"
import { parseBackgroundFeatGrantChoiceCategory } from "@/lib/compendium/background-origin-feat"
import { grantFeatCharacteristic, GRANT_FEAT_CATALOG_ID } from "@/lib/compendium/grant-feat-catalog"
import { createModifierInstanceId } from "@/lib/compendium/linked-modifiers"
import type { FeatPickCategory } from "@/lib/compendium/class-feature-metadata"

const bundledBackgroundByName = new Map(
  (bundledBackgrounds as unknown as {
    name: string
    ability_bonuses?: Record<string, number>
    feat_granted?: string | null
    starting_equipment_groups?: unknown
    starting_gold?: number
  }[]).map((background) => [background.name, background]),
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

function wireBackgroundFeatGrantChoice(row: Record<string, unknown>): Record<string, unknown> {
  const category = parseBackgroundFeatGrantChoiceCategory(
    typeof row.feat_granted === "string" ? row.feat_granted : null,
  )
  if (!category) return row

  const feature = (row.feature ?? null) as Record<string, unknown> | null
  const linked = (feature?.linkedModifiers ?? feature?.linked_modifiers) as unknown[] | undefined
  if (linked?.length) return row

  const linkedModifiers = [
    {
      instanceId: createModifierInstanceId(),
      catalogRefId: GRANT_FEAT_CATALOG_ID,
      characteristics: [grantFeatCharacteristic([category as FeatPickCategory], 1)],
    },
  ]

  return {
    ...row,
    feat_granted: null,
    feature: feature
      ? { ...feature, linkedModifiers, linked_modifiers: linkedModifiers }
      : {
          name: "Background Feature",
          description: "",
          linkedModifiers,
          linked_modifiers: linkedModifiers,
        },
  }
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

  return wireBackgroundFeatGrantChoice({
    ...row,
    ability_bonuses: Object.keys(ability_bonuses).length ? ability_bonuses : null,
  })
}

/** Fill missing SRD background fields from bundled seed data. */
export function enrichBackgroundList<
  T extends {
    name: string
    ability_bonuses?: unknown
    feat_granted?: string | null
    source?: string | null
  },
>(rows: T[]): T[] {
  return rows.map((row) => {
    const normalized = normalizeBackgroundRow(row as Record<string, unknown>) as T
    const bonuses = parseStoredAbilityBonuses(normalized.ability_bonuses)
    const seed = bundledBackgroundByName.get(row.name)

    const enriched = { ...normalized } as T & {
      starting_equipment_groups?: unknown
      starting_gold?: number
      feat_granted?: string | null
    }

    if (Object.keys(bonuses).length) {
      enriched.ability_bonuses = bonuses as T["ability_bonuses"]
    } else if (seed?.ability_bonuses) {
      enriched.ability_bonuses = normalizeBackgroundAbilityBonuses(seed.ability_bonuses) as T["ability_bonuses"]
    }

    if (isSrdSource(row.source) && seed) {
      if (!String(enriched.feat_granted ?? "").trim() && seed.feat_granted) {
        enriched.feat_granted = seed.feat_granted
      }
    }

    const rowRecord = row as Record<string, unknown>
    if (!rowRecord.starting_equipment_groups && seed?.starting_equipment_groups) {
      enriched.starting_equipment_groups = seed.starting_equipment_groups
    }
    if ((rowRecord.starting_gold == null || rowRecord.starting_gold === 0) && seed?.starting_gold) {
      enriched.starting_gold = seed.starting_gold
    }

    return applySrdFlavorDescription(enriched as Record<string, unknown>, "background") as T
  })
}

export function normalizeBackgroundRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return enrichBackgroundList(rows.map(normalizeBackgroundRow))
}
