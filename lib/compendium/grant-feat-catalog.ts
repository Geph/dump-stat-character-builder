import { createModifierId, type GrantFeatCharacteristic } from "@/lib/compendium/characteristic-modifiers"
import {
  createModifierInstanceId,
  effectiveLinkedModifiers,
  resolveLinkedModifierInstance,
  type LinkedModifierInstance,
} from "@/lib/compendium/linked-modifiers"
import type { ModifierCatalogEntry } from "@/lib/compendium/modifier-catalog"
import { catalogEntryById } from "@/lib/compendium/modifier-catalog"
import type { Feature } from "@/lib/types"
import type { FeatPickCategory } from "@/lib/compendium/class-feature-metadata"

/** Single catalog entry for feat-granting modifiers (categories configured per link). */
export const GRANT_FEAT_CATALOG_ID = "cat_char_grant_feat"

/** Legacy preset ids — resolved to categories at runtime, not separate catalog rows. */
export const LEGACY_GRANT_FEAT_CATALOG_IDS = {
  general: "cat_char_grant_feat_general",
  epicBoon: "cat_char_grant_feat_epic_boon",
  fightingStyle: "cat_char_grant_feat_fighting_style",
} as const

const LEGACY_GRANT_FEAT_CATEGORIES: Record<string, FeatPickCategory[]> = {
  [LEGACY_GRANT_FEAT_CATALOG_IDS.general]: ["General"],
  [LEGACY_GRANT_FEAT_CATALOG_IDS.epicBoon]: ["Epic Boon"],
  [LEGACY_GRANT_FEAT_CATALOG_IDS.fightingStyle]: ["Fighting Style"],
}

export function featCategoriesForLegacyGrantRef(refId: string): FeatPickCategory[] | null {
  return LEGACY_GRANT_FEAT_CATEGORIES[refId] ?? null
}

export function grantFeatCatalogIdForCategories(_categories: string[]): string {
  return GRANT_FEAT_CATALOG_ID
}

export function grantFeatCharacteristic(
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

export type ResolvedGrantFeat = {
  catalogEntryId: string
  label: string
  featCategories: string[]
  count: number
}

function resolveGrantFeatCategories(
  refId: string,
  mod: GrantFeatCharacteristic,
): string[] {
  const legacy = featCategoriesForLegacyGrantRef(refId)
  if (legacy) return legacy
  return mod.featCategories?.length ? mod.featCategories : ["General"]
}

function grantFeatLabel(entry: ModifierCatalogEntry | undefined, refId: string, mod: GrantFeatCharacteristic): string {
  if (entry?.name && entry.id === GRANT_FEAT_CATALOG_ID) {
    const categories = resolveGrantFeatCategories(refId, mod)
    if (categories.length === 1) {
      const only = categories[0]
      if (only === "General") return "General Feat"
      if (only === "Epic Boon") return "Epic Boon"
      if (only === "Fighting Style") return "Fighting Style"
    }
    return `${entry.name} (${categories.join(", ")})`
  }
  return entry?.name ?? refId
}

export function grantFeatsFromModifierRefs(
  catalog: ModifierCatalogEntry[],
  refIds: string[] | null | undefined,
): ResolvedGrantFeat[] {
  if (!refIds?.length) return []
  const grants: ResolvedGrantFeat[] = []

  for (const refId of refIds) {
    const entry = catalogEntryById(catalog, refId)
    const legacyCategories = featCategoriesForLegacyGrantRef(refId)

    if (!entry?.characteristics?.length) {
      if (legacyCategories) {
        grants.push({
          catalogEntryId: refId,
          label:
            legacyCategories[0] === "Epic Boon"
              ? "Epic Boon"
              : legacyCategories[0] === "Fighting Style"
                ? "Fighting Style"
                : "General Feat",
          featCategories: legacyCategories,
          count: 1,
        })
      }
      continue
    }

    for (const mod of entry.characteristics) {
      if (mod.type !== "grant_feat") continue
      grants.push({
        catalogEntryId: refId,
        label: grantFeatLabel(entry, refId, mod),
        featCategories: resolveGrantFeatCategories(refId, mod),
        count: mod.count ?? 1,
      })
    }
  }

  return grants
}

export function grantFeatsFromLinkedModifiers(
  catalog: ModifierCatalogEntry[],
  instances: LinkedModifierInstance[] | null | undefined,
  legacyRefs?: string[] | null,
): ResolvedGrantFeat[] {
  const linked = effectiveLinkedModifiers(instances, legacyRefs, catalog)
  if (!linked.length) return []
  const grants: ResolvedGrantFeat[] = []

  for (const instance of linked) {
    const entry = catalogEntryById(catalog, instance.catalogRefId)
    const { characteristics } = resolveLinkedModifierInstance(instance, catalog)
    for (const mod of characteristics) {
      if (mod.type !== "grant_feat") continue
      grants.push({
        catalogEntryId: instance.catalogRefId,
        label: grantFeatLabel(entry, instance.catalogRefId, mod),
        featCategories: resolveGrantFeatCategories(instance.catalogRefId, mod),
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
  const fromLinked = grantFeatsFromLinkedModifiers(catalog, feature.linkedModifiers, feature.modifierRefs)
  if (fromLinked.length) return fromLinked

  const fromRefs = grantFeatsFromModifierRefs(catalog, feature.modifierRefs)
  if (fromRefs.length) return fromRefs

  if (feature.isChoice && feature.choices?.kind === "feats") {
    const featCategories = feature.choices.featCategories?.length
      ? feature.choices.featCategories
      : [feature.choices.category || "General"]
    return [
      {
        catalogEntryId: GRANT_FEAT_CATALOG_ID,
        label: feature.choices.category || feature.name,
        featCategories,
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

  const featCategories = (feature.choices.featCategories?.length
    ? feature.choices.featCategories
    : [feature.choices.category || "General"]) as FeatPickCategory[]

  return {
    ...feature,
    isChoice: false,
    choices: undefined,
    modifierRefs: [GRANT_FEAT_CATALOG_ID],
    linkedModifiers: [
      {
        instanceId: createModifierInstanceId(),
        catalogRefId: GRANT_FEAT_CATALOG_ID,
        characteristics: [grantFeatCharacteristic(featCategories, feature.choices.count ?? 1)],
      },
    ],
  }
}
