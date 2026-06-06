import { createModifierId, type GrantFeatCharacteristic } from "@/lib/compendium/characteristic-modifiers"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import { catalogEntryById } from "@/lib/compendium/modifier-catalog"
import type { Feature } from "@/lib/types"
import type { FeatPickCategory } from "@/lib/compendium/class-feature-metadata"

/** Preset catalog entry ids for feat-granting modifiers. */
export const GRANT_FEAT_CATALOG_IDS = {
  /** Configurable categories — edit in Common Modifier Effects. */
  custom: "cat_char_grant_feat",
  general: "cat_char_grant_feat_general",
  epicBoon: "cat_char_grant_feat_epic_boon",
  fightingStyle: "cat_char_grant_feat_fighting_style",
} as const

export type GrantFeatCatalogPreset = keyof typeof GRANT_FEAT_CATALOG_IDS

export function grantFeatCatalogIdForCategories(categories: string[]): string {
  const normalized = categories.map((c) => c.toLowerCase())
  if (normalized.includes("epic boon")) return GRANT_FEAT_CATALOG_IDS.epicBoon
  if (normalized.includes("fighting style")) return GRANT_FEAT_CATALOG_IDS.fightingStyle
  if (normalized.length === 1 && normalized[0] === "general") return GRANT_FEAT_CATALOG_IDS.general
  return GRANT_FEAT_CATALOG_IDS.custom
}

function grantFeatCharacteristic(
  featCategories: FeatPickCategory[],
  count = 1,
): GrantFeatCharacteristic {
  return {
    id: createModifierId(),
    type: "grant_feat",
    featCategories: [...featCategories],
    count,
  }
}

/** Preset common-modifier catalog rows for feat picks (linked from class features). */
export function buildGrantFeatCatalogEntries(): ModifierCatalogEntry[] {
  return [
    {
      id: GRANT_FEAT_CATALOG_IDS.general,
      name: "Gain a General Feat",
      group: "Feats & choices",
      summary: "Passive: choose a General feat",
      characteristics: [grantFeatCharacteristic(["General"])],
    },
    {
      id: GRANT_FEAT_CATALOG_IDS.epicBoon,
      name: "Gain an Epic Boon",
      group: "Feats & choices",
      summary: "Passive: choose an Epic Boon feat",
      characteristics: [grantFeatCharacteristic(["Epic Boon"])],
    },
    {
      id: GRANT_FEAT_CATALOG_IDS.fightingStyle,
      name: "Gain a Fighting Style",
      group: "Feats & choices",
      summary: "Passive: choose a Fighting Style feat",
      characteristics: [grantFeatCharacteristic(["Fighting Style"])],
    },
  ]
}

export type ResolvedGrantFeat = {
  catalogEntryId: string
  label: string
  featCategories: string[]
  count: number
}

export function grantFeatsFromModifierRefs(
  catalog: ModifierCatalogEntry[],
  refIds: string[] | null | undefined,
): ResolvedGrantFeat[] {
  if (!refIds?.length) return []
  const grants: ResolvedGrantFeat[] = []

  for (const refId of refIds) {
    const entry = catalogEntryById(catalog, refId)
    if (!entry?.characteristics?.length) continue
    for (const mod of entry.characteristics) {
      if (mod.type !== "grant_feat") continue
      grants.push({
        catalogEntryId: refId,
        label: entry.name,
        featCategories: mod.featCategories?.length ? mod.featCategories : ["General"],
        count: mod.count ?? 1,
      })
    }
  }

  return grants
}

/** Legacy feat-choice features and grant_feat modifier refs. */
export function grantFeatsFromFeature(
  feature: Feature,
  catalog: ModifierCatalogEntry[],
): ResolvedGrantFeat[] {
  const fromRefs = grantFeatsFromModifierRefs(catalog, feature.modifierRefs)
  if (fromRefs.length) return fromRefs

  if (feature.isChoice && feature.choices?.kind === "feats") {
    return [
      {
        catalogEntryId: grantFeatCatalogIdForCategories(feature.choices.featCategories ?? ["General"]),
        label: feature.choices.category || feature.name,
        featCategories: feature.choices.featCategories?.length
          ? feature.choices.featCategories
          : [feature.choices.category || "General"],
        count: feature.choices.count ?? 1,
      },
    ]
  }

  return []
}

export function featureGrantsFeats(feature: Feature, catalog: ModifierCatalogEntry[]): boolean {
  return grantFeatsFromFeature(feature, catalog).length > 0
}

export function migrateFeatureFeatChoiceToModifierRefs(feature: Feature): Feature {
  if (!feature.isChoice || feature.choices?.kind !== "feats") return feature

  const refId = grantFeatCatalogIdForCategories(feature.choices.featCategories ?? ["General"])
  const existing = feature.modifierRefs ?? []
  const modifierRefs = existing.includes(refId) ? existing : [...existing, refId]

  return {
    ...feature,
    isChoice: false,
    choices: undefined,
    modifierRefs,
  }
}
