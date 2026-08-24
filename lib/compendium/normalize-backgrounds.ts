import { parseBackgroundAbilityFromImportText } from "@/lib/import/background-parse"
import { applySrdItemIcon, SRD_BACKGROUND_ICONS_BY_NAME } from "@/lib/compendium/srd-item-icons-defaults"
import { SRD_BACKGROUND_CARD_IMAGES_BY_NAME } from "@/lib/compendium/background-card-images-defaults"
import { applyBundledCardImage } from "@/lib/compendium/card-image"
import bundledBackgrounds from "@/lib/srd/seed-data/backgrounds.json"
import { applySrdFlavorDescription } from "@/lib/compendium/srd-flavor-descriptions"
import { isSrdSource } from "@/lib/srd/source"
import {
  normalizeBackgroundAbilityBonuses,
  parseBackgroundAbilityScoresLine,
} from "@/lib/compendium/background-utils"
import { parseBackgroundFeatGrantChoice } from "@/lib/compendium/background-origin-feat"
import { grantFeatCharacteristic, GRANT_FEAT_CATALOG_ID } from "@/lib/compendium/grant-feat-catalog"
import { createModifierInstanceId } from "@/lib/compendium/linked-modifiers"
import type { FeatPickCategory } from "@/lib/compendium/class-feature-metadata"
import { wireBackgroundProficiencyChoices } from "@/lib/compendium/wire-background-proficiency-choices"
import {
  applyKibblesRowPresentation,
  KIBBLES_BACKGROUND_PRESENTATION,
} from "@/lib/seed-packs/kibbles-tasty/species-background-presentation"

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

function featureHasGrantFeat(feature: Record<string, unknown> | null): boolean {
  if (!feature) return false
  const linked = (feature.linkedModifiers ?? feature.linked_modifiers) as unknown[] | undefined
  if (!Array.isArray(linked)) return false
  return linked.some((instance) => {
    if (!instance || typeof instance !== "object") return false
    const characteristics = (instance as { characteristics?: unknown }).characteristics
    if (!Array.isArray(characteristics)) return false
    return characteristics.some(
      (characteristic) =>
        Boolean(
          characteristic &&
            typeof characteristic === "object" &&
            (characteristic as { type?: unknown }).type === "grant_feat",
        ),
    )
  })
}

function wireBackgroundFeatGrantChoice(row: Record<string, unknown>): Record<string, unknown> {
  const parsed = parseBackgroundFeatGrantChoice(
    typeof row.feat_granted === "string" ? row.feat_granted : null,
  )
  if (!parsed) return row

  const feature = (row.feature ?? null) as unknown as Record<string, unknown> | null
  // Phrase detection often wires tools/languages first. Don't leave feat_granted as a
  // fake named feat ("Gain a Feat (Dark Gift)") just because other modifiers exist.
  if (featureHasGrantFeat(feature)) {
    return { ...row, feat_granted: null }
  }

  const existing = ((feature?.linkedModifiers ?? feature?.linked_modifiers) as unknown[] | undefined) ?? []
  const characteristic = grantFeatCharacteristic([parsed.category as FeatPickCategory], 1)
  if (parsed.alsoFeatNames?.length) {
    characteristic.alsoFeatNames = [...parsed.alsoFeatNames]
  }

  const linkedModifiers = [
    ...existing,
    {
      instanceId: createModifierInstanceId(),
      catalogRefId: GRANT_FEAT_CATALOG_ID,
      characteristics: [characteristic],
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
  const explicitNullBonuses = row.ability_bonuses === null
  let ability_bonuses = explicitNullBonuses
    ? ({} as Record<string, number>)
    : parseStoredAbilityBonuses(row.ability_bonuses)

  if (!explicitNullBonuses && !Object.keys(ability_bonuses).length) {
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

  if (!explicitNullBonuses && !Object.keys(ability_bonuses).length && typeof row.description === "string") {
    ability_bonuses = normalizeBackgroundAbilityBonuses(
      parseBackgroundAbilityFromImportText(row.description),
    )
  }

  return wireBackgroundProficiencyChoices(
    wireBackgroundFeatGrantChoice({
      ...row,
      ability_bonuses: explicitNullBonuses
        ? null
        : Object.keys(ability_bonuses).length
          ? ability_bonuses
          : null,
    }),
  )
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
    const normalized = normalizeBackgroundRow(row as unknown as Record<string, unknown>) as T
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

    const rowRecord = row as unknown as Record<string, unknown>
    if (!rowRecord.starting_equipment_groups && seed?.starting_equipment_groups) {
      enriched.starting_equipment_groups = seed.starting_equipment_groups
    }
    if ((rowRecord.starting_gold == null || rowRecord.starting_gold === 0) && seed?.starting_gold) {
      enriched.starting_gold = seed.starting_gold
    }

    // Match bundled card art by background name (any source) — never jeffginger hosts.
    return applyBundledCardImage(
      applySrdItemIcon(
        applySrdFlavorDescription(
          applyKibblesRowPresentation(
            enriched as unknown as Record<string, unknown>,
            KIBBLES_BACKGROUND_PRESENTATION,
          ),
          "background",
        ),
        SRD_BACKGROUND_ICONS_BY_NAME,
      ),
      SRD_BACKGROUND_CARD_IMAGES_BY_NAME,
    ) as T
  })
}

export function normalizeBackgroundRows(
  rows: { name: string; ability_bonuses?: unknown; feat_granted?: string | null; source?: string | null }[],
): Record<string, unknown>[] {
  return enrichBackgroundList(
    rows as { name: string; ability_bonuses?: unknown; feat_granted?: string | null; source?: string | null }[],
  )
}
