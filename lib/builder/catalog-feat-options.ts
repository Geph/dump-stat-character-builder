import type { CharacteristicModifier } from "@/lib/compendium/characteristic-modifiers"
import { normalizeCharacteristics } from "@/lib/compendium/characteristic-modifiers"
import type { FeatPickCategory } from "@/lib/compendium/class-feature-metadata"
import {
  normalizeModifierCatalog,
  type ModifierCatalogEntry,
} from "@/lib/compendium/modifier-catalog"
import { resolveLinkedModifiers } from "@/lib/compendium/linked-modifiers"
import {
  ELDRITCH_INVOCATIONS_CATALOG_ID,
  METAMAGIC_OPTIONS_CATALOG_ID,
} from "@/lib/compendium/system-option-catalogs"
import type { CustomAbility } from "@/lib/types"

export const CATALOG_FEAT_PICK_PREFIX = "syscat:"

const CATEGORY_CATALOG_IDS: Partial<Record<FeatPickCategory, string>> = {
  Metamagic: METAMAGIC_OPTIONS_CATALOG_ID,
  "Eldritch Invocation": ELDRITCH_INVOCATIONS_CATALOG_ID,
}

export function catalogAbilityIdForFeatCategories(categories: string[]): string | null {
  for (const category of categories) {
    const id = CATEGORY_CATALOG_IDS[category as FeatPickCategory]
    if (id) return id
  }
  return null
}

export function slotUsesCatalogFeatPicks(categories: string[]): boolean {
  return catalogAbilityIdForFeatCategories(categories) != null
}

export type CatalogFeatPickOption = {
  pickId: string
  name: string
  summary?: string
  description?: string
  catalogEntryId: string
  catalogAbilityId: string
}

export function buildCatalogFeatPickId(catalogAbilityId: string, entryId: string): string {
  return `${CATALOG_FEAT_PICK_PREFIX}${catalogAbilityId}:${entryId}`
}

export function parseCatalogFeatPickId(
  pickId: string,
): { catalogAbilityId: string; entryId: string } | null {
  if (!pickId.startsWith(CATALOG_FEAT_PICK_PREFIX)) return null
  const rest = pickId.slice(CATALOG_FEAT_PICK_PREFIX.length)
  const colon = rest.indexOf(":")
  if (colon < 0) return null
  return {
    catalogAbilityId: rest.slice(0, colon),
    entryId: rest.slice(colon + 1),
  }
}

export function isCatalogFeatPickId(pickId: string): boolean {
  return parseCatalogFeatPickId(pickId) != null
}

function catalogEntriesForAbility(
  customAbilities: CustomAbility[],
  catalogAbilityId: string,
): ModifierCatalogEntry[] {
  const ability = customAbilities.find((row) => row.id === catalogAbilityId)
  if (!ability) return []
  return normalizeModifierCatalog(
    (ability as unknown as Record<string, unknown>).modifier_catalog,
  )
}

export function catalogFeatPickOptions(
  categories: string[],
  customAbilities: CustomAbility[],
): CatalogFeatPickOption[] {
  const catalogAbilityId = catalogAbilityIdForFeatCategories(categories)
  if (!catalogAbilityId) return []

  return catalogEntriesForAbility(customAbilities, catalogAbilityId).map((entry) => ({
    pickId: buildCatalogFeatPickId(catalogAbilityId, entry.id),
    name: entry.name,
    summary: entry.summary ?? undefined,
    description: entry.description ?? undefined,
    catalogEntryId: entry.id,
    catalogAbilityId,
  }))
}

export function resolveCatalogFeatPickLabel(
  pickId: string,
  customAbilities: CustomAbility[],
): string | null {
  const parsed = parseCatalogFeatPickId(pickId)
  if (!parsed) return null
  const entry = catalogEntriesForAbility(customAbilities, parsed.catalogAbilityId).find(
    (row) => row.id === parsed.entryId,
  )
  return entry?.name ?? null
}

export function resolveCatalogFeatPickCharacteristics(
  pickId: string,
  customAbilities: CustomAbility[],
  catalog: ModifierCatalogEntry[],
): CharacteristicModifier[] {
  const parsed = parseCatalogFeatPickId(pickId)
  if (!parsed) return []

  const entry = catalogEntriesForAbility(customAbilities, parsed.catalogAbilityId).find(
    (row) => row.id === parsed.entryId,
  )
  if (!entry) return []

  const fromEntry = entry.characteristics?.length
    ? normalizeCharacteristics(
        resolveLinkedModifiers(
          [
            {
              instanceId: entry.id,
              catalogRefId: entry.id,
              characteristics: entry.characteristics,
            },
          ],
          catalog,
        ).characteristics,
        null,
      )
    : []
  if (fromEntry.length) return fromEntry

  return [
    {
      id: `mod_catalog_${entry.id}`,
      type: "catalog_option",
      catalogAbilityId: parsed.catalogAbilityId,
      catalogEntryId: entry.id,
      label: entry.name,
    },
  ]
}
